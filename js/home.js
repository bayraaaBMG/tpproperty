  // ===== SHARED LISTING CARD =====
  // Single card component for every listing grid in the app — home's "Шинээр
  // нэмэгдсэн"/"Онцлох" grids and the Listings page's own browse grid all render from
  // this one function now, so there's one source of truth for the card look instead of
  // two templates drifting apart. opts.fullFeatures adds the extras only the Listings
  // page's fuller card needs (compare checkbox, photo-count badge, agent badge, loan
  // strip) — home's grids call this with no opts, exactly as homeCardHtml() did before.
  function listingCardHtml(l, opts = {}) {
    const fullFeatures = !!opts.fullFeatures;
    const priceNum = fmtPrice(l.price).replace(' тэрбум ₮', '').replace(' сая ₮', '');
    const priceUnit = l.price >= 1000 ? 'тэрбум' : 'сая';
    return `
      <article class="listing-card" data-lid="${l.id}" onclick="${fullFeatures ? `openListing(${l.id})` : `showPage('listings'); setTimeout(()=>openListing(${l.id}),150)`}">
        <div class="listing-img">
          <img src="${esc(l.img)}" alt="${esc(l.title)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #272B68)';"/>
          <div class="listing-badges">
            ${!l.userSubmitted ? '<span class="badge demo">Жишээ зар</span>' : ''}
            ${l.badges.includes('vip') ? '<span class="badge vip">⭐ VIP</span>' : (l.badges.includes('hot') ? '<span class="badge hot">Эрэлттэй</span>' : '')}
            ${l.badges.includes('new') || l.badges.includes('user') ? '<span class="badge new">Шинэ</span>' : ''}
            ${fullFeatures && sellerData[l.id]?.type === 'Агент' ? '<span class="badge agent">Агент</span>' : ''}
            ${(l.listingVerified || l.sellerVerified) ? '<span class="badge verified">✓ Баталгаажсан</span>' : ''}
          </div>
          <button class="listing-fav ${favorites.includes(l.id) ? 'faved' : ''}" data-fav-id="${l.id}" onclick="event.stopPropagation(); toggleFav(this, ${l.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
          </button>
          ${fullFeatures ? `
          <button class="listing-compare" onclick="event.stopPropagation(); toggleCompare(${l.id}, this)">
            <span class="listing-compare-check"></span>
            Харьцуулах
          </button>
          <div class="listing-img-count" onclick="event.stopPropagation(); openGallery(${l.id})">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            ${(listingExtras[l.id]?.gallery.length || 5)}
          </div>` : ''}
        </div>
        <div class="listing-body">
          <div class="listing-price-row">
            <div>
              <div class="listing-price">${priceNum}<span style="font-size:14px; color:var(--ink-3); font-weight:500;"> ${priceUnit} ₮${l.cat === 'rent' ? '/сар' : ''}</span></div>
              <div class="listing-price-sub">${l.cat === 'rent' ? 'Сарын түрээс' : pricePerSqmText(l)}${Array.isArray(l.features) && l.features.includes('negotiable') ? ' · <span class="negotiable-tag">Тохиролцоно</span>' : ''}</div>
            </div>
            <span class="price-tag ${l.tag.type === 'normal' ? '' : l.tag.type}">${l.tag.text}</span>
          </div>
          <h3 class="listing-title">${esc(l.title)}</h3>
          <div class="listing-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${esc(l.loc)}</span></div>
          ${listingTimeAgo(l) ? `<div class="listing-time">${listingTimeAgo(l)}</div>` : ''}
          <div class="listing-meta">
            <span class="listing-meta-item"><strong>${l.area}</strong> м²</span>
            <span class="listing-meta-item"><strong>${l.rooms}</strong>${typeof l.rooms === 'number' ? ' өрөө' : ''}</span>
            <span class="listing-meta-item"><strong>${l.floor}</strong></span>
            ${l.year ? `<span class="listing-meta-item"><strong>${l.year}</strong></span>` : ''}
          </div>
          ${fullFeatures ? (l.cat !== 'rent' ? (l.monthly ? `<div class="listing-loan-strip">
            <div>
              <div class="loan-strip-label">${esc(l.loanType)} сар бүр</div>
              <div class="loan-strip-amt">${typeof l.monthly === 'number' ? l.monthly.toFixed(2) + ' сая ₮' : l.monthly}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-deep)" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
          </div>` : `<div class="listing-loan-strip">
            <div><div class="loan-strip-label">Зээлийн нөхцөл</div><div class="loan-strip-amt">${esc(l.loanType)}</div></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-deep)" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
          </div>`) : `<div class="listing-loan-strip"><div><div class="loan-strip-label">Барьцаа</div><div class="loan-strip-amt">${esc((l.legalNotes || '—').split('·')[0].trim())}</div></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-deep)" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></div>`) : ''}
        </div>
      </article>
    `;
  }

  function renderHomeListings() {
    const grid = document.getElementById('homeListingsGrid');
    if (grid) {
      // VIP/Featured plans promise homepage placement — boosted listings sort first (by
      // recency among themselves), everything else fills the remaining slots by recency.
      const recent = listings.filter(l => !l._inactive)
        .sort((a, b) => (b.badges.includes('vip') - a.badges.includes('vip')) || (b.id - a.id))
        .slice(0, 8);
      grid.innerHTML = recent.length ? recent.map(l => listingCardHtml(l)).join('') : buyerEmptyState({
        icon: BUYER_EMPTY_ICON_SEARCH,
        title: 'Одоогоор зар алга',
        sub: 'Удахгүй шинэ зарууд нэмэгдэнэ.'
      });
    }
    renderFeaturedListings();
    renderHomeCategoryCounts();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncHomeCarouselArrows);
  }

  // ---- Home carousels: step ONE card per arrow click, with a seamless infinite loop. ----
  // Each native-scroll track is doubled by appending a clone of its cards (homeSetupLoop); an
  // arrow click scrolls by exactly one card and silently wraps scrollLeft by one full cycle at
  // the ends, so the first card follows the last (and vice-versa) with no visible jump.
  function homeTrackGap(track) {
    const cs = getComputedStyle(track);
    const g = parseFloat(cs.columnGap || cs.gap || '0');
    return isFinite(g) ? g : 0;
  }
  function homeTrackCardSel(track) {
    if (track.classList.contains('home-agents-grid')) return '.agent-card';
    if (track.classList.contains('hs-cat-shortcuts')) return '.hs-cat-shortcut';
    if (track.classList.contains('site-ad-track')) return '.site-ad-banner';
    return '.listing-card';
  }
  function homeLoopReals(track, sel) {
    return Array.from(track.children).filter(c => c.matches(sel) && !c.hasAttribute('data-loop-clone'));
  }
  // Instantly (invisibly) shift scrollLeft by whole cycles so it stays over the REAL cards — this
  // is what makes touch-swipe AND arrows loop forever. The track has CSS scroll-behavior:smooth,
  // so the shift is wrapped in an `auto` override to stay instant (else it would animate/be seen).
  function homeLoopNormalize(track) {
    const cycle = track._loopCycle; if (!cycle) return;
    let target = track.scrollLeft; const start = target;
    while (target >= 2 * cycle - 1) target -= cycle;   // drifted into the trailing clone copy
    while (target < cycle - 1) target += cycle;         // drifted into the leading clone copy
    if (Math.abs(target - start) > 0.5) {
      const prev = track.style.scrollBehavior; track.style.scrollBehavior = 'auto';
      track.scrollLeft = target; track.style.scrollBehavior = prev;
    }
  }
  // Clone the real cards on BOTH sides (re-runnable) so the track loops in either direction for
  // touch-swipe and arrows alike, and start centred on the real set. Only when they overflow.
  function homeSetupLoop(track) {
    if (!track) return;
    const sel = homeTrackCardSel(track);
    track.querySelectorAll('[data-loop-clone]').forEach(n => n.remove());
    track._loopCycle = 0;
    const reals = homeLoopReals(track, sel);
    if (reals.length < 2 || track.scrollWidth <= track.clientWidth + 4) return;
    const before = document.createDocumentFragment(), after = document.createDocumentFragment();
    reals.forEach(card => {
      const a = card.cloneNode(true); a.setAttribute('data-loop-clone', '1'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; after.appendChild(a);
      const b = card.cloneNode(true); b.setAttribute('data-loop-clone', '1'); b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; before.appendChild(b);
    });
    track.appendChild(after);
    track.insertBefore(before, track.firstChild);
    const firstReal = homeLoopReals(track, sel)[0];
    const cycle = firstReal ? firstReal.offsetLeft : 0;   // width of one full set (the leading copy)
    track._loopCycle = cycle;
    const prev = track.style.scrollBehavior; track.style.scrollBehavior = 'auto';
    track.scrollLeft = cycle; track.style.scrollBehavior = prev;   // centre on the real cards
    // Normalise after every touch / wheel / programmatic scroll settles -> seamless infinite loop.
    if (!track._loopWired) {
      track._loopWired = true;
      let tmr = null;
      track.addEventListener('scroll', () => { if (tmr) clearTimeout(tmr); tmr = setTimeout(() => homeLoopNormalize(track), 90); }, { passive: true });
    }
  }
  // Step one card left/right (dir -1/1). Loops seamlessly on looping tracks; plain scroll otherwise.
  function homeLoopStep(track, dir) {
    if (!track) return;
    const sel = homeTrackCardSel(track);
    const reals = homeLoopReals(track, sel);
    const step = reals.length ? reals[0].getBoundingClientRect().width + homeTrackGap(track) : Math.max(200, track.clientWidth * 0.85);
    if (track._loopCycle) homeLoopNormalize(track);     // keep centred so there's always room + a wrap
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  function scrollHomeRow(btn, dir) {
    const car = btn.closest('.home-carousel, .hs-cat-carousel');
    const track = car && car.querySelector('.home-listings-grid, .home-agents-grid, .hs-cat-shortcuts');
    homeLoopStep(track, dir);
  }
  // Set up loops + show/hide arrows on the listing / agent / category carousels.
  function syncHomeCarouselArrows() {
    document.querySelectorAll('.home-carousel, .hs-cat-carousel').forEach(car => {
      const t = car.querySelector('.home-listings-grid, .home-agents-grid, .hs-cat-shortcuts');
      if (!t) return;
      homeSetupLoop(t);
      const overflow = !!t.querySelector('[data-loop-clone]') || (!!t.querySelector('.listing-card, .agent-card, .hs-cat-shortcut') && t.scrollWidth > t.clientWidth + 4);
      car.querySelectorAll('.home-listings-arrow, .hs-cat-arrow').forEach(a => { a.style.display = overflow ? '' : 'none'; });
    });
  }
  // Same, for the sponsored-ad carousels (separate markup/classes).
  function syncSiteAdArrows() {
    document.querySelectorAll('.site-ad-carousel').forEach(c => {
      const t = c.querySelector('.site-ad-track'); if (!t) return;
      homeSetupLoop(t);
      const overflow = !!t.querySelector('[data-loop-clone]') || t.scrollWidth > t.clientWidth + 2;
      c.querySelectorAll('.site-ad-nav').forEach(n => { n.style.display = overflow ? '' : 'none'; });
    });
  }
  window.addEventListener('resize', () => { if (typeof syncHomeCarouselArrows === 'function') syncHomeCarouselArrows(); if (typeof syncSiteAdArrows === 'function') syncSiteAdArrows(); });

  // "Онцлох зарууд" — ranked by propertyScore() (utils.js), the same real, documented,
  // rule-based composite (price fairness vs. real comparables + verification + feature/
  // photo completeness) used on every listing detail page. Not a paid placement and not
  // a second, invented ranking — VIP/boosted listings aren't guaranteed a slot here the
  // way they are in "Шинээр нэмэгдсэн" above; they show up if their real score earns it.
  function renderFeaturedListings() {
    const grid = document.getElementById('homeFeaturedGrid');
    if (!grid) return;
    const featured = listings.filter(l => !l._inactive)
      .map(l => ({ l, score: propertyScore(l) }))
      .sort((a, b) => b.score - a.score || b.id - a.id)
      .slice(0, 8)
      .map(x => x.l);
    grid.innerHTML = featured.length ? featured.map(l => listingCardHtml(l)).join('') : buyerEmptyState({
      icon: BUYER_EMPTY_ICON_SEARCH,
      title: 'Одоогоор зар алга',
      sub: 'Удахгүй шинэ зарууд нэмэгдэнэ.'
    });
  }

  // "Категориуд" — every count is a live tally over the real `listings` array, the same
  // source the filter-pill counts (updateCatPillCounts, filters-advanced.js) already use.
  // The four narrower rows (Зуслан/Гараж/Худалдаа-үйлчилгээ/Бусад) key off propertyType,
  // which only real Add-Listing submissions reliably set — older demo rows correctly show
  // 0 there rather than a guessed number. Clicking one of those four still only narrows to
  // its parent bucket on the Listings page (house/office) since there's no propertyType
  // filter control there yet — it's honest about that rather than pretending to filter
  // more precisely than the app currently can.
  function renderHomeCategoryCounts() {
    const active = listings.filter(l => !l._inactive);
    // Counted with the canonical predicate (utils.js): the broad apartment/house/office
    // counts now EXCLUDE the subtypes shown as their own tile (new-apartment/cottage/
    // garage/commercial), so each tile's number equals what clicking it actually returns.
    const counts = {
      apartment: active.filter(l => listingMatchesCategory(l, 'apartment')).length,
      rent: active.filter(l => listingMatchesCategory(l, 'rent')).length,
      office: active.filter(l => listingMatchesCategory(l, 'office')).length,
      house: active.filter(l => listingMatchesCategory(l, 'house')).length,
      land: active.filter(l => listingMatchesCategory(l, 'land')).length,
      'new-apartment': active.filter(l => listingMatchesCategory(l, 'new-apartment')).length,
      cottage: active.filter(l => listingMatchesCategory(l, 'cottage')).length,
      garage: active.filter(l => listingMatchesCategory(l, 'garage')).length,
      commercial: active.filter(l => listingMatchesCategory(l, 'commercial')).length,
      other: active.filter(l => l.propertyType === 'other').length,
    };
    Object.keys(counts).forEach(key => {
      const el = document.getElementById('homeCatCount-' + key);
      if (el) el.textContent = fmt(counts[key]);
    });
    // Featured-agent cards show a live active-listing count from listings[] — refresh it here.
    if (typeof cmsRefreshHomeAgents === 'function') cmsRefreshHomeAgents();

    const heroStats = {
      all: active.length,
      apartment: counts.apartment,
      rent: counts.rent,
      landhouse: counts.land + counts.house,
    };
    Object.keys(heroStats).forEach(key => {
      const el = document.getElementById('heroStat-' + key);
      if (el) el.textContent = fmt(heroStats[key]);
    });
    // No fake "0 зар" — only show the inline stat strip once there's something real to count.
    const statsStrip = document.getElementById('heroMiniStats');
    if (statsStrip) statsStrip.style.display = active.length > 0 ? '' : 'none';
  }

  // Shared by every home-category tile: jump to Listings pre-filtered to the tile's
  // bucket (fine-grained propertyType tiles land on their parent bucket — see the note
  // on renderHomeCategoryCounts above).
  // The category shortcut tiles under the home search bar. setSearchCategory() also
  // writes the choice back into the Ангилал <select>, without which the tile's category
  // was thrown away by the very next Хайх press (the select still read "Ангилал", and
  // performSearch takes the select as the source of truth).
  function goHomeCategory(cat) {
    setSearchCategory(cat);
    // Read the keyword box rather than trusting the module-level `searchText`. The two
    // drift apart the moment the user edits the box without pressing Хайх, and the tile
    // would then silently filter by a keyword that is no longer anywhere on screen — an
    // "Орон сууц" tap returning 2 of 8 listings with nothing to explain why. Reading the
    // live input also means an empty box shows the whole category, which is what tapping
    // a category tile should do.
    const keyword = (document.getElementById('hSearchKeyword')?.value || '').trim();
    searchText = keyword;
    const fSearch = document.getElementById('fSearch');
    if (fSearch) fSearch.value = keyword;
    showPage('listings');
    setTimeout(() => { applyListingFilter(); }, 100);
  }

  // ===== SITE-FACING ADVERTISING PLACEMENTS =====
  // Real Firestore-backed banners (js/admin.js owns the CRUD) — a placement's <div> is left
  // completely empty (no placeholder, no "coming soon") whenever no real, currently-active ad
  // targets it. isAdCurrentlyActive() (admin.js) is the same active-window check the admin
  // list view uses, so what's shown here always matches what the dashboard says is live.
  const AD_PLACEMENT_SLOTS = { 'home-banner': 'homeAdBanner', 'listings': 'listingsAdBanner' };
  let _siteAdsCache = null;

  async function renderSiteAds() {
    try {
      const snap = await db.collection('ads').where('active', '==', true).get();
      _siteAdsCache = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
    } catch(e) {
      _siteAdsCache = [];
    }
    paintSiteAdSlots();
  }

  // One sponsored-ad card. targetUrl is validated to http/https (cmsSafeUrl) — an ad with no
  // safe URL renders as a non-clickable card rather than a dead javascript: link.
  function siteAdCardHtml(ad) {
    const safe = (typeof cmsSafeUrl === 'function') ? cmsSafeUrl(ad.targetUrl || '') : '';
    const inner = `
        ${ad.image ? `<img src="${esc(ad.image)}" alt="${esc(ad.title || '')}" loading="lazy" />` : ''}
        <div class="site-ad-body">
          <span class="site-ad-label">Ивээн тэтгэсэн</span>
          <div class="site-ad-title">${esc(ad.title || '')}</div>
          <div class="site-ad-sponsor">${esc(ad.sponsorName || '')}</div>
        </div>`;
    return safe
      ? `<a class="site-ad-banner" href="${esc(safe)}" target="_blank" rel="noopener sponsored">${inner}</a>`
      : `<div class="site-ad-banner" role="group">${inner}</div>`;
  }
  // Step the sponsored-ad carousel one card left/right with the same seamless infinite loop.
  function scrollSiteAds(btn, dir) {
    const track = btn.parentElement && btn.parentElement.querySelector('.site-ad-track');
    homeLoopStep(track, dir);
  }
  function paintSiteAdSlots() {
    if (!_siteAdsCache) return;
    Object.keys(AD_PLACEMENT_SLOTS).forEach(placement => {
      const el = document.getElementById(AD_PLACEMENT_SLOTS[placement]);
      if (!el) return;
      // ALL currently-active ads for this placement (was .find() — only ever showed the first).
      const ads = _siteAdsCache.filter(a => a.placement === placement && (typeof isAdCurrentlyActive !== 'function' || isAdCurrentlyActive(a)));
      if (!ads.length) { el.innerHTML = ''; return; }
      const cards = ads.map(siteAdCardHtml).join('');
      el.innerHTML = ads.length === 1
        ? `<div class="site-ad-carousel"><div class="site-ad-track single">${cards}</div></div>`
        : `<div class="site-ad-carousel">
            <button type="button" class="site-ad-nav prev" aria-label="Өмнөх" onclick="scrollSiteAds(this,-1)">‹</button>
            <div class="site-ad-track">${cards}</div>
            <button type="button" class="site-ad-nav next" aria-label="Дараах" onclick="scrollSiteAds(this,1)">›</button>
          </div>`;
    });
    // Set up the infinite loop + hide arrows on any carousel whose cards already fit.
    requestAnimationFrame(() => { if (typeof syncSiteAdArrows === 'function') syncSiteAdArrows(); });
  }
