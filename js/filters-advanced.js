  // ===== ADVANCED FILTER =====
  let activeFilterToggles = [];

  // Дүүрэг/үнэ/өрөө show by default; хороо, хотхон, талбай, он, давхар, газрын
  // зураг, quick-filter chips stay behind this toggle so the panel reads as a
  // quick search first rather than a wall of fields (unegui.mn-style progressive
  // disclosure, not a copy of its layout).
  function toggleAdvancedFilters() {
    const panel = document.getElementById('advancedFilterFields');
    const btn = document.getElementById('advancedFilterToggleBtn');
    if (!panel || !btn) return;
    const opening = panel.style.display === 'none';
    panel.style.display = opening ? 'flex' : 'none';
    btn.classList.toggle('open', opening);
    const label = btn.querySelector('span');
    if (label) label.textContent = opening ? 'Нэмэлт шүүлтүүрийг хураах' : 'Нэмэлт шүүлтүүр';
  }

  // Called after any code path that can set an advanced-only field programmatically
  // (e.g. applying a saved search) so a filter someone set doesn't stay invisible
  // behind the collapsed toggle.
  function expandAdvancedFiltersIfActive() {
    const ids = ['fKhoroo', 'fComplex', 'fAreaMin', 'fAreaMax', 'fYearMin', 'fYearMax', 'fFloorMin', 'fFloorMax'];
    const hasActive = ids.some(id => document.getElementById(id)?.value) || activeFilterToggles.length > 0 || (areaFilter && areaFilter.lat);
    const panel = document.getElementById('advancedFilterFields');
    if (hasActive && panel && panel.style.display === 'none') toggleAdvancedFilters();
  }

  // ===== RADIUS / AREA SEARCH (real Leaflet/OpenStreetMap, no API key) =====
  let areaFilter = null; // { lat, lng, km } once the user has placed a pin + picked a radius
  let radiusMap = null;
  let radiusMarker = null;
  let radiusCircle = null;

  function toggleAreaFilterMap() {
    const wrap = document.getElementById('radiusMapWrap');
    const btn = document.getElementById('areaFilterToggleBtn');
    const opening = wrap.style.display === 'none';
    wrap.style.display = opening ? 'block' : 'none';
    if (btn) btn.style.display = opening ? 'none' : '';
    if (opening && !radiusMap && typeof L !== 'undefined') {
      const start = (areaFilter && areaFilter.lat) ? [areaFilter.lat, areaFilter.lng] : (typeof UB_CENTER !== 'undefined' ? UB_CENTER : [47.9184, 106.9177]);
      radiusMap = L.map('radiusMap').setView(start, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      }).addTo(radiusMap);
      radiusMap.on('click', (e) => setAreaFilterCenter(e.latlng.lat, e.latlng.lng));
      if (areaFilter && areaFilter.lat) setAreaFilterCenter(areaFilter.lat, areaFilter.lng, true);
    } else if (opening && radiusMap) {
      setTimeout(() => radiusMap.invalidateSize(), 50);
    }
  }

  function setAreaFilterCenter(lat, lng, skipApply) {
    if (!areaFilter) areaFilter = { lat: null, lng: null, km: null };
    areaFilter.lat = lat; areaFilter.lng = lng;
    if (radiusMarker) radiusMarker.setLatLng([lat, lng]);
    else radiusMarker = L.marker([lat, lng], { draggable: true }).addTo(radiusMap).on('dragend', (e) => {
      const p = e.target.getLatLng();
      setAreaFilterCenter(p.lat, p.lng);
    });
    drawRadiusCircle();
    if (!skipApply && areaFilter.km) applyFilters();
  }

  function drawRadiusCircle() {
    if (radiusCircle) { radiusMap.removeLayer(radiusCircle); radiusCircle = null; }
    if (areaFilter && areaFilter.lat && areaFilter.km) {
      radiusCircle = L.circle([areaFilter.lat, areaFilter.lng], {
        radius: areaFilter.km * 1000, color: '#1E5BFF', fillColor: '#1E5BFF', fillOpacity: 0.08, weight: 1.5
      }).addTo(radiusMap);
      radiusMap.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
    }
  }

  document.querySelectorAll('.radius-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!areaFilter || !areaFilter.lat) { showToast('Эхлээд газрын зураг дээр цэг сонгоно уу'); return; }
      const km = parseInt(btn.dataset.radius, 10);
      document.querySelectorAll('.radius-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      areaFilter.km = km;
      drawRadiusCircle();
      applyFilters();
    });
  });

  function clearAreaFilter() {
    areaFilter = null;
    document.querySelectorAll('.radius-toggle').forEach(b => b.classList.remove('active'));
    if (radiusCircle && radiusMap) { radiusMap.removeLayer(radiusCircle); radiusCircle = null; }
    if (radiusMarker && radiusMap) { radiusMap.removeLayer(radiusMarker); radiusMarker = null; }
    applyFilters();
  }

  document.querySelectorAll('.filter-toggle:not(.radius-toggle)').forEach(t => {
    t.addEventListener('click', () => {
      t.classList.toggle('active');
      const f = t.dataset.ftoggle;
      if (t.classList.contains('active')) {
        if (!activeFilterToggles.includes(f)) activeFilterToggles.push(f);
      } else {
        activeFilterToggles = activeFilterToggles.filter(x => x !== f);
      }
      updateFilterCount();
    });
  });

  function getFilteredListings() {
    let results = listings.filter(l => !l._inactive);
    const district = document.getElementById('fDistrict')?.value || 'all';
    const khoroo = parseInt(document.getElementById('fKhoroo')?.value) || 0;
    const complexQuery = (document.getElementById('fComplex')?.value || '').trim().toLowerCase();
    const priceMin = parseFloat(document.getElementById('fPriceMin')?.value) || 0;
    const priceMax = parseFloat(document.getElementById('fPriceMax')?.value) || Infinity;
    const areaMin = parseFloat(document.getElementById('fAreaMin')?.value) || 0;
    const areaMax = parseFloat(document.getElementById('fAreaMax')?.value) || Infinity;
    const rooms = document.getElementById('fRooms')?.value || 'all';
    const yearMin = parseInt(document.getElementById('fYearMin')?.value) || 0;
    const yearMax = parseInt(document.getElementById('fYearMax')?.value) || 9999;
    const floorMin = parseInt(document.getElementById('fFloorMin')?.value) || 0;
    const floorMax = parseInt(document.getElementById('fFloorMax')?.value) || 9999;
    const q = (searchText || (document.getElementById('fSearch')?.value) || '').trim().toLowerCase();

    if (q) {
      results = results.filter(l => {
        const catMap = { apartment: 'орон сууц байр', house: 'хаус хувийн', land: 'газар', office: 'оффис', rent: 'түрээс' };
        const haystack = [l.title, l.loc, l.district, catMap[l.cat] || l.cat, String(l.rooms), String(l.price), l.description || ''].join(' ').toLowerCase();
        return q.split(/\s+/).every(word => haystack.includes(word));
      });
    }

    if (district !== 'all') results = results.filter(l => l.district === district);
    if (khoroo > 0) results = results.filter(l => l.khoroo === khoroo);
    if (complexQuery) results = results.filter(l => (l.complex || '').toLowerCase().includes(complexQuery));
    if (areaFilter && areaFilter.lat && areaFilter.km) {
      results = results.filter(l => {
        const pos = (l.geoLat && l.geoLng) ? [l.geoLat, l.geoLng] : (typeof approxListingLatLng === 'function' ? approxListingLatLng(l) : null);
        return pos && haversineKm(areaFilter.lat, areaFilter.lng, pos[0], pos[1]) <= areaFilter.km;
      });
    }
    results = results.filter(l => l.cat === 'rent' || (l.price >= priceMin && l.price <= priceMax));
    results = results.filter(l => l.area >= areaMin && l.area <= areaMax);
    if (rooms !== 'all') {
      const r = parseInt(rooms);
      results = results.filter(l => typeof l.rooms === 'number' && (r === 4 ? l.rooms >= 4 : l.rooms === r));
    }
    // Home hero's advanced panel — the field lives in the header, which stays in the
    // DOM across every page in this single-page app, so it's safe to read here too.
    // l.buildingType holds free-text labels ("Цутгамал төмөр бетон, газар хөдлөлтийн...",
    // "Хийц өрлөгийн (AAC блок)"), not the select's short codes, so match by keyword
    // the same way other free-text fields (condition, parking) are matched below.
    const buildingType = document.getElementById('hSearchBuildingType')?.value || '';
    const buildingTypeKeywords = {
      'reinforced-concrete': 'цутгамал', 'brick': 'блок', 'panel': 'панель', 'frame': 'каркас', 'wooden': 'модон'
    };
    if (buildingType && buildingTypeKeywords[buildingType]) {
      const kw = buildingTypeKeywords[buildingType];
      results = results.filter(l => (l.buildingType || '').toLowerCase().includes(kw));
    }
    // Year filter
    if (yearMin > 0 || yearMax < 9999) {
      results = results.filter(l => !l.year || (l.year >= yearMin && l.year <= yearMax));
    }
    // Floor filter (extract floor number from floor string like "8/16")
    if (floorMin > 0 || floorMax < 9999) {
      results = results.filter(l => {
        const f = parseInt(String(l.floor).split('/')[0]);
        return isNaN(f) || (f >= floorMin && f <= floorMax);
      });
    }
    // Toggles
    if (activeFilterToggles.includes('new')) results = results.filter(l => l.badges.includes('new'));
    // Verification has one source of truth: sellerVerified (real Firebase email
    // verification) or listingVerified (real admin approval) — never the legacy
    // badges:['verified'] metadata some demo listings still carry, which isn't backed by
    // any real verification and would otherwise let demo listings match this filter.
    if (activeFilterToggles.includes('verified')) results = results.filter(l => l.sellerVerified === true || l.listingVerified === true);
    if (activeFilterToggles.includes('below')) results = results.filter(l => l.tag && l.tag.type === 'below');
    if (activeFilterToggles.includes('loan')) results = results.filter(l => l.loanType && !l.loanType.includes('Бэлэн'));
    if (activeFilterToggles.includes('parking')) results = results.filter(l =>
      (l.parking && !l.parking.includes('Байхгүй') && !l.parking.includes('Хамаарахгүй')) ||
      (Array.isArray(l.features) && l.features.includes('parking'))
    );
    if (activeFilterToggles.includes('furnished')) results = results.filter(l =>
      (l.condition && l.condition.toLowerCase().includes('тавилга')) ||
      (Array.isArray(l.features) && l.features.some(f => f === 'furnished' || (typeof f === 'string' && f.toLowerCase().includes('тавилга'))))
    );
    if (activeFilterToggles.includes('vip')) results = results.filter(l => l.badges && l.badges.includes('vip'));
    if (activeFilterToggles.includes('renovated')) results = results.filter(l => l.condition && (l.condition.includes('засвартай') || l.condition.includes('Premium')));
    // Real intent flag set at submission (my-listings.js) — never true for older
    // listings that predate this field, correctly excluding them rather than guessing.
    if (activeFilterToggles.includes('barter')) results = results.filter(l => l.barterOk === true);
    if (activeFilterToggles.includes('withphoto')) results = results.filter(l =>
      (Array.isArray(l.images) && l.images.length > 0) ||
      (Array.isArray(l._gallery) && l._gallery.length > 0) ||
      (l.img && l.img.startsWith('http'))
    );

    // Category filter still applies
    if (currentCat !== 'all') results = results.filter(l => l.cat === currentCat);

    // Apply sort
    if (currentSort === 'price-asc') results.sort((a, b) => a.price - b.price);
    else if (currentSort === 'price-desc') results.sort((a, b) => b.price - a.price);
    else if (currentSort === 'area-desc') results.sort((a, b) => b.area - a.area);
    else if (currentSort === 'vip-first') results.sort((a, b) => {
      const av = a.badges && a.badges.includes('vip') ? 1 : 0;
      const bv = b.badges && b.badges.includes('vip') ? 1 : 0;
      return bv - av || b.id - a.id;
    });
    else if (currentSort === 'date-asc') results.sort((a, b) => a.id - b.id);
    // Default: VIP/Featured-plan listings first (the plan's actual promised benefit),
    // newest/bumped first within each tier.
    else results.sort((a, b) => {
      const av = a.badges && a.badges.includes('vip') ? 1 : 0;
      const bv = b.badges && b.badges.includes('vip') ? 1 : 0;
      return (bv - av) || ((b._bumpedAt || b.id) - (a._bumpedAt || a.id));
    });

    return results;
  }

  function setSorting(val) {
    currentSort = val;
    applyListingFilter();
  }

  function updateFilterCount() {
    const count = getFilteredListings().length;
    const total = listings.filter(l => !l._inactive).length;
    const el = document.getElementById('filterCount');
    if (el) el.textContent = count;
    const totalEl = document.getElementById('filterTotalCount');
    if (totalEl) totalEl.textContent = total;

    // The "view all" link only makes sense (and is only shown) once an active filter has
    // actually narrowed the grid below the full active-listing count — otherwise there's
    // nothing left to "view all" of.
    const viewAllWrap = document.getElementById('viewAllWrap');
    const totalListingCountEl = document.getElementById('totalListingCount');
    if (totalListingCountEl) totalListingCountEl.textContent = total;
    if (viewAllWrap) viewAllWrap.style.display = (count < total) ? 'block' : 'none';
  }

  function updateCatPillCounts() {
    ['all', 'apartment', 'house', 'land', 'office', 'rent'].forEach(function(cat) {
      const el = document.getElementById('cnt-' + cat);
      if (el) el.textContent = cat === 'all' ? listings.length : listings.filter(function(l) { return l.cat === cat; }).length;
    });
    const tlc = document.getElementById('totalListingCount');
    if (tlc) tlc.textContent = listings.length;
  }

  function applyFilters() {
    const results = getFilteredListings();
    renderListings(results);
    renderFilterTags();
    updateFilterCount();
    if (mapViewOn) renderMiniMap(results);
    showToast(`${results.length} зар олдлоо`, 'success');
  }

  function searchByDistrict(district) {
    if (document.getElementById('fDistrict')) document.getElementById('fDistrict').value = district;
    // Reset category to all
    currentCat = 'all';
    document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === 'all'));
    const results = getFilteredListings();
    renderListings(results);
    updateFilterCount();
    scrollToSection('listings');
    showToast(`${results.length} зар олдлоо`, 'success');
  }

  function resetFilters() {
    ['fDistrict'].forEach(id => { const el=document.getElementById(id); if(el)el.value='all'; });
    ['fRooms'].forEach(id => { const el=document.getElementById(id); if(el)el.value='all'; });
    ['fPriceMin','fPriceMax','fAreaMin','fAreaMax','fYearMin','fYearMax','fFloorMin','fFloorMax','fKhoroo','fComplex'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
    const fSearch = document.getElementById('fSearch');
    if (fSearch) fSearch.value = '';
    searchText = '';
    document.querySelectorAll('.filter-toggle').forEach(t => t.classList.remove('active'));
    activeFilterToggles = [];
    areaFilter = null;
    if (radiusCircle && radiusMap) { radiusMap.removeLayer(radiusCircle); radiusCircle = null; }
    if (radiusMarker && radiusMap) { radiusMap.removeLayer(radiusMarker); radiusMarker = null; }
    currentCat = 'all';
    document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === 'all'));
    const sel = document.getElementById('sortSelect');
    if (sel) sel.value = 'default';
    currentSort = 'default';
    renderListings(getFilteredListings());
    renderFilterTags();
    updateFilterCount();
    showToast('Шүүлтүүр цэвэрлэгдлээ');
  }

