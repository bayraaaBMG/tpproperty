  // ===== HOME SEARCH (unegui.mn-style: Ангилал/keyword/Хайх/Байршил row + shortcuts + advanced panel) =====
  // Ангилал select IS the category picker — its value is the source of truth for
  // performSearch's category, no separate tab row to keep in sync anymore.
  function performSearch() {
    const cat = document.getElementById('hSearchType')?.value || 'all';
    const district = document.getElementById('hSearchDistrict')?.value || 'all';
    const keyword = (document.getElementById('hSearchKeyword')?.value || '').trim();
    const priceMin = document.getElementById('hSearchPriceMin')?.value || '';
    const priceMax = document.getElementById('hSearchPriceMax')?.value || '';
    const areaMin = document.getElementById('hSearchAreaMin')?.value || '';
    const areaMax = document.getElementById('hSearchAreaMax')?.value || '';
    const rooms = document.getElementById('hSearchRooms')?.value || 'all';
    const floorMin = document.getElementById('hSearchFloorMin')?.value || '';
    const floorMax = document.getElementById('hSearchFloorMax')?.value || '';
    const yearMin = document.getElementById('hSearchYearMin')?.value || '';
    const yearMax = document.getElementById('hSearchYearMax')?.value || '';
    const chipFilters = Array.from(document.querySelectorAll('.home-chip-row .chip.active')).map(c => c.dataset.filter);

    // Sync onto the real Listings-page filter panel, then let getFilteredListings()
    // (filters-advanced.js) do the actual filtering — same pattern the category-tile
    // shortcuts elsewhere on the home page already use.
    currentCat = cat;
    document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === cat));

    const fDistrict = document.getElementById('fDistrict');
    if (fDistrict) fDistrict.value = district;

    searchText = keyword;
    const fSearch = document.getElementById('fSearch');
    if (fSearch) fSearch.value = keyword;

    const fPriceMin = document.getElementById('fPriceMin');
    const fPriceMax = document.getElementById('fPriceMax');
    if (fPriceMin) fPriceMin.value = priceMin;
    if (fPriceMax) fPriceMax.value = priceMax;

    const fAreaMin = document.getElementById('fAreaMin');
    const fAreaMax = document.getElementById('fAreaMax');
    if (fAreaMin) fAreaMin.value = areaMin;
    if (fAreaMax) fAreaMax.value = areaMax;

    const fRooms = document.getElementById('fRooms');
    if (fRooms) fRooms.value = rooms;

    const fFloorMin = document.getElementById('fFloorMin');
    const fFloorMax = document.getElementById('fFloorMax');
    if (fFloorMin) fFloorMin.value = floorMin;
    if (fFloorMax) fFloorMax.value = floorMax;

    const fYearMin = document.getElementById('fYearMin');
    const fYearMax = document.getElementById('fYearMax');
    if (fYearMin) fYearMin.value = yearMin;
    if (fYearMax) fYearMax.value = yearMax;

    activeFilterToggles = chipFilters;
    document.querySelectorAll('.filter-toggle').forEach(t => t.classList.toggle('active', chipFilters.includes(t.dataset.ftoggle)));

    showPage('listings');
    setTimeout(() => {
      if (typeof expandAdvancedFiltersIfActive === 'function') expandAdvancedFiltersIfActive();
      const results = getFilteredListings();
      renderListings(results);
      renderFilterTags();
      updateFilterCount();
      showToast(`${results.length} зар олдлоо`, 'success');
      scrollToSection('listings');
    }, 100);
  }

  document.querySelectorAll('.home-chip-row .chip[data-filter]').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('active'));
  });

  function toggleHomeAdvancedFilters() {
    const panel = document.getElementById('homeAdvPanel');
    const btn = document.getElementById('homeAdvToggleBtn');
    const chevron = document.getElementById('homeAdvChevron');
    if (!panel || !btn) return;
    const opening = panel.style.display === 'none';
    panel.style.display = opening ? 'flex' : 'none';
    btn.classList.toggle('open', opening);
    if (chevron) chevron.style.transform = opening ? 'rotate(180deg)' : '';
  }
