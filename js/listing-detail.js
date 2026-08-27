  // ===== MODAL: LISTING DETAIL =====
  // District display names only — no growth-rate/trend data here. An earlier version of
  // this file hardcoded a per-district "yearly growth %" (and used it to synthesize a fake
  // 6-year price-history chart plus 5/10/20-year return projections) with no real source
  // behind any of it. Removed; see the neutral price-change disclaimer below instead.
  const districtNames = {
    'khan-uul': 'Хан-Уул', 'sukhbaatar': 'Сүхбаатар', 'chingeltei': 'Чингэлтэй',
    'bayanzurkh': 'Баянзүрх', 'bayangol': 'Баянгол', 'songinokhairkhan': 'СХД',
    'nalaikh': 'Налайх'
  };

  // ===== SPEC GRID — every row maps to a real field already on the listing; a field
  // that's empty/unset for this particular listing is simply omitted, never filled with
  // a placeholder or guessed value. =====
  function ldSpecItems(l) {
    const isLand = l.propertyType === 'land';
    const floorParts = String(l.floor || '').split('/');
    const floorNum = floorParts[0];
    const totalFloors = floorParts[1];
    const items = [];
    if (l.area) items.push(['Талбай', l.area + ' м²']);
    if (!isLand && typeof l.rooms === 'number') items.push(['Өрөө', l.rooms]);
    if (isLand && typeof l.rooms === 'string' && l.rooms) items.push(['Хэмжээ', l.rooms]);
    if (floorNum && floorNum !== '?' && floorNum !== 'Эзэмшил') items.push(['Давхар', floorNum]);
    if (totalFloors && totalFloors !== '?') items.push(['Нийт давхар', totalFloors]);
    if (typeof l.year === 'number') items.push(['Ашиглалтад орсон он', l.year]);
    if (l.buildingType) items.push(['Барилгын төрөл', l.buildingType]);
    if (l.balcony) items.push(['Тагт', l.balcony]);
    if (l.windowDirection) items.push(['Цонхны чиглэл', l.windowDirection]);
    if (Array.isArray(l.features) && l.features.includes('garage')) items.push(['Гараж', 'Тийм']);
    if (l.ownership) items.push(['Өмчлөл', l.ownership]);
    const status = l.condition || l.usageType; // apartment "Засвар" vs office "Ашиглалтын төлөв" — same concept in the spec, different source field
    if (status) items.push(['Төлөв', status]);
    return items;
  }

  // ===== Building/professional + legal fields not already covered by ldSpecItems above —
  // merged into the same compact spec table (unegui.mn-style dense 2-column layout)
  // instead of their own separate card sections. Same real-data-only rule: a field with
  // no value is omitted, never shown with a "—" placeholder (the old separate
  // "Барилгын мэргэжлийн мэдээлэл" section used to always render every row regardless).
  // A 3rd array element ('ok'/'warn') marks the two legal fields that carry a real status
  // color, exactly the same logic the old .legal-item.ok/.warn classes used. =====
  function ldExtraSpecRows(l) {
    const rows = [];
    if (l.buildingName) rows.push(['Барилгын нэр', l.buildingName]);
    if (l.complex) rows.push(['Хотхон', l.complex]);
    if (l.insulation) rows.push(['Дулаалга', l.insulation]);
    if (l.heating) rows.push(['Халаалт', l.heating]);
    if (l.parking) rows.push(['Паркинг', l.parking]);
    if (l.elevator) rows.push(['Лифт', l.elevator]);
    if (l.basement) rows.push(['Зоорь', l.basement]);
    if (l.furniture) rows.push(['Тавилга', l.furniture]);
    if (l.hoaFee) rows.push(['СӨХ-ийн төлбөр', fmt(l.hoaFee) + ' ₮/сар']);
    if (l.deposit) rows.push(['Барьцаа/Урьдчилгаа', l.deposit + ' сая ₮']);
    if (l.minTerm) rows.push(['Хамгийн бага хугацаа', l.minTerm]);
    if (l.utilityCost) rows.push(['Нийтийн зардал', l.utilityCost]);
    // l.ownership is already covered by ldSpecItems above whenever it's set — not repeated here.
    if (l.cadastre) rows.push(['Кадастр', l.cadastre]);
    if (l.collateral) rows.push(['Барьцааны байдал', l.collateral, l.collateral.includes('Барьцаагүй') ? 'ok' : 'warn']);
    if (l.taxDebt) rows.push(['Татвар', l.taxDebt, l.taxDebt.includes('өргүй') ? 'ok' : 'warn']);
    return rows;
  }

  // ===== DESCRIPTION — plain user text, expand/collapse past a length threshold. Never
  // rendered at all when the listing has none (see the doSubmitListing fix that made this
  // field actually get saved — older listings created before that fix have none). =====
  function ldDescriptionHtml(l) {
    if (!l.description) return '';
    const long = l.description.length > 320;
    return `
      <div class="modal-section ld-desc">
        <h4>Тайлбар</h4>
        <div class="ld-desc-text">${esc(l.description).replace(/\n/g, '<br>')}</div>
        ${long ? `<button type="button" class="ld-desc-toggle" onclick="ldToggleDescription(this)">Дэлгэрэнгүй</button>` : ''}
      </div>
    `;
  }
  function ldToggleDescription(btn) {
    const box = btn.previousElementSibling;
    const expanded = box.classList.toggle('expanded');
    btn.textContent = expanded ? 'Хураах' : 'Дэлгэрэнгүй';
  }

  // ===== BREADCRUMB =====
  function ldBreadcrumbHtml(l, districtLabel) {
    const catLabels = { apartment: 'Орон сууц', house: 'Хаус', land: 'Газар', office: 'Оффис', rent: 'Түрээс' };
    return `
      <div class="ld-breadcrumb">
        <a onclick="closeModal(); showPage('home')">Нүүр</a>
        <span>/</span>
        <a onclick="closeModal(); showPage('listings')">Зарууд</a>
        ${catLabels[l.cat] ? `<span>/</span><a onclick="closeModal(); showPage('listings')">${esc(catLabels[l.cat])}</a>` : ''}
        ${districtLabel !== 'Дүүрэг' ? `<span>/</span><span>${esc(districtLabel)}</span>` : ''}
      </div>
    `;
  }

  // ===== SIMILAR LISTINGS — ranked same district, then closest rooms, then closest
  // area, then closest price (each tier weighted well below the one before it, so
  // district always dominates and the others only break ties within it). =====
  function ldFindSimilar(l, max) {
    const pool = listings.filter(x => x.id !== l.id && x.cat === l.cat && !x._inactive);
    return pool.map(x => {
      let score = 0;
      if (x.district === l.district) score += 10000;
      if (typeof x.rooms === 'number' && typeof l.rooms === 'number') {
        score += Math.max(0, 300 - Math.abs(x.rooms - l.rooms) * 80);
      }
      if (x.area && l.area) score += Math.max(0, 150 - (Math.abs(x.area - l.area) / l.area) * 150);
      if (x.price && l.price) score += Math.max(0, 60 - (Math.abs(x.price - l.price) / l.price) * 60);
      return { x, score };
    }).sort((a, b) => b.score - a.score).slice(0, max).map(s => s.x);
  }
  // Similar listings reuse the exact same shared card component as the home page and
  // the Listings page browse grid (listingCardHtml(), home.js) — one card look across
  // the whole app, not a third bespoke template.

  // ===== MINI LOAN CALCULATOR — same amortization math and the same verified-only bank
  // data as the standalone /calc page (banks/SAFE_DTI, calc.js); this widget just gives an
  // immediate, listing-scoped preview. "Дэлгэрэнгүй тооцоолуур" hands the price to the
  // real calculator page for the full breakdown/early-payoff/afford-ability tools. =====
  function ldRateOptionsHtml() {
    const opts = banks.filter(b => b.verified && b.annualRateText).map(b => {
      const m = b.annualRateText.match(/(\d+(\.\d+)?)/);
      if (!m) return '';
      return `<option value="${m[1]}">${esc(b.name)} — ${esc(b.annualRateText)}</option>`;
    }).join('');
    return opts + `<option value="0">Бэлэн мөнгө (зээлгүй)</option><option value="custom">Өөрийн хүү оруулах…</option>`;
  }
  function ldCalcHtml(l) {
    if (l.cat === 'rent') return '';
    return `
      <div class="ld-calc">
        <div class="ld-calc-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          Зээлийн тооцоолуур
        </div>
        <div class="ld-calc-row">
          <label>Урьдчилгаа <span id="ldDownVal">30%</span></label>
          <input type="range" class="slider" id="ldDownSlider" min="10" max="50" value="30" oninput="ldCalcUpdate(${l.price})">
        </div>
        <div class="ld-calc-row">
          <label>Хугацаа <span id="ldTermVal">20 жил</span></label>
          <input type="range" class="slider" id="ldTermSlider" min="5" max="30" value="20" oninput="ldCalcUpdate(${l.price})">
        </div>
        <div class="ld-calc-row">
          <label>Хүү</label>
          <select id="ldRateSelect" class="form-select" onchange="ldCalcRateChange(${l.price})">${ldRateOptionsHtml()}</select>
        </div>
        <div class="ld-calc-row" id="ldCustomRateRow" style="display:none;">
          <label>Өөрийн хүү (%)</label>
          <input type="number" class="form-input" id="ldCustomRate" min="0" max="40" step="0.1" value="17.5" oninput="ldCalcUpdate(${l.price})">
        </div>
        <div class="ld-calc-out">
          <div class="ld-calc-out-label">Сарын төлбөр (ойролцоогоор)</div>
          <div class="ld-calc-out-val" id="ldMonthlyOut">—</div>
        </div>
        <div class="ld-calc-disclaimer">Энэ бол ойролцоо тооцоолол — банк тус бүрийн эцсийн хүү, шимтгэл, нөхцөл өөрчлөгдөж болно.</div>
        <button type="button" class="ld-calc-full-link" onclick="ldOpenFullCalc(${l.price})">
          Дэлгэрэнгүй тооцоолуур
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    `;
  }
  function ldCalcRateChange(price) {
    const sel = document.getElementById('ldRateSelect');
    const row = document.getElementById('ldCustomRateRow');
    if (row) row.style.display = sel.value === 'custom' ? 'block' : 'none';
    ldCalcUpdate(price);
  }
  function ldCalcUpdate(price) {
    const downSlider = document.getElementById('ldDownSlider');
    const termSlider = document.getElementById('ldTermSlider');
    const rateSelect = document.getElementById('ldRateSelect');
    if (!downSlider || !termSlider || !rateSelect) return;
    const downPct = parseInt(downSlider.value);
    const term = parseInt(termSlider.value);
    document.getElementById('ldDownVal').textContent = downPct + '%';
    document.getElementById('ldTermVal').textContent = term + ' жил';
    const rate = rateSelect.value === 'custom' ? (parseFloat(document.getElementById('ldCustomRate')?.value) || 0) : parseFloat(rateSelect.value);
    const out = document.getElementById('ldMonthlyOut');
    if (!rate) { out.textContent = 'Зээлгүй — бэлэн мөнгөөр'; return; }
    const priceWon = price * 1000000;
    const loanAmt = priceWon * (100 - downPct) / 100;
    const r = rate / 100 / 12, n = term * 12;
    const monthly = (loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    out.textContent = fmt(monthly) + ' ₮ / сар';
  }
  function ldOpenFullCalc(price) {
    closeModal();
    showPage('calc');
    setTimeout(() => {
      const slider = document.getElementById('priceSlider');
      if (!slider) return;
      slider.value = Math.max(80, Math.min(2000, Math.round(price)));
      if (typeof calculate === 'function') calculate();
      slider.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }

  // ===== TP PROPERTY MARKET INSIGHT — the same real comparable-sales analysis
  // (computeValuation, utils.js) that used to live in its own separate "AI valuation"
  // section, now leading with the concrete stat row the spec asks for (total price, ₮/м²,
  // district average, %-vs-market, comparable price range) and folding the verdict/
  // reasoning/stability checklist in underneath as the write-up. No comparable listings
  // yet -> says so plainly, same as before; never a synthesized score or stat. =====
  function ldMarketInsightHtml(l, valuation, stability) {
    const statRow = valuation.available ? `
      <div class="ld-mi-stats">
        <div class="ld-mi-stat"><div class="ld-mi-stat-label">Нийт үнэ</div><div class="ld-mi-stat-val">${fmtPrice(l.price)}</div></div>
        <div class="ld-mi-stat"><div class="ld-mi-stat-label">1м² үнэ</div><div class="ld-mi-stat-val">${pricePerSqmText(l) || '—'}</div></div>
        <div class="ld-mi-stat"><div class="ld-mi-stat-label">Бүсийн дундаж 1м²</div><div class="ld-mi-stat-val">${fmt(valuation.marketPerSqm)} ₮/м²</div></div>
        <div class="ld-mi-stat"><div class="ld-mi-stat-label">Зах зээлээс</div><div class="ld-mi-stat-val" style="color:${valuation.color};">${valuation.diffPct >= 0 ? '+' : ''}${(valuation.diffPct * 100).toFixed(0)}%</div></div>
        ${(valuation.compsPriceMin != null) ? `
        <div class="ld-mi-stat"><div class="ld-mi-stat-label">Харьцуулах заруудын үнэ</div><div class="ld-mi-stat-val">${fmtPrice(valuation.compsPriceMin)} – ${fmtPrice(valuation.compsPriceMax)}</div></div>
        ` : ''}
      </div>
    ` : '';

    let verdict, color, reasoning, confLabel, confColor, basisLine;
    if (!valuation.available) {
      verdict = 'Зах зээлийн үнэлгээ хийхэд мэдээлэл хангалтгүй'; color = 'var(--ink-3)'; confLabel = null;
      basisLine = valuation.sampleSize
        ? `Одоогоор ${valuation.sampleSize} харьцуулах зар олдсон — найдвартай тооцоолол хийхэд хамгийн багадаа 2 хэрэгтэй.`
        : 'TP Property дээр энэ төрлийн харьцуулах зар одоогоор алга.';
      reasoning = `Энэ байртай харьцуулах хангалттай зар платформ дээр олдсонгүй тул үнийг зах зээлтэй бодитоор харьцуулж чадахгүй байна. Дэлгэц дээрх тоо зохиомол биш — зөвхөн бодит харьцуулах зар байхгүй тул тооцоолол хийхгүй байна.`;
    } else {
      verdict = valuation.verdict; color = valuation.color;
      const confMap = { high: ['Өндөр итгэмжтэй', '#009878'], medium: ['Дунд итгэмжтэй', '#C77700'], low: ['Бага итгэмжтэй', '#FF4757'] };
      [confLabel, confColor] = confMap[valuation.confidence];
      basisLine = `${valuation.basisText} харьцуулав.`;
      if (valuation.verdict === 'Сонирхолтой санал') {
        reasoning = `Харьцуулсан зарын дунджаас доогуур үнэтэй. Гэхдээ <strong>тэр болгон сайн биш</strong> — барьцаа, эзэмшлийн гэрчилгээ, барилгын чанарыг заавал шалгаарай.`;
      } else if (valuation.verdict === 'Зах зээлээс дээгүүр') {
        reasoning = `Харьцуулсан зарын дунджаас дээгүүр үнэтэй. Premium байршил, чанар, онцлогоос болсон байж болзошгүй — <strong>үнэ хэлэлцэх боломжтой эсэхийг ярилц</strong>.`;
      } else {
        reasoning = `Үнэ харьцуулсан зарын дунд түвшинд. Ердийн сонголт — бусад заруудтай харьцуулж, биечлэн очиж үзэхийг зөвлөж байна.`;
      }
      if (valuation.confidence === 'low') {
        reasoning += ` <strong style="color:#C77700;">Анхаар:</strong> харьцуулах зар цөөн тул энэ дүгнэлт зөвхөн ерөнхий чиг баримжаа.`;
      }
    }

    return `
      <div class="modal-section">
        <h4>TP Property Market Insight</h4>
        <div class="ld-mi">
          ${statRow}
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap;">
            <div style="padding:6px 12px; background:${color}; color:white; border-radius:100px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;">${verdict}</div>
            ${confLabel ? `<div style="padding:6px 12px; background:${confColor}22; color:${confColor}; border-radius:100px; font-size:11px; font-weight:700;">${confLabel}</div>` : ''}
          </div>
          <div style="font-size:12.5px; color:var(--ink-3); margin-bottom:10px; font-family:'JetBrains Mono',monospace;">${basisLine}</div>
          <div style="font-size:14px; line-height:1.65; color:var(--ink-2);">${reasoning}</div>
          <div style="font-size:11px; color:var(--ink-3); margin-top:12px; font-style:italic;">* Дүрэм-суурьтай тооцоолол — TP Property дээрх бодит зарын дунджид үндэслэсэн, машин сургалт ашигладаггүй.</div>
          ${stability.length > 0 ? `
          <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--line);">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-3); margin-bottom:10px;">Шалгасан үзүүлэлтүүд</div>
            ${stability.map(s => `
              <div class="stability-item ${s.ok ? 'ok' : 'warn'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  ${s.ok ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'}
                </svg>
                <span>${s.text}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function openListing(id) {
    const l = listings.find(x => x.id === id);
    if (!l) { showToast('Зар олдсонгүй'); return; }
    // View count: bump locally right away, best-effort sync to Firestore for real listings
    l.viewCount = (l.viewCount || 0) + 1;
    if (l.firestoreId) {
      db.collection('listings').doc(l.firestoreId).update({ viewCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
    }
    const districtLabel = districtNames[l.district] || 'Дүүрэг';

    // Real comparable-sales analysis (computeValuation() — utils.js), feeding both the
    // TP Property Market Insight section below and the Property Score badge. Demo data isn't
    // synthesized here: it searches actual listings on the platform for comparables and
    // openly says "insufficient data" rather than guessing when there aren't enough.
    const valuation = computeValuation(l);
    const pScore = propertyScore(l);
    const pScoreColor = pScore >= 70 ? '#009878' : pScore >= 45 ? '#C77700' : '#FF4757';

    // Тогтвортой байдлын үнэлгээ
    const stability = [];
    if (l.collateral && l.collateral.includes('Барьцаагүй')) stability.push({ ok: true, text: 'Барьцаагүй — нэн даруй шилжүүлэх боломжтой' });
    else if (l.collateral && l.collateral.includes('барьцаатай')) stability.push({ ok: false, text: 'Барьцаатай — шилжүүлэхэд 7-30 хоног шаардлагатай' });
    if (l.taxDebt && l.taxDebt.includes('өргүй')) stability.push({ ok: true, text: 'Татварын өргүй' });
    if (l.cadastre && l.cadastre.includes('шалгасан')) stability.push({ ok: true, text: 'Кадастрын мэдээлэл шалгасан' });
    else if (l.cadastre && l.cadastre.includes('гарч буй')) stability.push({ ok: false, text: 'Кадастр албажиж гарах хүлээгдэж буй' });

    // Build inline carousel
    const extras = listingExtras[l.id];
    mcImages = (extras?.gallery?.length ? extras.gallery : [l.img]);
    mcIdx = 0;
    mcListingId = l.id;

    // Similar listings — same district, then closest rooms, then closest area, then
    // closest price (ldFindSimilar above), max 8 for a clean 3-4-per-row desktop grid.
    const similar = ldFindSimilar(l, 8);

    // Seller data from lookup table (deterministic, no Math.random). Falls back to a
    // neutral "Хувь хүн" type rather than "Агент" — an unknown seller must never default
    // to a fabricated professional credential.
    const seller = sellerData[l.id] || { phone: '', name: 'Хэрэглэгч', type: 'Хувь хүн' };
    const sellerName = seller.name;
    const sellerLetter = sellerName[0] || 'А';
    const ownerOtherListings = l.userSubmitted && l.ownerId ? listings.filter(x => x.ownerId === l.ownerId && !x._inactive) : null;
    // "Нийт X зар" used to fall back to an invented 3 + id % 12 whenever a real count
    // wasn't available (always the case for demo listings, since ownerOtherListings is
    // only ever computed for userSubmitted ones above). No real count → no number shown,
    // rather than guessing one.
    const totalListings = ownerOtherListings ? ownerOtherListings.length : null;
    // A "Хариу: 10/30 минут" response-time claim used to live here, computed as
    // l.id % 2 — not a real message-latency metric for any seller, demo or real; nothing
    // in the codebase tracks how long a seller actually takes to reply. Removed rather
    // than replaced with an unmeasured "хурдан хариулдаг"-style claim.
    // Same fake-year problem as openSellerProfile below (2020 + id%5 for demo, "today's
    // year" for real) — same fix: demo has no real membership date to show at all; real
    // sellers show the earliest real Firestore createdAt among their own listings, or
    // nothing if none of their listings happen to carry that field.
    const ownerAllListings = l.userSubmitted && l.ownerId ? listings.filter(x => x.ownerId === l.ownerId) : [l];
    const memberCreatedMsValues = ownerAllListings.map(x => x._createdAtMs || 0).filter(ms => ms > 0);
    const memberSinceYear = (!l.isDemo && memberCreatedMsValues.length)
      ? new Date(Math.min(...memberCreatedMsValues)).getFullYear() : null;
    // Verified badge requires a real, checkable fact behind it — an email-verified owner.
    // No automatic true for demo listings: "Баталгаажсан" must never be shown without an
    // actual verification having happened, example data included.
    const isVerified = !!l.sellerVerified;
    const sellerClickable = !!ownerOtherListings;

    // ===== SCAM-PROTECTION STATUS (shown on every listing, positive or not) =====
    // Owner: Firebase email-verified. Phone: this listing's contact number was proven via
    // real SMS OTP (dashboard.js). Listing: a human admin reviewed it (admin.js) — none of
    // these are fabricated "AI trust scores"; each maps to one concrete, checkable fact.
    // Demo listings have no real verification behind them, so these correctly read as
    // unverified (○) rather than defaulting to true.
    const ownerVerified = !!l.sellerVerified;
    const phoneStatusVerified = !!l.phoneVerified;
    const listingStatusVerified = !!l.listingVerified;
    const verifyPill = (on, label) => `
      <span class="verify-pill ${on ? 'on' : 'off'}" title="${on ? 'Баталгаажсан' : 'Баталгаажаагүй'}">
        ${on
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg>'}
        ${label}
      </span>
    `;

    document.getElementById('modalContent').className = 'modal listing-modal';
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <button class="modal-share-btn" id="detailFavBtn" onclick="event.stopPropagation(); toggleFavDetail(${l.id})" title="Хадгалах" style="right:104px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${favorites.includes(l.id) ? '#FF4757' : 'none'}" stroke="${favorites.includes(l.id) ? '#FF4757' : 'currentColor'}" stroke-width="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
      </button>
      <button class="modal-share-btn" onclick="shareListingModal(${l.id})" title="Хуваалцах">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>

      <div class="ld-header">
        ${ldBreadcrumbHtml(l, districtLabel)}
        ${!l.userSubmitted ? '<span class="badge demo" style="position:static;display:inline-block;margin-bottom:8px;">Жишээ зар</span>' : ''}
        <h1 class="ld-title">${esc(l.title)}</h1>
        <div class="ld-header-meta">
          ${l._createdAtMs ? `<span>Нийтэлсэн: ${new Date(l._createdAtMs).toLocaleDateString('mn-MN')}</span><span class="ld-meta-dot">·</span>` : ''}
          <span>Зарын дугаар: #${l.id}</span>
          <span class="ld-meta-dot">·</span>
          <span class="ld-meta-views"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${l.viewCount || 1} үзсэн</span>
        </div>
        <div class="modal-loc">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(l.loc)}
        </div>
        <div class="verify-status-row">
          ${verifyPill(ownerVerified, 'Эзэмшигч')}
          ${verifyPill(phoneStatusVerified, 'Утас')}
          ${verifyPill(listingStatusVerified, 'Зар')}
        </div>
        <div class="modal-price-row">
          <div>
            <div class="modal-price">${fmtPrice(l.price)}</div>
            <div style="font-size:13px; color:var(--ink-3); margin-top:4px;">${pricePerSqmText(l)}</div>
          </div>
          <div class="modal-price-tags">
            <span class="price-tag ${l.tag.type === 'normal' ? '' : l.tag.type}">${l.tag.text}</span>
            <span title="Property Score — үнийн шударга байдал, баталгаажилт, тоноглол, зурган баримтжуулалтаас тооцсон 0-100 үзүүлэлт" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px; background:${pScoreColor}18; color:${pScoreColor}; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; cursor:help;">
              Score ${pScore}/100
            </span>
          </div>
        </div>
        ${l.firestoreId && (!currentUser || l.ownerId !== currentUser.uid) ? `
        <button id="priceAlertBtn-${l.id}" class="price-alert-btn ${favorites.includes(l.id) ? 'active' : ''}" onclick="togglePriceAlert(${l.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          ${favorites.includes(l.id) ? 'Үнийн мэдэгдэл идэвхтэй' : 'Үнэ буувал мэдэгд'}
        </button>
        ` : ''}
      </div>

      <div class="ld-grid">
        <div class="ld-left">
          <!-- INLINE GALLERY CAROUSEL -->
          <div class="mc-wrap">
            <div class="mc-main" ontouchstart="swipeStart(event)" ontouchend="swipeEnd(event, mcPrev, mcNext)">
              <img id="mcMainImg" src="${esc(mcImages[0])}" alt="${esc(l.title)}" style="transition:opacity 0.22s;" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #1E5BFF)';" />
              <span class="mc-counter" id="mcCounter">1 / ${mcImages.length}</span>
              ${mcImages.length > 1 ? `
              <button class="mc-nav prev" onclick="mcPrev()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button class="mc-nav next" onclick="mcNext()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>` : ''}
              <button class="mc-expand" onclick="openGallery(${l.id})" title="Том хэмжээгээр харах">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
            </div>
            ${mcImages.length > 1 ? `
            <div class="mc-thumbs">
              ${mcImages.map((img, i) => `<img class="mc-thumb ${i===0?'active':''}" src="${esc(img)}" onclick="mcGoto(${i})" alt="" onerror="this.style.visibility='hidden';" />`).join('')}
            </div>` : ''}
          </div>

          <!-- SPEC TABLE — physical facts (ldSpecItems) + building/professional + legal
               fields (ldExtraSpecRows) merged into one dense unegui.mn-style 2-column
               table instead of 3 separate card sections. Same real-data-only rule as
               before: a field with no value is a missing row, never a "—" placeholder. -->
          <div class="ld-spec-table">
            ${[...ldSpecItems(l).map(r => [...r, '']), ...ldExtraSpecRows(l)].map(([label, value, variant]) => `
              <div class="ld-spec-row">
                <span class="ld-spec-row-label">${esc(label)}</span>
                <span class="ld-spec-row-value ${variant || ''}">${esc(String(value))}</span>
              </div>
            `).join('')}
          </div>
          ${l.legalNotes ? `
          <div class="ld-legal-notes">
            <strong>Нэмэлт тэмдэглэл:</strong> ${esc(l.legalNotes)}
          </div>
          ` : ''}

          ${l.videoUrl && videoEmbedUrl(l.videoUrl) ? `
          <div class="modal-section">
            <h4>Видео</h4>
            <div style="border-radius:10px; overflow:hidden; aspect-ratio:16/9; background:#0A1628;">
              <iframe width="100%" height="100%" src="${esc(videoEmbedUrl(l.videoUrl))}" title="Зарын видео" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
          </div>
          ` : ''}

          ${l.tourUrl && safeEmbedUrl(l.tourUrl) ? `
          <div class="modal-section">
            <h4>360° тойрох</h4>
            <div style="border-radius:10px; overflow:hidden; aspect-ratio:16/9; background:#0A1628;">
              <iframe width="100%" height="100%" src="${esc(safeEmbedUrl(l.tourUrl))}" title="360° тойрох" frameborder="0" allow="xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
          </div>
          ` : ''}

          ${l.floorPlan ? `
          <div class="modal-section">
            <h4>Планировка</h4>
            <img src="${esc(l.floorPlan)}" alt="Планировка" style="width:100%; border-radius:10px; border:1px solid var(--line); display:block;" />
          </div>
          ` : ''}

          <!-- ЗАРЫН ДЭД БАЙРШИЛ -->
          <div class="ld-sublocation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Зарын дэд байршил:</span>
            <strong>Улаанбаатар — ${esc(districtLabel)}${l.khoroo ? ' — ' + l.khoroo + '-р хороо' : ''}</strong>
          </div>

          <!-- БАЙРШИЛ -->
          <div class="modal-section ld-section-compact">
            <div style="border-radius:10px;overflow:hidden;border:1px solid var(--line);">
              ${(l.geoLat && l.geoLng) ? `
              <div id="listingDetailMap" style="width:100%;height:220px;"></div>
              ` : `
              <iframe
                width="100%" height="220" style="border:0;display:block;"
                loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=${encodeURIComponent(l.loc + ', ' + districtLabel + ' дүүрэг, Улаанбаатар, Монгол улс')}&output=embed">
              </iframe>
              `}
            </div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;display:flex;align-items:center;gap:5px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${esc(l.loc)}
            </div>
            ${(l.geoLat && l.geoLng) ? `
            <details class="ld-nearby-collapse">
              <summary>Ойр орчмын газрууд</summary>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
                ${NEARBY_CATEGORIES.map(c => `
                  <button class="btn btn-ghost" data-nearby-cat="${c.key}" style="font-size:12px;padding:7px 11px;" onclick="loadNearbyCategory(${l.id}, ${l.geoLat}, ${l.geoLng}, '${c.key}')">${c.icon} ${esc(c.label)}</button>
                `).join('')}
              </div>
              <div id="nearbyMapWrap" style="display:none;border-radius:10px;overflow:hidden;border:1px solid var(--line);margin-bottom:10px;">
                <div id="nearbyMap" style="width:100%;height:180px;"></div>
              </div>
              <div id="nearbyResults" style="font-size:12.5px;color:var(--ink-3);">Дээрх ангиллаас сонгож ойролцоох газруудыг харна уу.</div>
              <div style="font-size:10.5px;color:var(--ink-3);margin-top:6px;font-style:italic;">Эх сурвалж: OpenStreetMap.</div>
            </details>
            ` : ''}
          </div>

          ${ldDescriptionHtml(l)}

          ${similar.length > 0 ? `
          <!-- ИЖИЛ ТӨСТЭЙ ЗАРУУД -->
          <div class="modal-section">
            <h4>Ижил төстэй зарууд</h4>
            <div class="listings-grid ld-similar-grid">
              ${similar.map(x => listingCardHtml(x)).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Compact bottom sections — TP Property's own differentiators, kept real and
               data-backed, just out of the way of the main scan-path above. -->
          ${ldMarketInsightHtml(l, valuation, stability)}

          ${l.cat !== 'rent' ? `
          <div class="modal-section ld-section-compact">
            <h4>Зээлийн тооцоолол</h4>
            <div class="ld-calc-inline">${ldCalcHtml(l)}</div>
          </div>
          ` : ''}

          <!-- ШАЛГАХ ЁСТОЙ ЗҮЙЛС -->
          <div class="modal-section ld-section-compact">
            <h4>Худалдан авахаасаа өмнө шалгах зүйлс</h4>
            <ol class="check-required">
              <li>Эзэмшлийн гэрчилгээний эх хувийг харж, ХҮ-н нэртэй таарч буй эсэхийг шалгана</li>
              <li>Шилжүүлэхэд хорьдох барьцаа, татвар, мөрдөн байцаалт байгаа эсэх</li>
              <li>Дотор үзлэг хийж — хана, шал, дээвэр, шугам сүлжээний байдлыг харна</li>
              <li>Хороогоор очиж — өвлийн дулаалга, чимээ, хөршүүдийн талаар асууна</li>
              <li>Кадастрын зургаар талбайн хэмжээ нь баримтын мэдээлэлтэй таарч буй эсэх</li>
              <li>Сүүлийн 12 сарын нийтийн төлбөрийн квитанц харж бодит зардал тооцно</li>
            </ol>
          </div>

          <!-- REPORT BUTTON -->
          ${l.userSubmitted && (!currentUser || l.ownerId !== currentUser.uid) ? `
          <div class="modal-section" style="text-align:center;">
            <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);width:100%;justify-content:center;" onclick="reportListing(${l.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Зарыг мэдээлэх
            </button>
          </div>
          ` : ''}
        </div>

        <div class="ld-right">
          <div class="ld-sticky">
            <!-- AGENT CARD -->
            <div class="seller-card">
              <div class="seller-av" ${sellerClickable ? `onclick="openSellerProfile('${l.ownerId}')" style="cursor:pointer;"` : ''}>${seller.photoURL ? `<img src="${esc(seller.photoURL)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${esc(sellerLetter)}';">` : sellerLetter}</div>
              <div class="seller-info">
                <div class="seller-name" ${sellerClickable ? `onclick="openSellerProfile('${l.ownerId}')" style="cursor:pointer;"` : ''}>
                  ${esc(sellerName)}
                  ${isVerified ? '<span class="seller-verified">✓ Баталгаажсан</span>' : ''}
                </div>
                ${l.userSubmitted ? '<div class="seller-verified" style="background:var(--primary);margin-top:4px;display:inline-block;">TP Property Agent</div>' : ''}
                <div class="seller-meta">${esc(seller.type)}</div>
                ${seller.email ? `<a class="seller-meta" href="mailto:${esc(seller.email)}" style="display:block;color:var(--primary);text-decoration:none;">${esc(seller.email)}</a>` : ''}
                <div class="seller-stats">
                  ${totalListings != null ? `<span ${sellerClickable ? `onclick="openSellerProfile('${l.ownerId}')" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px;"` : ''}><b>${totalListings} зар</b></span>` : ''}
                  ${memberSinceYear ? `<span>Гишүүн: <b>${memberSinceYear} оноос</b></span>` : ''}
                </div>
              </div>
            </div>

            <!-- ХОЛБОО БАРИХ -->
            <div id="contactBox_${l.id}" class="ld-contact-box">
              <div style="font-size:12.5px;color:var(--ink-3);margin-bottom:10px;">Утасны дугаарыг харахдаа дарна уу</div>
              <button class="btn btn-blue btn-lg" style="width:100%;justify-content:center;" onclick="revealPhone('${l.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
                Дугаар харах
              </button>
            </div>
            <button class="btn btn-primary btn-lg ld-chat-btn" style="width:100%;justify-content:center;margin-top:8px;" onclick="openListingChat(${l.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Чат бичих
            </button>
            ${seller.email ? `
            <a class="btn btn-ghost" href="mailto:${esc(seller.email)}" style="width:100%;justify-content:center;margin-top:8px;border:1.5px solid var(--line-2);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              И-мэйл бичих
            </a>
            ` : ''}
            <button type="button" class="btn btn-ghost listing-compare ld-compare-btn" style="width:100%;justify-content:center;margin-top:8px;border:1.5px solid var(--line-2);" onclick="toggleCompare(${l.id}, this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
              Харьцуулах жагсаалтад нэмэх
            </button>
            ${totalListings != null ? `
            <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px;border:1.5px solid var(--line-2);" onclick="openSellerProfile('${l.ownerId}')">
              Энэ хэрэглэгчийн бусад зар
            </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- MOBILE STICKY CONTACT BAR (hidden on desktop via CSS) -->
      <div class="mobile-sticky-call">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;">
          <button class="btn btn-blue btn-lg" style="justify-content:center;" onclick="revealPhone('${l.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
            Утас
          </button>
          <button class="btn btn-primary btn-lg" style="justify-content:center;" onclick="openListingChat(${l.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Чат
          </button>
        </div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (history.pushState) history.pushState(null, '', '#listing-' + id);
    if (l.geoLat && l.geoLng) {
      setTimeout(() => {
        const mapEl = document.getElementById('listingDetailMap');
        if (!mapEl || typeof L === 'undefined') return;
        const m = L.map('listingDetailMap', { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([l.geoLat, l.geoLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
        }).addTo(m);
        L.marker([l.geoLat, l.geoLng]).addTo(m);
      }, 50);
    }
    if (l.cat !== 'rent') setTimeout(() => ldCalcUpdate(l.price), 30);
  }

  // ===== ОЙР ОРЧИМ — real OpenStreetMap data via the free, keyless Overpass API. Never
  // invented POIs: a category with no real results nearby says so; a listing with no saved
  // pin shows a location-required message instead of guessing coordinates. Nothing is
  // fetched until the visitor actually clicks a specific category chip — not on modal open,
  // not for all 8 categories at once — to keep load on the shared public Overpass instance
  // (and any future paid provider) proportional to actual interest.
  const NEARBY_CATEGORIES = [
    { key: 'school', icon: '🏫', label: 'Сургууль', filter: '["amenity"="school"]', radius: 1500 },
    { key: 'kindergarten', icon: '🧒', label: 'Цэцэрлэг', filter: '["amenity"="kindergarten"]', radius: 1200 },
    { key: 'store', icon: '🛒', label: 'Дэлгүүр/супермаркет', filter: '["shop"~"^(supermarket|convenience|department_store)$"]', radius: 1200 },
    { key: 'hospital', icon: '🏥', label: 'Эмнэлэг', filter: '["amenity"~"^(hospital|clinic)$"]', radius: 2500 },
    { key: 'pharmacy', icon: '💊', label: 'Эмийн сан', filter: '["amenity"="pharmacy"]', radius: 1200 },
    { key: 'cafe', icon: '☕', label: 'Кафе/ресторан', filter: '["amenity"~"^(cafe|restaurant|fast_food)$"]', radius: 1000 },
    { key: 'bank', icon: '🏦', label: 'Банк/ATM', filter: '["amenity"~"^(bank|atm)$"]', radius: 1200 },
    { key: 'transit', icon: '🚌', label: 'Нийтийн тээвэр', filter: '["highway"="bus_stop"]', radius: 800 }
  ];
  const nearbyCache = {}; // key: `${listingId}_${categoryKey}` -> sorted results array
  let nearbyMap = null;
  let nearbyMapMarkers = [];

  function ensureNearbyMap(lat, lng) {
    const el = document.getElementById('nearbyMap');
    if (!el || typeof L === 'undefined') return;
    if (nearbyMap) { nearbyMap.remove(); nearbyMap = null; nearbyMapMarkers = []; }
    nearbyMap = L.map('nearbyMap', { zoomControl: false, scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(nearbyMap);
    L.circleMarker([lat, lng], { radius: 7, color: '#1E5BFF', fillColor: '#1E5BFF', fillOpacity: 1, weight: 2 })
      .addTo(nearbyMap).bindTooltip('Энэ байр');
    setTimeout(() => nearbyMap && nearbyMap.invalidateSize(), 60);
  }

  function renderNearbyResults(cat, items) {
    const resultsEl = document.getElementById('nearbyResults');
    if (!resultsEl) return;
    if (nearbyMap) {
      nearbyMapMarkers.forEach(m => nearbyMap.removeLayer(m));
      nearbyMapMarkers = [];
      items.forEach(it => {
        const marker = L.marker([it.lat, it.lon]).addTo(nearbyMap).bindPopup(esc(it.name || cat.label));
        nearbyMapMarkers.push(marker);
      });
    }
    if (items.length === 0) {
      const radiusText = cat.radius >= 1000 ? (cat.radius / 1000).toFixed(1) + ' км' : cat.radius + ' м';
      resultsEl.innerHTML = `<div style="padding:8px 0;color:var(--ink-3);">Ойролцоо (${radiusText} дотор) ${esc(cat.label.toLowerCase())} олдсонгүй.</div>`;
      return;
    }
    resultsEl.innerHTML = items.slice(0, 10).map(it => {
      const distText = it.dist < 1000 ? Math.round(it.dist) + ' м' : (it.dist / 1000).toFixed(1) + ' км';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;">
        <span style="color:var(--ink-2);">${esc(it.name || cat.label)}</span>
        <span style="color:var(--primary);font-weight:700;white-space:nowrap;font-family:'JetBrains Mono',monospace;">${distText}</span>
      </div>`;
    }).join('');
  }

  async function loadNearbyCategory(listingId, lat, lng, catKey) {
    const cat = NEARBY_CATEGORIES.find(c => c.key === catKey);
    if (!cat) return;
    document.querySelectorAll('[data-nearby-cat]').forEach(b => {
      const active = b.dataset.nearbyCat === catKey;
      b.style.background = active ? 'var(--primary)' : '';
      b.style.color = active ? '#fff' : '';
      b.style.borderColor = active ? 'var(--primary)' : '';
    });
    const resultsEl = document.getElementById('nearbyResults');
    const mapWrap = document.getElementById('nearbyMapWrap');
    if (!resultsEl) return;
    if (mapWrap) mapWrap.style.display = 'block';
    ensureNearbyMap(lat, lng);

    const cacheKey = listingId + '_' + catKey;
    if (nearbyCache[cacheKey]) {
      renderNearbyResults(cat, nearbyCache[cacheKey]);
      return;
    }
    resultsEl.innerHTML = skeletonRows(3);
    const query = `[out:json][timeout:15];(node${cat.filter}(around:${cat.radius},${lat},${lng});way${cat.filter}(around:${cat.radius},${lat},${lng}););out center 25;`;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      if (!res.ok) throw new Error('overpass http ' + res.status);
      const data = await res.json();
      const items = (data.elements || []).map(el => {
        const plat = el.lat != null ? el.lat : (el.center && el.center.lat);
        const plon = el.lon != null ? el.lon : (el.center && el.center.lon);
        if (plat == null || plon == null) return null;
        const dist = haversineKm(lat, lng, plat, plon) * 1000;
        const name = (el.tags && (el.tags.name || el.tags['name:mn'])) || null;
        return { name, dist, lat: plat, lon: plon };
      }).filter(Boolean).sort((a, b) => a.dist - b.dist).slice(0, 15);
      nearbyCache[cacheKey] = items;
      const stillOpen = document.getElementById('nearbyResults');
      if (stillOpen) renderNearbyResults(cat, items);
    } catch (e) {
      console.error('Nearby fetch failed:', e);
      const stillOpen = document.getElementById('nearbyResults');
      if (stillOpen) stillOpen.innerHTML = `<div style="color:var(--ink-3);">Ойролцоох газруудыг татаж чадсангүй (сүлжээний алдаа). Дараа дахин оролдоно уу.</div>`;
    }
  }
  // toggleFav() (favorites.js) toggles the .faved class, which the card layout styles
  // via CSS — this header button instead renders its filled/outline state inline, so
  // update that directly after the underlying favorite state has flipped.
  function toggleFavDetail(id) {
    const btn = document.getElementById('detailFavBtn');
    toggleFav(btn, id);
    const svg = btn?.querySelector('svg');
    if (svg) {
      const isFav = favorites.includes(id);
      svg.setAttribute('fill', isFav ? '#FF4757' : 'none');
      svg.setAttribute('stroke', isFav ? '#FF4757' : 'currentColor');
    }
  }

  // Same underlying favorite (toggleFav writes priceAtSave, which drives the real price-drop
  // check in notifications.js) — this button is just an explicit, named entry point to it,
  // so it stays in sync with the heart icon in the header.
  function togglePriceAlert(id) {
    if (!currentUser) { showToast('Мэдэгдэл авахын тулд нэвтэрнэ үү'); openAuth(); return; }
    const wasFav = favorites.includes(id);
    const btn = document.getElementById('priceAlertBtn-' + id);
    toggleFav(btn, id);
    const nowFav = favorites.includes(id);
    if (btn) {
      btn.classList.toggle('active', nowFav);
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>${nowFav ? 'Үнийн мэдэгдэл идэвхтэй' : 'Үнэ буувал мэдэгд'}`;
    }
    const heartBtn = document.getElementById('detailFavBtn');
    const svg = heartBtn?.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', nowFav ? '#FF4757' : 'none');
      svg.setAttribute('stroke', nowFav ? '#FF4757' : 'currentColor');
    }
    if (nowFav && !wasFav) showToast('Үнэ буурвал танд мэдэгдэнэ', 'success');
    else if (!nowFav && wasFav) showToast('Үнийн мэдэгдэл цуцлагдлаа');
  }

  function shareListingModal(id) {
    const l = listings.find(x => x.id === id);
    const url = location.origin + location.pathname + '#listing-' + id;
    if (navigator.share) {
      navigator.share({ title: l ? l.title : '', url: url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Холбоос хуулагдлаа', 'success'));
    } else {
      showToast('Холбоос: ' + url);
    }
  }

  function reportListing(id) {
    if (!currentUser) { showToast('Зар мэдээлэхийн тулд нэвтэрнэ үү'); openAuth(); return; }
    const l = listings.find(x => x.id === id);
    if (l?.ownerId === currentUser.uid) { showToast('Өөрийн зарыг мэдээлэх боломжгүй'); return; }
    let reported = [];
    try { reported = JSON.parse(localStorage.getItem('bairxReportedListings') || '[]'); } catch(e) {}
    if (l?.firestoreId && reported.includes(l.firestoreId)) {
      showToast('Та энэ зарыг өмнө нь мэдээлсэн байна');
      return;
    }
    const reasons = ['Буруу үнэ', 'Хуурамч зар', 'Холбогдохгүй дугаар', 'Давхардсан зар'];
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">Зар #${id}</span>
        <div class="al-title" style="margin-bottom:6px;">Зарыг мэдээлэх</div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:24px;">Зарын ямар асуудлыг мэдээлэх вэ?</div>
        <div style="display:grid;gap:10px;">
          ${reasons.map(r => `
            <button onclick="submitReport(${id}, '${r}')" style="text-align:left;padding:14px 18px;border:1.5px solid var(--line);border-radius:12px;background:var(--paper-2);cursor:pointer;font-size:14px;font-weight:600;color:var(--ink);transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--danger)'" onmouseout="this.style.borderColor='var(--line)'">
              ${r}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:16px;" onclick="closeModal()">Цуцлах</button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  async function submitReport(id, reason) {
    closeModal();
    if (!currentUser) { showToast('Зар мэдээлэхийн тулд нэвтэрнэ үү'); openAuth(); return; }
    const l = listings.find(x => x.id === id);
    try {
      await db.collection('reports').add({
        listingId: id,
        listingFsId: l?.firestoreId || null,
        listingTitle: l?.title || '',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        reason,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (l?.firestoreId) {
        await db.collection('listings').doc(l.firestoreId).update({
          reportCount: firebase.firestore.FieldValue.increment(1)
        });
        try {
          const reported = JSON.parse(localStorage.getItem('bairxReportedListings') || '[]');
          if (!reported.includes(l.firestoreId)) {
            reported.push(l.firestoreId);
            localStorage.setItem('bairxReportedListings', JSON.stringify(reported));
          }
        } catch(e) {}
      }
      showToast('Мэдээлэл хүлээн авлаа. Баярлалаа!', 'success');
    } catch(e) {
      console.error('submitReport failed:', e.code, e.message);
      showToast('Мэдээлэл илгээхэд алдаа гарлаа');
    }
  }

  function revealPhone(listingId) {
    const box = document.getElementById('contactBox_' + listingId);
    if (!box) return;
    const l = listings.find(x => String(x.id) === String(listingId));
    // Demo listings have no real seller behind them — the phone number in sellerData is
    // synthetic. Showing a working "Залгах"/"Хуулах" flow for it would look like a real
    // contact number when there's no one on the other end.
    if (l && l.isDemo) {
      box.innerHTML = `<div style="font-size:13px; color:var(--ink-3); padding:8px 0;">Энэ бол жишээ зар — холбогдох дугаар байхгүй.</div>`;
      return;
    }
    // Look up the seller's phone by ID rather than accepting it as a raw parameter — this
    // is user-entered free text, and embedding it straight into an inline onclick="...'...'"
    // string is exploitable even after HTML-escaping (the browser decodes entities in an
    // attribute value before handing it to the JS parser, so &#39; becomes ' again and can
    // still break out of the quoted string). Looking it up here and wiring the copy button
    // via addEventListener below avoids ever building JS source out of user text.
    const phone = sellerData[listingId] && sellerData[listingId].phone;
    // A real listing should always have a phone (required at submission — my-listings.js),
    // but if this record somehow lacks one, show that honestly rather than a placeholder
    // number that would look like a working contact for a real seller.
    if (!phone) {
      box.innerHTML = `<div style="font-size:13px; color:var(--ink-3); padding:8px 0;">Холбогдох дугаар олдсонгүй.</div>`;
      return;
    }
    if (l) {
      l.contactCount = (l.contactCount || 0) + 1;
      if (l.firestoreId) {
        db.collection('listings').doc(l.firestoreId).update({ contactCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
      }
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    box.innerHTML = `
      <div style="font-size:22px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--ink);letter-spacing:2px;margin-bottom:16px;">${esc(phone)}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <a href="tel:${phone.replace(/\D/g,'')}" class="btn btn-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
          Залгах
        </a>
        <button class="btn btn-primary" id="copyPhoneBtn_${listingId}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Хуулах
        </button>
      </div>
    `;
    const copyBtn = document.getElementById('copyPhoneBtn_' + listingId);
    if (copyBtn) copyBtn.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(phone).then(() => showToast('Дугаар хуулагдлаа', 'success'));
    });
  }

  async function openListingChat(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    // Demo listings' ownerId is a synthetic placeholder (see data.js) with no real account
    // behind it — a chat thread would send real messages that nobody will ever read.
    if (l.isDemo) { showToast('Энэ бол жишээ зар — чат бичих боломжгүй.'); return; }
    if (!currentUser) { closeModal(); showToast('Чат бичихийн тулд нэвтэрнэ үү'); pendingChatListingId = id; openAuth(); return; }
    if (l.ownerId === currentUser.uid) { showToast('Энэ бол таны өөрийн зар'); return; }
    closeModal();
    const chatId = await getOrCreateChat(l);
    if (!chatId) return;
    // A brand-new thread (no messages sent yet) gets a pre-filled, editable greeting so
    // starting a real conversation is one tap instead of a blank input — an existing
    // conversation is left alone so reopening it doesn't keep re-suggesting a greeting.
    const chat = myChats.find(c => c.id === chatId);
    const starter = (chat && !chat.lastMessage) ? 'Сайн байна уу, энэ зар одоо ч сул байгаа юу?' : '';
    setTimeout(() => {
      document.getElementById('modalContent').className = 'modal chat-modal';
      renderChatShell();
      document.getElementById('modal').classList.add('open');
      document.body.style.overflow = 'hidden';
      openChatThread(chatId, starter);
    }, 200);
  }


  function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modalContent').className = 'modal';
    document.body.style.overflow = '';
    if (history.pushState && location.hash.startsWith('#listing-')) history.pushState(null, '', ' ');
    if (typeof unsubscribeActiveChat === 'function') unsubscribeActiveChat();
  }

  // ===== SELLER / AGENT PROFILE =====
  // One profile per real owner: every listing that owner has posted, plus their role
  // (Эзэмшигч/Агент/Компани), verified badge, and self-reported company name. Since
  // Firestore rules only let a user read their own users/{uid} doc, all of this rides
  // on the listing documents themselves (sellerType/sellerVerified/sellerCompany,
  // snapshotted at publish time) rather than a live cross-account lookup.
  function openSellerProfile(ownerId) {
    if (!ownerId) return;
    const allSellerListings = listings.filter(x => x.ownerId === ownerId)
      .sort((a, b) => (b._bumpedAt || b.id) - (a._bumpedAt || a.id));
    if (!allSellerListings.length) return;
    const activeListings = allSellerListings.filter(x => !x._inactive);
    const primary = allSellerListings[0];
    // Not every listing necessarily has a populated sellerData entry (e.g. legacy rows) —
    // use the newest one that actually does, rather than assuming it's always `primary`.
    const withSellerData = allSellerListings.find(x => sellerData[x.id]) || primary;
    const sd = sellerData[withSellerData.id] || {};
    // Look up the name here instead of accepting it as a parameter — see revealPhone's comment
    // above for why passing user-entered text through an inline onclick(...) call is unsafe.
    const name = sd.name || 'Хэрэглэгч';
    const roleLabel = sd.type || 'Хувь хүн';
    const isVerified = !!primary.sellerVerified;
    // "Member since" used to be invented outright for demo sellers (2020 + id%5) and, for
    // real sellers, just showed today's year regardless of when they actually joined —
    // neither was real data. Demo sellers have no real account behind them at all, so the
    // row is omitted entirely for them. Real sellers show the earliest real Firestore
    // createdAt among their own listings (the closest real signal available — Firestore
    // rules block reading another user's own account-creation date directly), and if none
    // of their listings happen to carry that field, the row is omitted rather than guessed.
    const createdMsValues = allSellerListings.map(x => x._createdAtMs || 0).filter(ms => ms > 0);
    const memberSinceYear = (!primary.isDemo && createdMsValues.length)
      ? new Date(Math.min(...createdMsValues)).getFullYear() : null;

    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">Профайл</span>
        <div style="display:flex; align-items:center; gap:14px; margin:10px 0 4px;">
          <div style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-deep)); display:grid; place-items:center; color:#fff; font-weight:700; font-size:20px; flex-shrink:0;">${esc((name || 'А')[0])}</div>
          <div>
            <div class="al-title" style="margin-bottom:2px; font-size:22px;">${esc(name)}${isVerified ? ' <span class="seller-verified">✓ Verified</span>' : ''}</div>
            <div style="font-size:13px; color:var(--ink-3);">
              <span style="font-weight:600; color:var(--ink-2);">${roleLabel === 'Агент' ? 'Үл хөдлөх хөрөнгийн агент' : (roleLabel === 'Компани' ? 'Барилгын компани' : 'Хувь хүн — эзэмшигч')}</span>
              ${sd.company ? ` · ${esc(sd.company)}` : ''}
            </div>
          </div>
        </div>
        <div style="display:flex; gap:18px; font-size:12.5px; color:var(--ink-3); margin:14px 0 22px; padding-bottom:18px; border-bottom:1px solid var(--line);">
          <span><b style="color:var(--ink);">${activeListings.length}</b> идэвхтэй зар</span>
          <span><b style="color:var(--ink);">${allSellerListings.length}</b> нийт нийтэлсэн</span>
          ${memberSinceYear ? `<span>Гишүүн: <b style="color:var(--ink);">${memberSinceYear}</b> оноос</span>` : ''}
        </div>
        ${sd.phone ? `
        <div style="display:flex; gap:10px; margin-bottom:24px;">
          <button class="btn btn-blue" style="flex:1; justify-content:center;" onclick="revealPhone(${withSellerData.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
            Залгах
          </button>
          <button class="btn btn-ghost" style="flex:1; justify-content:center; border:1.5px solid var(--line-2);" onclick="closeModal(); setTimeout(() => openListingChat(${withSellerData.id}), 250)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Чат бичих
          </button>
        </div>
        ` : ''}
        <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-3); margin-bottom:12px;">Бүх зар (${allSellerListings.length})</div>
        <div class="listings-grid" id="sellerProfileGrid"></div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    const grid = document.getElementById('sellerProfileGrid');
    grid.innerHTML = allSellerListings.map(l => `
      <article class="listing-card" style="${l._inactive ? 'opacity:0.6;' : ''}" onclick="closeModal(); setTimeout(()=>openListing(${l.id}),200)">
        <div class="listing-img">
          <img src="${esc(l.img)}" alt="${esc(l.title)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #1E5BFF)';" />
        </div>
        <div class="listing-body">
          <div class="listing-price-row">
            <div class="listing-price">${fmtPrice(l.price)}</div>
            ${l._inactive ? '<span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-3); background:var(--paper-2); padding:3px 8px; border-radius:100px;">Идэвхгүй</span>' : ''}
          </div>
          <h3 class="listing-title">${esc(l.title)}</h3>
          <div class="listing-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(l.loc)}</div>
        </div>
      </article>
    `).join('');
  }

