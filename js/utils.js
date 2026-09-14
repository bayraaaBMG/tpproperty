
  // ===== UTILITIES =====
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  // ===== CANONICAL CATEGORY TAXONOMY (single source of truth) =====
  // One contract for every category selector in the app: the home dropdown (#hSearchType),
  // the shortcut row, the home category tiles, the Listings-page filter pills, saved
  // searches, filter tags, counts, and the listing create/edit flow.
  //
  // `bucket` is the value stored on the Firestore document's `category` field (and mirrored
  // to the local `l.cat`) — the SAME five broad buckets existing data and firestore.rules
  // already use, so nothing needs migrating. `propertyType` (when present) is the specific
  // subtype, stored on the document's `propertyType` field. A category with a `propertyType`
  // is a specialised view of its bucket (e.g. cottage is a kind of house); one without is
  // the broad bucket itself, shown MINUS whatever subtypes appear as their own category.
  const CATEGORY_CONFIG = {
    all:             { label: 'Ангилал',            bucket: 'all' },
    apartment:       { label: 'Орон сууц',          bucket: 'apartment' },
    rent:            { label: 'Түрээс',             bucket: 'rent' },
    'new-apartment': { label: 'Шинэ орон сууц',     bucket: 'apartment', propertyType: 'new-apartment' },
    office:          { label: 'Оффис',              bucket: 'office' },
    house:           { label: 'Хашаа байшин',       bucket: 'house' },
    land:            { label: 'Газар',              bucket: 'land' },
    cottage:         { label: 'Зуслан',             bucket: 'house',  propertyType: 'cottage' },
    garage:          { label: 'Гараж',              bucket: 'house',  propertyType: 'garage' },
    commercial:      { label: 'Худалдаа үйлчилгээ', bucket: 'office', propertyType: 'commercial' }
  };
  // Canonical order used everywhere (a component that excludes `all` just skips the first).
  const CATEGORY_ORDER = ['all', 'apartment', 'rent', 'new-apartment', 'office', 'house', 'land', 'cottage', 'garage', 'commercial'];

  // Per bucket, the subtypes that are surfaced as their own top-level category. A broad
  // bucket filter (apartment/house/office) excludes these so a listing is only ever counted
  // once. Derived from CATEGORY_CONFIG so adding a subtype above needs no change here.
  const CATEGORY_SUBTYPES_BY_BUCKET = (() => {
    const m = {};
    Object.keys(CATEGORY_CONFIG).forEach(key => {
      const cfg = CATEGORY_CONFIG[key];
      if (cfg.propertyType) (m[cfg.bucket] = m[cfg.bucket] || []).push(cfg.propertyType);
    });
    return m;
  })();

  // Display label for any canonical key OR a raw bucket value (l.cat is always a bucket, and
  // buckets are themselves canonical keys). Falls back to the raw value so a legacy/unknown
  // slug never crashes a render — though the UI should never surface one.
  function catLabel(key) {
    return (CATEGORY_CONFIG[key] && CATEGORY_CONFIG[key].label) || key || '';
  }
  function catBucket(key) {
    return (CATEGORY_CONFIG[key] && CATEGORY_CONFIG[key].bucket) || key;
  }
  function catSubtype(key) {
    return (CATEGORY_CONFIG[key] && CATEGORY_CONFIG[key].propertyType) || null;
  }

  // The one category predicate. Every category filter/count in the app goes through this so
  // the dropdown, shortcut, tile, pill, saved search and result set can never disagree.
  //
  // Backward compatibility: existing/demo listings store propertyType == category (the broad
  // bucket) or omit it entirely — data.js maps `propertyType: d.propertyType || d.category`.
  // Such a listing's propertyType is never one of the specialised subtype strings, so:
  //   - it matches its broad bucket (apartment/house/office/land/rent) and stays visible;
  //   - it never matches a specialised subtype filter (new-apartment/cottage/garage/
  //     commercial), which only match listings explicitly created as those types.
  // No listing disappears, and no database migration is required.
  function listingMatchesCategory(l, key) {
    if (!key || key === 'all') return true;
    const cfg = CATEGORY_CONFIG[key];
    if (!cfg) return l.cat === key;              // unknown key: legacy exact-match fallback
    if (l.cat !== cfg.bucket) return false;
    if (cfg.propertyType) return l.propertyType === cfg.propertyType;
    const separated = CATEGORY_SUBTYPES_BY_BUCKET[cfg.bucket] || [];
    return !separated.includes(l.propertyType);   // broad bucket minus its own-category subtypes
  }
  // Shared "no results" empty state for buyer-facing browse grids (Listings/Rent/
  // New-dev) — previously each page hand-rolled its own icon/title sizing (64px/22px vs
  // 48px/18px vs 40px/18px); one shared look now, matching Listings' original (largest/
  // most prominent) sizing since it's the flagship browse page. `icon` is a literal SVG
  // path/shape string (developer-authored per call site, not user data — not escaped).
  function buyerEmptyState(opts) {
    const { icon, title, sub, resetLabel, resetOnclick } = opts;
    return `
      <div style="grid-column:1/-1;text-align:center;padding:72px 24px;color:var(--ink-3);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:18px;opacity:0.3;">${icon}</svg>
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px;">${esc(title)}</div>
        <div style="font-size:14px;max-width:340px;margin:0 auto 24px;">${esc(sub)}</div>
        ${resetLabel ? `<button class="btn btn-blue" onclick="${resetOnclick}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          ${esc(resetLabel)}
        </button>` : ''}
      </div>
    `;
  }
  const BUYER_EMPTY_ICON_SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>';
  const BUYER_EMPTY_ICON_BUILDING = '<path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7"/>';
  // Shared skeleton placeholders (see css/main.css's "LOADING: skeleton + spinner" block) —
  // one card shape (image + 3 text lines, matching a listing/project card) and one row
  // shape (avatar + 2 text lines, matching a list row), so call sites don't hand-roll markup.
  function skeletonCards(n) {
    return Array.from({ length: n }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line w-40"></div>
          <div class="skeleton skeleton-line w-80"></div>
          <div class="skeleton skeleton-line w-60"></div>
        </div>
      </div>
    `).join('');
  }
  function skeletonRows(n) {
    return Array.from({ length: n }, () => `
      <div class="skeleton-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton-line w-60"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      </div>
    `).join('');
  }

  // Escape closes whichever overlay/sheet is actually open — every one of these already
  // closes on backdrop click, this just adds the keyboard equivalent. Was previously only
  // wired for #modal (and unconditionally, from js/calc.js of all places); consolidated
  // here since it's not calculator-specific, and extended to the overlays that had no
  // Escape handling at all (#authModal, the 3 mobile filter sheets, the admin sidebar
  // drawer). Checked in a fixed order so only the top-most open thing closes.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modal')?.classList.contains('open')) { closeModal(); return; }
    if (document.getElementById('authModal')?.classList.contains('open')) { closeAuth(); return; }
    if (document.getElementById('listingsSidebar')?.classList.contains('open')) { closeMobileFilterSheet(); return; }
    if (document.getElementById('rentSidebar')?.classList.contains('open')) { closeRentFilterSheet(); return; }
    if (document.getElementById('newdevSidebar')?.classList.contains('open')) { closeNewdevFilterSheet(); return; }
    if (document.getElementById('adminSidebar')?.classList.contains('open')) { closeAdminSidebar(); return; }
  });
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

  // Days since a listing was last refreshed, using the fallback chain
  // lastRefreshedAt -> createdAt -> updatedAt (whichever is populated first) so legacy
  // listings created before this feature existed still get a sensible age instead of null.
  // Returns null only when none of the three fields are present at all.
  function listingFreshnessDays(l) {
    const ms = (l && (l._lastRefreshedAtMs || l._createdAtMs || l._updatedAtMs)) || 0;
    if (!ms) return null;
    return Math.floor((Date.now() - ms) / 86400000);
  }
  // Freshness tier for the "Шинэчлэх" (refresh) system. Purely a display classification —
  // never auto-deletes/archives/deactivates a listing at any threshold; Admin decides.
  // `color` is the single source of truth for freshness tier coloring — read this instead
  // of hand-typing a parallel { fresh: 'var(--accent)', ... } map at each call site.
  function listingFreshnessStatus(days) {
    if (days == null) return null;
    if (days < 14) return { key: 'fresh', label: 'Идэвхтэй', badgeText: (14 - days) + ' хоногийн дараа шинэчилнэ', color: 'var(--accent)' };
    if (days < 30) return { key: 'needs-refresh', label: 'Шинэчлэх шаардлагатай', badgeText: days + ' хоног шинэчлээгүй', color: 'var(--warning)' };
    if (days < 45) return { key: 'stale', label: 'Удаан шинэчлээгүй', badgeText: days + ' хоног шинэчлээгүй', color: 'var(--danger)' };
    return { key: 'very-stale', label: '45+ хоног шинэчлээгүй', badgeText: days + ' хоног шинэчлээгүй', color: 'var(--danger)' };
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
    else if (diffPct <= 0.08) { verdict = 'Зах зээлийн үнэ'; color = '#272B68'; }
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
    syncMobileBottomNav(target);
    window.scrollTo(0, 0);
    // The compact admin-only chrome (see css .admin-mode rules) only ever applies while
    // guardAdminRoute() below confirms access — leaving /admin for any other page always
    // restores the normal site nav/footer immediately, not just on the next admin check.
    if (target !== 'admin') document.body.classList.remove('admin-mode');
    if (target === 'newdev' && typeof cmsApplyNewdev === 'function') cmsApplyNewdev();
    if (target === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    if (target === 'agent-crm' && typeof renderAgentCrmPage === 'function') renderAgentCrmPage();
    if (target === 'admin' && typeof guardAdminRoute === 'function' && guardAdminRoute()
        && typeof renderAdminDashboard === 'function') renderAdminDashboard();
  }

  // The mobile bottom nav has always had a styled .active state that nothing ever set, so
  // no tab was ever highlighted. Only the tabs that actually correspond to a page are
  // mapped — "Хадгалсан" opens a panel rather than navigating, so it never sticks on.
  const MBN_PAGE_MAP = {
    home: 'mbn-home',
    listings: 'mbn-listings',
    dashboard: 'mbn-me',
    'my-listings': 'mbn-me'
  };
  // The bottom nav's markup sits AFTER init.js in index.html, so the router's first
  // showPage() call runs before those buttons exist — without this re-sync the very first
  // page a visitor lands on would show no highlighted tab at all until they navigated.
  let _currentPageId = 'home';
  document.addEventListener('DOMContentLoaded', function() { syncMobileBottomNav(_currentPageId); });
  function syncMobileBottomNav(target) {
    _currentPageId = target;
    document.querySelectorAll('.mbn-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(MBN_PAGE_MAP[target] || '');
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    }
    document.querySelectorAll('.mbn-btn:not(.active)').forEach(b => b.removeAttribute('aria-current'));
  }

  function scrollToSection(id) {
    showPage(id);
  }

  function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
  }

  // ===== EXTRA LISTING METADATA (gallery + map coords) =====
  // Both maps start empty now that the demo/sample listings are gone — they used to be
  // pre-seeded with that fake data keyed by demo listing id. They're still populated at
  // runtime, keyed by listing id, for real listings: from Firestore (js/data.js,
  // js/auth.js) and from locally saved user listings.
  const listingExtras = {};

  // ===== SELLER DATA (phone, name, type per listing) =====
  const sellerData = {};

