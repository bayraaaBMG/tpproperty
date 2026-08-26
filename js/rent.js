  // ===== RENT PAGE — unified marketplace design system (same search/sidebar/grid shell
  // as the Listings page), now sourced from the same real `listings` array (cat==='rent')
  // instead of a separate hardcoded demo dataset. Real user-submitted rentals were already
  // being mirrored into the old `rentListings` array by doSubmitListing() (my-listings.js)
  // purely so this page could show them — now that this page reads `listings` directly,
  // that mirroring is redundant but harmless to leave in place (kept unused rather than
  // risk touching doSubmitListing's real submit path for this round). =====
  const rentListings = []; // kept declared — my-listings.js's mirroring code still checks `typeof rentListings !== 'undefined'`

  let rentSort = 'default';
  const rentActiveToggles = [];

  function rentDistrictLabel(code) {
    const labels = {
      'khan-uul': 'Хан-Уул', 'sukhbaatar': 'Сүхбаатар', 'chingeltei': 'Чингэлтэй',
      'bayanzurkh': 'Баянзүрх', 'bayangol': 'Баянгол', 'songinokhairkhan': 'Сонгинохайрхан',
      'nalaikh': 'Налайх', 'bagakhangai': 'Багахангай', 'baganuur': 'Багануур'
    };
    return labels[code] || code;
  }

  function getFilteredRentListings() {
    let results = listings.filter(l => l.cat === 'rent' && !l._inactive);
    const q = (document.getElementById('rfSearch')?.value || '').trim().toLowerCase();
    if (q) {
      results = results.filter(l => {
        const haystack = [l.title, l.loc, l.district, String(l.rooms), l.description || ''].join(' ').toLowerCase();
        return q.split(/\s+/).every(word => haystack.includes(word));
      });
    }
    const district = document.getElementById('rfDistrict')?.value || 'all';
    if (district !== 'all') results = results.filter(l => l.district === district);
    const priceMin = parseFloat(document.getElementById('rfPriceMin')?.value) || 0;
    const priceMax = parseFloat(document.getElementById('rfPriceMax')?.value) || Infinity;
    results = results.filter(l => l.price >= priceMin && l.price <= priceMax);
    const areaMin = parseFloat(document.getElementById('rfAreaMin')?.value) || 0;
    const areaMax = parseFloat(document.getElementById('rfAreaMax')?.value) || Infinity;
    results = results.filter(l => l.area >= areaMin && l.area <= areaMax);
    const rooms = document.getElementById('rfRooms')?.value || 'all';
    if (rooms !== 'all') {
      const r = parseInt(rooms);
      results = results.filter(l => typeof l.rooms === 'number' && (r === 4 ? l.rooms >= 4 : l.rooms === r));
    }
    const depositMax = parseFloat(document.getElementById('rfDepositMax')?.value);
    if (depositMax) results = results.filter(l => !l.deposit || l.deposit <= depositMax);
    const minTerm = document.getElementById('rfMinTerm')?.value || '';
    if (minTerm) {
      const minTermLabels = { '1m': '1 сар', '3m': '3 сар', '6m': '6 сар', '1y': '1 жил+' };
      results = results.filter(l => l.minTerm === minTermLabels[minTerm]);
    }
    if (rentActiveToggles.includes('furnished')) results = results.filter(l =>
      (l.condition && l.condition.toLowerCase().includes('тавилга')) ||
      (Array.isArray(l.features) && l.features.some(f => f === 'furnished' || (typeof f === 'string' && f.toLowerCase().includes('тавилга'))))
    );
    if (rentActiveToggles.includes('verified')) results = results.filter(l => l.sellerVerified === true || l.listingVerified === true);
    if (rentActiveToggles.includes('parking')) results = results.filter(l =>
      (l.parking && !l.parking.includes('Байхгүй') && !l.parking.includes('Хамаарахгүй')) ||
      (Array.isArray(l.features) && l.features.includes('parking'))
    );

    if (rentSort === 'price-asc') results.sort((a, b) => a.price - b.price);
    else if (rentSort === 'price-desc') results.sort((a, b) => b.price - a.price);
    else if (rentSort === 'area-desc') results.sort((a, b) => b.area - a.area);
    else results.sort((a, b) => (b._bumpedAt || b.id) - (a._bumpedAt || a.id));

    return results;
  }

  // Kept as the entry point doSubmitListing() (my-listings.js) already calls after a real
  // rent submission — the old `type` tab argument no longer applies (tabs replaced by the
  // sidebar's real minTerm/district/price filters) and is simply ignored.
  function renderRentListings() {
    const grid = document.getElementById('rentGrid');
    if (!grid) return;
    const items = getFilteredRentListings();
    const countEl = document.getElementById('rentFilterCount');
    if (countEl) countEl.textContent = items.length;
    const mfCount = document.getElementById('rentMobileFilterCount');
    if (mfCount) {
      const n = rentActiveFilterCount();
      mfCount.textContent = n > 0 ? ` (${n})` : '';
    }
    if (items.length === 0) {
      grid.innerHTML = buyerEmptyState({
        icon: BUYER_EMPTY_ICON_SEARCH,
        title: 'Тохирох түрээсийн зар олдсонгүй',
        sub: 'Шүүлтүүрийн нөхцөлийг өөрчлөх эсвэл цэвэрлэж дахин оролдоно уу.',
        resetLabel: 'Шүүлтүүр цэвэрлэх',
        resetOnclick: 'resetRentFilters()'
      });
      return;
    }
    grid.innerHTML = items.map(l => listingCardHtml(l, { fullFeatures: true })).join('');
    renderRentActiveTags();
  }

  function rentActiveFilterCount() {
    let n = 0;
    if ((document.getElementById('rfDistrict')?.value || 'all') !== 'all') n++;
    if (document.getElementById('rfPriceMin')?.value) n++;
    if (document.getElementById('rfPriceMax')?.value) n++;
    if (document.getElementById('rfAreaMin')?.value) n++;
    if (document.getElementById('rfAreaMax')?.value) n++;
    if ((document.getElementById('rfRooms')?.value || 'all') !== 'all') n++;
    if (document.getElementById('rfDepositMax')?.value) n++;
    if (document.getElementById('rfMinTerm')?.value) n++;
    n += rentActiveToggles.length;
    return n;
  }

  function renderRentActiveTags() {
    const wrap = document.getElementById('rentActiveFilterTags');
    if (!wrap) return;
    const tags = [];
    const districtVal = document.getElementById('rfDistrict')?.value;
    if (districtVal && districtVal !== 'all') tags.push({ label: rentDistrictLabel(districtVal), clear: () => { document.getElementById('rfDistrict').value = 'all'; } });
    const q = document.getElementById('rfSearch')?.value;
    if (q) tags.push({ label: '"' + q + '"', clear: () => { document.getElementById('rfSearch').value = ''; } });
    const priceMin = document.getElementById('rfPriceMin')?.value;
    if (priceMin) tags.push({ label: priceMin + '+сая ₮/сар', clear: () => { document.getElementById('rfPriceMin').value = ''; } });
    const priceMax = document.getElementById('rfPriceMax')?.value;
    if (priceMax) tags.push({ label: '≤' + priceMax + 'сая ₮/сар', clear: () => { document.getElementById('rfPriceMax').value = ''; } });
    const rooms = document.getElementById('rfRooms')?.value;
    if (rooms && rooms !== 'all') tags.push({ label: rooms + '+ өрөө', clear: () => { document.getElementById('rfRooms').value = 'all'; } });
    const toggleLabels = { furnished: 'Тавилгатай', verified: 'Баталгаажсан', parking: 'Паркингтай' };
    rentActiveToggles.slice().forEach(t => tags.push({
      label: toggleLabels[t] || t,
      clear: () => {
        const i = rentActiveToggles.indexOf(t);
        if (i > -1) rentActiveToggles.splice(i, 1);
        document.querySelectorAll('#rentSidebar .filter-toggle').forEach(el => el.classList.toggle('active', rentActiveToggles.includes(el.dataset.rftoggle)));
      }
    }));
    if (tags.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = tags.map((t, i) => `
      <span class="active-filter-chip" onclick="rentClearTag(${i})">
        ${esc(t.label)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </span>
    `).join('') + `<button type="button" class="active-filter-clear-all" onclick="resetRentFilters()">Бүгдийг арилгах</button>`;
    window._rentTagClears = tags.map(t => t.clear);
  }
  function rentClearTag(i) {
    const fn = window._rentTagClears && window._rentTagClears[i];
    if (fn) fn();
    applyRentFilters();
  }

  function applyRentFilters() {
    renderRentListings();
  }

  function resetRentFilters() {
    ['rfSearch', 'rfPriceMin', 'rfPriceMax', 'rfAreaMin', 'rfAreaMax', 'rfDepositMax'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['rfDistrict', 'rfRooms'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
    const minTermEl = document.getElementById('rfMinTerm'); if (minTermEl) minTermEl.value = '';
    rentActiveToggles.length = 0;
    document.querySelectorAll('#rentSidebar .filter-toggle').forEach(el => el.classList.remove('active'));
    rentSort = 'default';
    const sortEl = document.getElementById('rentSortSelect'); if (sortEl) sortEl.value = 'default';
    applyRentFilters();
  }

  function setRentSorting(val) {
    rentSort = val;
    applyRentFilters();
  }

  function setRentView(mode) {
    const grid = document.getElementById('rentGrid');
    if (!grid) return;
    grid.classList.toggle('view-list', mode === 'list');
    document.querySelectorAll('#rent .lrh-view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === mode));
  }

  function openRentFilterSheet() {
    document.getElementById('rentSidebar')?.classList.add('open');
    document.getElementById('rentSidebarOverlay')?.classList.add('open');
  }
  function closeRentFilterSheet() {
    document.getElementById('rentSidebar')?.classList.remove('open');
    document.getElementById('rentSidebarOverlay')?.classList.remove('open');
  }

  document.querySelectorAll('#rentSidebar .filter-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.rftoggle;
      btn.classList.toggle('active');
      const i = rentActiveToggles.indexOf(f);
      if (btn.classList.contains('active')) { if (i === -1) rentActiveToggles.push(f); }
      else if (i > -1) rentActiveToggles.splice(i, 1);
      applyRentFilters();
    });
  });
  ['rfDistrict', 'rfRooms', 'rfMinTerm'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyRentFilters);
  });

  // Real listing detail modal — every card on this page is now a real `listings` entry
  // (no separate thinner detail view needed, unlike the old fake-data rentListings system).
  function openRentDetail(id) {
    if (typeof id === 'string' && id.charAt(0) === 'u') id = parseInt(id.slice(1), 10);
    if (typeof openListing === 'function') openListing(id);
  }
