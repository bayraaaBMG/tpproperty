  // ===== MAP VIEW (real Leaflet/OpenStreetMap) =====
  // The public "Газрын зургаар хайх" entry (footer) and the Listings page's own map toggle
  // both drive ONE real map here. Markers come only from the already-loaded, filtered,
  // public active listings[], and — per the exact-location rule — ONLY for listings that
  // carry a real saved geoLat/geoLng. Listings with no saved pin are left off the map (no
  // district-centre guess, no fake coordinates); they still appear in the list below.
  // No Google key, no build step, no fake data: it reuses the site's existing Leaflet stack
  // + coordinate schema. Clicking a pin opens a safe preview card whose "Дэлгэрэнгүй" button
  // calls the existing openListing() detail — no duplicate detail system. The list and the
  // map share one state (_mapMarkerById), so hovering a card highlights its pin and clicking
  // a pin highlights + scrolls to its card.
  let mapViewOn = false;
  function toggleMapView() {
    mapViewOn = !mapViewOn;
    const mapView = document.getElementById('mapView');
    const label = document.getElementById('mapToggleLabel');
    const icon = document.getElementById('mapToggleIcon');
    const btn = document.getElementById('mapToggleBtn');
    if (mapViewOn) {
      mapView.style.display = 'block';
      if (label) label.textContent = 'Жагсаалтаар харах';
      if (icon) icon.innerHTML = '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>';
      if (btn) { btn.style.background = 'var(--primary)'; btn.style.color = 'white'; btn.style.borderColor = 'var(--primary)'; }
      renderMiniMap(typeof getFilteredListings === 'function' ? getFilteredListings() : listings.filter(l => !l._inactive));
    } else {
      mapView.style.display = 'none';
      if (label) label.textContent = 'Газрын зураг дээр харах';
      if (icon) icon.innerHTML = '<path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"/>';
      if (btn) { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
    }
  }

  // Public "Газрын зураг" entry point: close any modal, go to the Listings page and turn the
  // real map on (so the full filter sidebar + list/map toggle come with it).
  function openMapSearch() {
    if (typeof closeModal === 'function') closeModal();
    if (typeof showPage === 'function') showPage('listings');
    setTimeout(() => {
      if (!mapViewOn) { if (typeof toggleMapView === 'function') toggleMapView(); }
      else { renderMiniMap(typeof getFilteredListings === 'function' ? getFilteredListings() : listings.filter(l => !l._inactive)); }
    }, 200);
  }

  let browseMap = null;
  let browseMapMarkers = [];
  let _mapMarkerById = {};          // listing id -> Leaflet marker (single shared list<->map state)
  let _mapSelectedId = null;        // currently highlighted listing id
  let _mapItems = [];               // last full set handed to the map (for "search this area")
  let _mapProgrammaticMove = false; // true while WE move the map (fitBounds), so moveend ignores it
  let _mapMoveWired = false;
  let _mapListWired = false;
  let _mapMeMarker = null;          // "my location" marker (never persisted)

  // Exact-location rule: a listing is placed on the map ONLY when it has a real, finite
  // saved coordinate pair. Missing / null coordinates -> no marker (never a guessed one).
  function hasGeo(l) {
    return !!l && Number.isFinite(Number(l.geoLat)) && Number.isFinite(Number(l.geoLng))
      && !(Number(l.geoLat) === 0 && Number(l.geoLng) === 0);
  }
  function listingLatLng(l) { return [Number(l.geoLat), Number(l.geoLng)]; }

  // District-centre approximation is kept ONLY for the optional radius filter
  // (filters-advanced.js), never for placing public map markers.
  function approxListingLatLng(l) {
    if (hasGeo(l)) return listingLatLng(l);
    const center = (typeof DISTRICT_CENTERS !== 'undefined' && DISTRICT_CENTERS[l.district]) || (typeof UB_CENTER !== 'undefined' ? UB_CENTER : [47.9184, 106.9177]);
    const seed = l.id * 9301 % 1000 / 1000;
    const angle = seed * Math.PI * 2;
    const dist = 0.004 + (seed * 0.008);
    return [center[0] + Math.cos(angle) * dist, center[1] + Math.sin(angle) * dist];
  }

  // Compact, correctly-formatted price for a pin label: "291 сая ₮" / "1.2 тэрбум ₮".
  function mapPriceLabel(l) {
    if (typeof l.price !== 'number' || !isFinite(l.price)) return 'Үзэх';
    return fmtPrice(l.price) + (l.cat === 'rent' ? '/сар' : '');
  }

  // XSS-safe preview card (DOM APIs + textContent only — never innerHTML with listing data).
  function buildMapPreviewCard(l) {
    const card = document.createElement('div'); card.className = 'map-preview-card';
    if (l.img) {
      const wrap = document.createElement('div'); wrap.className = 'map-preview-img';
      const img = document.createElement('img'); img.src = l.img; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { const w = this.closest('.map-preview-img'); if (w) w.style.display = 'none'; };
      wrap.appendChild(img); card.appendChild(wrap);
    }
    const body = document.createElement('div'); body.className = 'map-preview-body';
    const price = document.createElement('div'); price.className = 'map-preview-price';
    price.textContent = fmtPrice(l.price) + (l.cat === 'rent' ? '/сар' : '');
    body.appendChild(price);
    const psm = pricePerSqmText(l);
    if (psm) { const s = document.createElement('div'); s.className = 'map-preview-sub'; s.textContent = psm; body.appendChild(s); }
    const title = document.createElement('div'); title.className = 'map-preview-title'; title.textContent = l.title || ''; body.appendChild(title);
    if (l.loc) { const loc = document.createElement('div'); loc.className = 'map-preview-loc'; loc.textContent = l.loc; body.appendChild(loc); }
    const bits = [];
    if (l.rooms) bits.push(l.rooms + ' өрөө');
    if (l.area) bits.push(l.area + ' м²');
    if (bits.length) { const meta = document.createElement('div'); meta.className = 'map-preview-meta'; meta.textContent = bits.join(' · '); body.appendChild(meta); }
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-blue btn-sm map-preview-btn'; btn.textContent = 'Дэлгэрэнгүй';
    btn.addEventListener('click', function () { if (typeof openListing === 'function') openListing(l.id); });
    body.appendChild(btn);
    card.appendChild(body);
    return card;
  }

  function renderMiniMap(items) {
    _mapItems = (items || []).slice();
    renderMapMarkers(_mapItems, { fit: true });
    const btn = document.getElementById('mapSearchAreaBtn'); if (btn) btn.hidden = true;
  }

  // ---- list <-> map shared highlight ----
  function _markerEl(id) { const m = _mapMarkerById[id]; return m && typeof m.getElement === 'function' ? m.getElement() : null; }
  function _setMarkerState(id, cls, on) { const el = _markerEl(id); if (!el) return; const pin = el.querySelector('.map-pin-marker') || el; pin.classList.toggle(cls, !!on); }
  function _cardEl(id) {
    const grid = document.getElementById('listingsGrid');
    return grid ? grid.querySelector('.listing-card[data-lid="' + id + '"]') : null;
  }
  // Card hover -> highlight its pin (no-op if that listing has no pin).
  function mapHoverListing(id, on) { _setMarkerState(id, 'hover', on); }
  // Pin click / selection -> highlight + scroll its card into view.
  function selectMapListing(id, opts) {
    opts = opts || {};
    if (_mapSelectedId != null && _mapSelectedId !== id) {
      _setMarkerState(_mapSelectedId, 'selected', false);
      const prev = _cardEl(_mapSelectedId); if (prev) prev.classList.remove('map-linked');
    }
    _mapSelectedId = id;
    _setMarkerState(id, 'selected', true);
    const card = _cardEl(id);
    if (card) {
      card.classList.add('map-linked');
      if (opts.scroll) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function _wireListSync() {
    if (_mapListWired) return;
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('.listing-card[data-lid]'); if (c) mapHoverListing(+c.dataset.lid, true); });
    grid.addEventListener('mouseout', e => { const c = e.target.closest && e.target.closest('.listing-card[data-lid]'); if (c) mapHoverListing(+c.dataset.lid, false); });
    _mapListWired = true;
  }

  // Plot markers for `items` (only those with a real saved pin). opts.fit -> fitBounds to
  // all plotted pins. "Search this area" calls with fit:false so the user's view is kept.
  function renderMapMarkers(items, opts) {
    const el = document.getElementById('miniMap');
    if (!el || typeof L === 'undefined') return;
    opts = opts || {};

    if (!browseMap) {
      browseMap = L.map('miniMap').setView((typeof UB_CENTER !== 'undefined' ? UB_CENTER : [47.9184, 106.9177]), 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      }).addTo(browseMap);
    }
    if (!_mapMoveWired) {
      browseMap.on('moveend', () => {
        if (_mapProgrammaticMove) { _mapProgrammaticMove = false; return; }
        const btn = document.getElementById('mapSearchAreaBtn'); if (btn) btn.hidden = false;
      });
      _mapMoveWired = true;
    }
    _wireListSync();

    browseMapMarkers.forEach(m => browseMap.removeLayer(m));
    browseMapMarkers = [];
    _mapMarkerById = {};
    _mapSelectedId = null;

    const all = items || [];
    const mapped = all.filter(hasGeo);   // exact-location rule
    const bounds = [];
    mapped.forEach(l => {
      const pos = listingLatLng(l);
      bounds.push(pos);
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin-wrap" style="transform:translate(-50%,-100%);"><div class="map-pin-marker">${esc(mapPriceLabel(l))}</div></div>`,
        iconSize: null, iconAnchor: [0, 0]
      });
      const marker = L.marker(pos, { icon }).addTo(browseMap);
      marker.bindPopup(buildMapPreviewCard(l), { minWidth: 210, maxWidth: 240, closeButton: true, autoPan: true });
      marker.on('popupopen', () => selectMapListing(l.id, { scroll: true }));
      marker.on('popupclose', () => { _setMarkerState(l.id, 'selected', false); const c = _cardEl(l.id); if (c) c.classList.remove('map-linked'); if (_mapSelectedId === l.id) _mapSelectedId = null; });
      _mapMarkerById[l.id] = marker;
      browseMapMarkers.push(marker);
    });

    // Result count reflects how many are actually on the map (real, not hardcoded).
    const badge = document.getElementById('mapCountBadge');
    if (badge) { badge.textContent = mapped.length + ' зар'; badge.hidden = !mapped.length; }

    // Empty overlay: distinguish "no listings here" from "these listings have no saved pin".
    const emptyEl = document.getElementById('mapEmptyOverlay');
    if (emptyEl) {
      if (mapped.length) { emptyEl.hidden = true; }
      else {
        emptyEl.textContent = all.length
          ? 'Эдгээр зарын байршил тэмдэглэгдээгүй тул газрын зураг дээр харагдахгүй байна.'
          : 'Энэ хэсэгт одоогоор зар байхгүй байна.';
        emptyEl.hidden = false;
      }
    }

    renderMapStats(mapped);

    setTimeout(() => {
      browseMap.invalidateSize();
      if (opts.fit && bounds.length > 0) {
        _mapProgrammaticMove = true;
        browseMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }, 50);
  }

  // Area statistics from the REAL mapped listings only. Needs a small sample to be
  // meaningful; otherwise shows "Мэдээлэл хангалтгүй".
  function renderMapStats(mapped) {
    const bar = document.getElementById('mapStatsBar');
    if (!bar) return;
    mapped = mapped || [];
    if (mapped.length < 3) {
      if (!mapped.length) { bar.hidden = true; return; }
      bar.hidden = false; bar.textContent = 'Мэдээлэл хангалтгүй';
      return;
    }
    const prices = mapped.filter(l => typeof l.price === 'number' && isFinite(l.price)).map(l => l.price);
    const perSqm = mapped.filter(l => l.cat !== 'rent' && typeof l.price === 'number' && l.area > 0).map(l => (l.price * 1000000) / l.area);
    const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
    bar.hidden = false;
    bar.textContent = '';
    const mk = (label, value) => {
      const s = document.createElement('span'); s.className = 'map-stat';
      const v = document.createElement('strong'); v.textContent = value;
      s.appendChild(v); s.appendChild(document.createTextNode(' ' + label));
      return s;
    };
    bar.appendChild(mk('зар', String(mapped.length)));
    if (prices.length) bar.appendChild(mk('дундаж', fmtPrice(Math.round(avg(prices) * 10) / 10)));
    if (perSqm.length >= 3) {
      const p = Math.round(avg(perSqm));
      bar.appendChild(mk('дундаж/м²', (typeof fmt === 'function' ? fmt(p) : p.toLocaleString()) + ' ₮'));
    }
  }

  // "Энэ хэсэгт хайх" — keep only the listings whose pin is inside the current viewport,
  // without re-fitting the map. Pure client-side over the already-loaded set (no extra
  // Firestore read). Only pinned listings can match — unpinned ones are never on the map.
  function mapSearchThisArea() {
    if (!browseMap) return;
    const b = browseMap.getBounds();
    const inView = _mapItems.filter(l => hasGeo(l) && b.contains(listingLatLng(l)));
    renderMapMarkers(inView, { fit: false });
    const btn = document.getElementById('mapSearchAreaBtn'); if (btn) btn.hidden = true;
  }

  // My location via the browser Geolocation API. Nothing is persisted — the point is dropped
  // as a transient marker and forgotten on the next re-render.
  function mapLocateMe() {
    if (!browseMap || !navigator.geolocation) {
      if (typeof showToast === 'function') showToast('Байршил тогтоох боломжгүй байна', 'error');
      return;
    }
    const btn = document.getElementById('mapLocateBtn'); if (btn) btn.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (btn) btn.classList.remove('loading');
        const ll = [pos.coords.latitude, pos.coords.longitude];
        if (_mapMeMarker) browseMap.removeLayer(_mapMeMarker);
        _mapMeMarker = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#1B2D4F', fillOpacity: 1 }).addTo(browseMap);
        _mapProgrammaticMove = true;
        browseMap.setView(ll, 14);
      },
      () => {
        if (btn) btn.classList.remove('loading');
        if (typeof showToast === 'function') showToast('Байршлын зөвшөөрөл өгөгдсөнгүй', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  // Fullscreen the map wrapper (browser Fullscreen API); Escape exits natively.
  function mapToggleFullscreen() {
    const wrap = document.querySelector('#mapView .map-view-wrap');
    if (!wrap) return;
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (wrap.requestFullscreen) {
      wrap.requestFullscreen().then(() => { setTimeout(() => browseMap && browseMap.invalidateSize(), 120); }).catch(() => {});
    } else if (typeof showToast === 'function') {
      showToast('Энэ хөтчид дэлгэц дүүрэн горим дэмжигдэхгүй', 'error');
    }
  }
  document.addEventListener('fullscreenchange', () => { if (browseMap) setTimeout(() => browseMap.invalidateSize(), 120); });
