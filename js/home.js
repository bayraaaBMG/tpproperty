  // ===== HOME LISTINGS PREVIEW =====
  // Shared card markup for every homepage listing grid (newest, featured) — kept in one
  // place so both sections render identically and stay in sync with the real listing-card
  // look used on the Listings page itself.
  function homeCardHtml(l) {
    return `
      <article class="listing-card" onclick="showPage('listings'); setTimeout(()=>openListing(${l.id}),150)">
        <div class="listing-img">
          <img src="${esc(l.img)}" alt="${esc(l.title)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #1E5BFF)';"/>
          <div class="listing-badges">
            ${!l.userSubmitted ? '<span class="badge demo">Жишээ зар</span>' : ''}
            ${l.badges.includes('vip') ? '<span class="badge vip">⭐ VIP</span>' : (l.badges.includes('hot') ? '<span class="badge hot">Эрэлттэй</span>' : '')}
            ${l.badges.includes('new') || l.badges.includes('user') ? '<span class="badge new">Шинэ</span>' : ''}
            ${(l.listingVerified || l.sellerVerified) ? '<span class="badge verified">✓ Баталгаажсан</span>' : ''}
          </div>
          <button class="listing-fav ${favorites.includes(l.id) ? 'faved' : ''}" onclick="event.stopPropagation(); toggleFav(this, ${l.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
          </button>
        </div>
        <div class="listing-body">
          <div class="listing-price-row">
            <div>
              <div class="listing-price">${l.price >= 1000 ? (l.price/1000).toFixed(1) : l.price}<span style="font-size:14px; color:var(--ink-3); font-weight:500;"> ${l.price >= 1000 ? 'тэрбум' : 'сая'} ₮${l.cat === 'rent' ? '/сар' : ''}</span></div>
              <div class="listing-price-sub">${l.cat === 'rent' ? 'Сарын түрээс' : pricePerSqmText(l)}${Array.isArray(l.features) && l.features.includes('negotiable') ? ' · <span class="negotiable-tag">Тохиролцоно</span>' : ''}</div>
            </div>
            <span class="price-tag ${l.tag.type === 'normal' ? '' : l.tag.type}">${l.tag.text}</span>
          </div>
          <h3 class="listing-title">${esc(l.title)}</h3>
          <div class="listing-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${esc(l.loc)}</div>
          ${listingTimeAgo(l) ? `<div class="listing-time">${listingTimeAgo(l)}</div>` : ''}
          <div class="listing-meta">
            <span class="listing-meta-item"><strong>${l.area}</strong> м²</span>
            <span class="listing-meta-item"><strong>${l.rooms}</strong>${typeof l.rooms === 'number' ? ' өрөө' : ''}</span>
            <span class="listing-meta-item"><strong>${l.floor}</strong></span>
            ${l.year ? `<span class="listing-meta-item"><strong>${l.year}</strong></span>` : ''}
          </div>
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
      grid.innerHTML = recent.map(homeCardHtml).join('');
    }
    renderFeaturedListings();
    renderHomeCategoryCounts();
  }

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
    grid.innerHTML = featured.map(homeCardHtml).join('');
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
    const counts = {
      apartment: active.filter(l => l.cat === 'apartment').length,
      rent: active.filter(l => l.cat === 'rent').length,
      office: active.filter(l => l.cat === 'office').length,
      house: active.filter(l => l.cat === 'house').length,
      land: active.filter(l => l.cat === 'land').length,
      cottage: active.filter(l => l.propertyType === 'cottage').length,
      garage: active.filter(l => l.propertyType === 'garage').length,
      commercial: active.filter(l => l.propertyType === 'commercial').length,
      other: active.filter(l => l.propertyType === 'other').length,
    };
    Object.keys(counts).forEach(key => {
      const el = document.getElementById('homeCatCount-' + key);
      if (el) el.textContent = fmt(counts[key]);
    });

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
  function goHomeCategory(cat) {
    showPage('listings');
    setTimeout(() => {
      currentCat = cat;
      document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === cat));
      applyListingFilter();
    }, 100);
  }
