
  // ===== UTILITIES =====
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  // Strips everything but digits and keeps the last 8 (Mongolian mobile numbers are 8
  // digits; this lets "+976 8811-2233", "88112233" and "976-88112233" all compare equal.
  function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.slice(-8);
  }

  // ===== VIDEO / 360° TOUR EMBED SAFETY =====
  // Only http(s) URLs are ever embedded, and video specifically only from YouTube/Vimeo
  // (converted to their real embed URL) — never a raw user-supplied src otherwise.
  function safeEmbedUrl(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      return u.href;
    } catch (e) { return null; }
  }
  function videoEmbedUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be') || u.hostname.includes('youtube.com')) {
        let id = null;
        if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
        else if (u.pathname === '/watch') id = u.searchParams.get('v');
        else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1];
        else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.hostname.includes('vimeo.com')) {
        const seg = u.pathname.split('/').filter(Boolean)[0];
        return seg && /^\d+$/.test(seg) ? `https://player.vimeo.com/video/${seg}` : null;
      }
      return null;
    } catch (e) { return null; }
  }
  // Great-circle distance between two lat/lng points, in kilometers (Haversine formula).
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  // Always computed live from current price/area (never a stale stored snapshot), so it
  // stays correct even for listings loaded from Firestore without a pre-computed field,
  // and updates automatically the instant price or area changes.
  function pricePerSqmText(l) {
    if (!l || l.cat === 'rent' || typeof l.price !== 'number' || !l.area) return '';
    const perSqm = (l.price * 1000000) / l.area;
    if (!isFinite(perSqm) || perSqm <= 0) return '';
    return fmt(perSqm) + ' ₮/м²';
  }
  function fmtPrice(p) {
    if (p >= 1000) return (p/1000).toFixed(1) + ' тэрбум ₮';
    return p + ' сая ₮';
  }

  // Real "posted X ago" for a listing card. _createdAtMs is a genuine Firestore
  // createdAt timestamp when present (0 otherwise). _bumpedAt is only trusted as a real
  // timestamp above REAL_MS_THRESHOLD — below that it's just the listing's own small
  // numeric id (the loaders' `d.bumpedAt || numId` fallback), not a real date. Demo
  // listings never carry either field, so this returns '' for them rather than a
  // guessed date — the caller omits the line entirely when it gets ''.
  function listingTimeAgo(l) {
    const REAL_MS_THRESHOLD = 1000000000000; // ~Sept 2001; rules out id-sized fallback values
    const ms = (l._bumpedAt > REAL_MS_THRESHOLD) ? l._bumpedAt : (l._createdAtMs || 0);
    if (!ms) return '';
    const diffMin = Math.floor((Date.now() - ms) / 60000);
    if (diffMin < 1) return 'Дөнгөж сая';
    if (diffMin < 60) return diffMin + ' минутын өмнө';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + ' цагийн өмнө';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Өчигдөр';
    if (diffDay < 30) return diffDay + ' хоногийн өмнө';
    return new Date(ms).toLocaleDateString('mn-MN');
  }

  // Same relative-time ladder as listingTimeAgo() above, but for any raw timestamp (a
  // Firestore Timestamp, a ms number, or a Date) rather than a listing object specifically —
  // used for "Сүүлд идэвхтэй байсан" (users/{uid}.lastActiveAt) in the admin Agents section.
  function fmtRelativeTime(ts) {
    const ms = ts?.toMillis?.() ?? (ts instanceof Date ? ts.getTime() : (typeof ts === 'number' ? ts : 0));
    if (!ms) return '—';
    const diffMin = Math.floor((Date.now() - ms) / 60000);
    if (diffMin < 1) return 'Дөнгөж сая';
    if (diffMin < 60) return diffMin + ' минутын өмнө';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + ' цагийн өмнө';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Өчигдөр';
    if (diffDay < 30) return diffDay + ' хоногийн өмнө';
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return diffMonth + ' сарын өмнө';
    return new Date(ms).toLocaleDateString('mn-MN');
  }

  // ===== AGENT PERFORMANCE (shared by js/dashboard.js's own-performance view and
  // js/admin.js's per-agent CRM row/detail — single source of truth for what counts as
  // "active"/"this month"/"most viewed" so the two views can never quietly disagree). =====
  // Takes an array of listing-like objects already scoped to one owner — each needs at
  // least { status, viewCount, createdAtMs, title, img, id } — and never touches Firestore
  // or the DOM itself, so it works equally well against the client's live `listings` array
  // (dashboard) or plain objects built from a fresh Firestore snapshot (admin).
  function computeAgentStats(ownerListings) {
    const list = ownerListings || [];
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();
    const stats = { total: list.length, active: 0, pending: 0, sold: 0, rented: 0, rejected: 0, expired: 0, thisMonthNew: 0, totalViews: 0, mostViewed: null };
    list.forEach(l => {
      const st = l.status || 'active';
      if (stats[st] !== undefined) stats[st]++;
      const views = l.viewCount || 0;
      stats.totalViews += views;
      if ((l.createdAtMs || 0) >= monthStartMs) stats.thisMonthNew++;
      if (!stats.mostViewed || views > (stats.mostViewed.viewCount || 0)) stats.mostViewed = l;
    });
    if (stats.mostViewed && !(stats.mostViewed.viewCount > 0)) stats.mostViewed = null;
    return stats;
  }

  // A DISTRICT_MARKET_AVG (сая ₮/м² by district) lookup used to live here — invented
  // numbers with no real source, used by both Property Score and the add-listing price
  // suggestion. Removed. Both features now rely solely on computeValuation()'s real
  // comparable-sales analysis below, and openly report "insufficient data" instead of
  // falling back to a guessed average when there aren't enough real comparables yet.

  // ===== PROPERTY VALUATION (real comparable-sales analysis, not a hardcoded lookup) =====
  // This used to just read l.tag.type — which every user-submitted listing sets to 'new'
  // and never 'below'/'above', so the "verdict" was silently meaningless for every real
  // listing on the platform and only ever worked for hand-authored demo data. It now
  // finds actual comparable listings from the live `listings` array and computes a real
  // median ₮/м², narrowing the comparison as far as it can (same хотхон, then district +
  // similar size, then district, then city-wide) and openly reporting how many
  // comparables it found and how that narrowing affected confidence. If there simply
  // isn't enough real data to compare against, it says so instead of guessing.
  function computeValuation(l) {
    if (!l || l.cat === 'rent' || typeof l.price !== 'number' || !l.area) {
      return { available: false, reason: 'not-applicable' };
    }
    const subjectPerSqm = (l.price * 1000000) / l.area;

    const pool = (typeof listings !== 'undefined' ? listings : [])
      .filter(x => x.id !== l.id && x.cat === l.cat && !x._inactive && x.cat !== 'rent'
        && typeof x.price === 'number' && x.area)
      .map(x => ({ l: x, perSqm: (x.price * 1000000) / x.area }))
      .filter(x => isFinite(x.perSqm) && x.perSqm > 0);

    function median(arr) {
      const vals = arr.map(a => a.perSqm).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    }

    let tier, comps;
    if (l.complex) {
      comps = pool.filter(a => a.l.district === l.district && a.l.complex === l.complex);
      tier = 'complex';
    }
    if (!comps || comps.length < 3) {
      comps = pool.filter(a => a.l.district === l.district && Math.abs(a.l.area - l.area) / l.area <= 0.3);
      tier = 'district-similar';
    }
    if (comps.length < 3) {
      comps = pool.filter(a => a.l.district === l.district);
      tier = 'district';
    }
    if (comps.length < 3) {
      comps = pool;
      tier = 'city';
    }

    if (comps.length < 2) {
      return { available: false, reason: 'insufficient-data', sampleSize: comps.length };
    }

    const marketPerSqm = median(comps);
    const diffPct = (subjectPerSqm - marketPerSqm) / marketPerSqm;
    let verdict, color;
    if (diffPct <= -0.08) { verdict = 'Сонирхолтой санал'; color = '#009878'; }
    else if (diffPct <= 0.08) { verdict = 'Зах зээлийн үнэ'; color = '#1E5BFF'; }
    else { verdict = 'Зах зээлээс дээгүүр'; color = '#FF4757'; }

    let confidence;
    if ((tier === 'complex' && comps.length >= 3) || (tier !== 'city' && comps.length >= 8)) confidence = 'high';
    else if (comps.length >= 5) confidence = 'medium';
    else confidence = 'low';

    const basisText = {
      complex: `тухайн хотхон дахь ${comps.length} зартай`,
      'district-similar': `дүүргийн ижил хэмжээний ${comps.length} зартай`,
      district: `дүүргийн ${comps.length} зартай`,
      city: `хотын хэмжээний ${comps.length} зартай (дүүрэгт хангалттай харьцуулах зар олдсонгүй)`
    }[tier];

    const compPrices = comps.map(a => a.l.price).filter(p => typeof p === 'number').sort((a, b) => a - b);

    return {
      available: true, verdict, color, confidence, tier, basisText,
      sampleSize: comps.length, subjectPerSqm, marketPerSqm, diffPct,
      compsPriceMin: compPrices[0], compsPriceMax: compPrices[compPrices.length - 1]
    };
  }

  // Thin wrapper kept for callers (compare table) that only need a verdict + color and
  // don't need the full comparable breakdown; falls back to a neutral "not enough data"
  // state instead of fabricating a verdict when computeValuation() can't find comparables.
  function aiVerdictFor(l) {
    const v = computeValuation(l);
    if (!v.available) return { verdict: 'Мэдээлэл хүрэлцэхгүй', color: 'var(--ink-3)' };
    return { verdict: v.verdict, color: v.color };
  }

  // A transparent 0-100 composite score computed purely from the listing's own data —
  // not a machine-learned model, just a documented rule-based blend of price fairness,
  // verification/trust signals, feature completeness, and photo coverage.
  function propertyScore(l) {
    let score = 50;
    // Price-fairness component only applies when there are enough real comparable
    // listings to judge against (computeValuation). No comparables yet → this component
    // is simply skipped rather than guessed from an invented district average; the score
    // still reflects the other real, verifiable criteria below.
    const val = computeValuation(l);
    const diffPct = val.available ? val.diffPct : null;
    if (diffPct != null) {
      if (diffPct <= -0.05) score += 20;
      else if (diffPct <= 0.05) score += 10;
      else if (diffPct <= 0.15) score += 0;
      else score -= 10;
    }
    if (l.sellerVerified) score += 8;
    // Was badges.includes('verified') — legacy metadata some demo listings still carry
    // with no real verification behind it. listingVerified (real admin approval, set in
    // admin.js) is the other real verification signal, independent of sellerVerified.
    if (l.listingVerified) score += 7;
    const feats = ['parking', 'elevator', 'balcony', 'furnished', 'loan'];
    const haveFeats = feats.filter(f => Array.isArray(l.features) && l.features.includes(f)).length;
    score += haveFeats * 4;
    const photoCount = (l.images && l.images.length) || (l._gallery && l._gallery.length) || (l.img ? 1 : 0);
    if (photoCount >= 5) score += 10; else if (photoCount >= 2) score += 5;
    const infoFields = [l.buildingType, l.heating, l.insulation, l.condition];
    score += infoFields.filter(Boolean).length * 2.5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Generic horizontal-swipe detector, shared by the in-page listing gallery and the
  // fullscreen gallery modal — a plain left/right threshold, not a full drag-tracking
  // gesture library, since both just need "swiped left" -> next / "swiped right" -> prev.
  let _swipeStartX = null;
  function swipeStart(e) { _swipeStartX = e.changedTouches[0].clientX; }
  function swipeEnd(e, prevFn, nextFn) {
    if (_swipeStartX == null) return;
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    _swipeStartX = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prevFn(); else nextFn();
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type === 'success' ? ' success' : '');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ===== PAGE ROUTER =====
  function showPage(id) {
    const target = id || 'home';
    document.querySelectorAll('section').forEach(s => s.classList.remove('page-active'));
    if (target === 'home') {
      ['home', 'banks', 'home-portal', 'features'].forEach(function(sid) {
        const el = document.getElementById(sid);
        if (el) el.classList.add('page-active');
      });
      if (history.pushState) history.pushState(null, '', location.pathname);
    } else {
      const el = document.getElementById(target);
      if (el) {
        el.classList.add('page-active');
        if (history.pushState) history.pushState(null, '', '#' + target);
      }
    }
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-links a[onclick*="'${target}'"]`);
    if (activeLink) activeLink.classList.add('active');
    window.scrollTo(0, 0);
    // The compact admin-only chrome (see css .admin-mode rules) only ever applies while
    // guardAdminRoute() below confirms access — leaving /admin for any other page always
    // restores the normal site nav/footer immediately, not just on the next admin check.
    if (target !== 'admin') document.body.classList.remove('admin-mode');
    if (target === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    if (target === 'admin' && typeof guardAdminRoute === 'function' && guardAdminRoute()
        && typeof renderAdminDashboard === 'function') renderAdminDashboard();
  }

  function scrollToSection(id) {
    showPage(id);
  }

  function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
  }

  // ===== EXTRA LISTING METADATA (gallery + map coords) =====
  const listingExtras = {
    1: { coords: { x: 62, y: 70 }, gallery: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80', 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=900&q=80', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=80', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80'] },
    2: { coords: { x: 48, y: 45 }, gallery: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=900&q=80', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=900&q=80'] },
    3: { coords: { x: 70, y: 80 }, gallery: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80', 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&q=80', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&q=80'] },
    4: { coords: { x: 40, y: 35 }, gallery: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80'] },
    5: { coords: { x: 50, y: 40 }, gallery: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80', 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=900&q=80'] },
    6: { coords: { x: 85, y: 55 }, gallery: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=80', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&q=80'] }
  };

  // ===== SELLER DATA (phone, name, type per listing) =====
  const sellerData = {
    1:  { phone: '9911-2233', name: 'Бат-Эрдэнэ Г.', type: 'Хувь хүн' },
    2:  { phone: '8822-3344', name: 'Сарнай Д.', type: 'Агент' },
    3:  { phone: '9933-4455', name: 'Болд О.', type: 'Хувь хүн' },
    4:  { phone: '8844-5566', name: 'Nominchimeg Б.', type: 'Агент' },
    5:  { phone: '9955-6677', name: 'Гантулга Н.', type: 'Агент' },
    6:  { phone: '8866-7788', name: 'Цэгмид Л.', type: 'Хувь хүн' },
    7:  { phone: '9977-8899', name: 'Өлзий Р.', type: 'Хувь хүн' },
    8:  { phone: '8888-9900', name: 'Мөнх-Эрдэнэ Б.', type: 'Агент' },
    9:  { phone: '9900-1122', name: 'Энхжин С.', type: 'Хувь хүн' },
    10: { phone: '8811-2244', name: 'Дэлгэрмаа Ч.', type: 'Агент' },
    11: { phone: '9922-3355', name: 'Анхбаяр Г.', type: 'Хувь хүн' },
    12: { phone: '8833-4466', name: 'Баярсайхан Д.', type: 'Агент' },
    13: { phone: '9944-5577', name: 'Буяннэмэх О.', type: 'Хувь хүн' },
    14: { phone: '8855-6688', name: 'Солонго Б.', type: 'Агент' },
    15: { phone: '9966-7799', name: 'Батцэцэг Л.', type: 'Хувь хүн' },
    16: { phone: '8877-8800', name: 'Ариунаа Н.', type: 'Агент' },
    17: { phone: '9988-9911', name: 'Зандан Р.', type: 'Хувь хүн' },
    18: { phone: '8899-0022', name: 'Мөнхтуяа С.', type: 'Агент' },
    19: { phone: '9900-1133', name: 'Отгонбаяр Ч.', type: 'Хувь хүн' },
    20: { phone: '8811-3344', name: 'Дорж-Одсүрэн Г.', type: 'Агент' },
    21: { phone: '9922-4455', name: 'Энхтуяа Б.', type: 'Хувь хүн' },
    22: { phone: '8833-5566', name: 'Нарантуяа Д.', type: 'Агент' },
    23: { phone: '9944-6677', name: 'Батмөнх О.', type: 'Хувь хүн' },
    24: { phone: '8855-7788', name: 'Гэрэлмаа Н.', type: 'Агент' },
    25: { phone: '9966-8899', name: 'Тэгшбаяр Л.', type: 'Хувь хүн' },
    26: { phone: '8877-9900', name: 'Нандинцэцэг Р.', type: 'Агент' },
    27: { phone: '9988-0011', name: 'Баатар Б.', type: 'Хувь хүн' },
    28: { phone: '8800-1122', name: 'Оюунаа С.', type: 'Агент' },
    29: { phone: '9911-2233', name: 'Лхагва Ч.', type: 'Хувь хүн' },
    30: { phone: '8822-3355', name: 'Мөнхбат Г.', type: 'Агент' },
    31: { phone: '9933-4466', name: 'Энхбат Д.', type: 'Хувь хүн' },
    32: { phone: '8844-5577', name: 'Цэцэгмаа О.', type: 'Агент' },
    33: { phone: '9955-6688', name: 'Ганбат Н.', type: 'Хувь хүн' },
    34: { phone: '8866-7799', name: 'Ундрах Б.', type: 'Агент' },
    35: { phone: '9977-8800', name: 'Сэрээнэнэ Л.', type: 'Хувь хүн' },
    36: { phone: '8888-9911', name: 'Болормаа Р.', type: 'Агент' },
    37: { phone: '9900-0022', name: 'Дагиймаа С.', type: 'Хувь хүн' },
    38: { phone: '8811-1133', name: 'Мэдэгмаа Ч.', type: 'Агент' },
    39: { phone: '9922-2244', name: 'Пунцагдулам Г.', type: 'Хувь хүн' },
    40: { phone: '8833-3355', name: 'Отгонсүрэн Д.', type: 'Агент' }
  };

