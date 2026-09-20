  // ===== MAP VIEW (real Leaflet/OpenStreetMap) =====
  // The public "Газрын зургаар хайх" entry (footer) and the Listings page's own map toggle
  // both drive ONE real map here — markers come only from the already-loaded, filtered,
  // public active listings[], plotted at their saved geoLat/geoLng (or a district-centre
  // approximation). No Google key, no build step, no fake data: it reuses the site's existing
  // Leaflet stack + coordinate schema. Clicking a pin opens a safe preview card whose
  // "Дэлгэрэнгүй" button calls the existing openListing() detail — no duplicate detail system.
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
  let _mapItems = [];              // last full set handed to the map (for "search this area")
  let _mapProgrammaticMove = false; // true while WE move the map (fitBounds), so moveend ignores it
  let _mapMoveWired = false;

  // Listings without a real saved pin fall back to their district's approximate center,
  // nudged by a small deterministic offset (seeded from the listing id) so several
  // listings in the same district don't render as one stacked pin.
  function approxListingLatLng(l) {
    if (l.geoLat && l.geoLng) return [l.geoLat, l.geoLng];
    const center = (typeof DISTRICT_CENTERS !== 'undefined' && DISTRICT_CENTERS[l.district]) || (typeof UB_CENTER !== 'undefined' ? UB_CENTER : [47.9184, 106.9177]);
    const seed = l.id * 9301 % 1000 / 1000;
    const angle = seed * Math.PI * 2;
    const dist = 0.004 + (seed * 0.008);
    return [center[0] + Math.cos(angle) * dist, center[1] + Math.sin(angle) * dist];
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

  // Plot markers for `items`. opts.fit -> fitBounds to all of them (initial render / filter
  // change). "Search this area" calls with fit:false so the user's current view is kept.
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

    browseMapMarkers.forEach(m => browseMap.removeLayer(m));
    browseMapMarkers = [];

    const bounds = [];
    (items || []).forEach(l => {
      const pos = approxListingLatLng(l);
      bounds.push(pos);
      const priceLabel = l.price >= 1000 ? (l.price / 1000).toFixed(1) + 'тэр' : l.price + 'сая';
      const icon = L.divIcon({
        className: '',
        html: `<div style="transform:translate(-50%,-100%); cursor:pointer;"><div class="map-pin-marker">${esc(priceLabel)}</div></div>`,
        iconSize: null, iconAnchor: [0, 0]
      });
      const marker = L.marker(pos, { icon }).addTo(browseMap);
      marker.bindPopup(buildMapPreviewCard(l), { minWidth: 210, maxWidth: 240, closeButton: true, autoPan: true });
      browseMapMarkers.push(marker);
    });

    // Result count + empty state.
    const badge = document.getElementById('mapCountBadge');
    if (badge) { badge.textContent = (items ? items.length : 0) + ' зар'; badge.hidden = !(items && items.length); }
    const emptyEl = document.getElementById('mapEmptyOverlay');
    if (emptyEl) emptyEl.hidden = !!(items && items.length);

    setTimeout(() => {
      browseMap.invalidateSize();
      if (opts.fit && bounds.length > 0) {
        _mapProgrammaticMove = true;
        browseMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }, 50);
  }

  // "Энэ хэсэгт хайх" — keep only the listings whose pin is inside the current viewport,
  // without re-fitting the map (so the user stays where they panned). Pure client-side over
  // the already-loaded set — no extra Firestore read or geospatial index needed.
  function mapSearchThisArea() {
    if (!browseMap) return;
    const b = browseMap.getBounds();
    const inView = _mapItems.filter(l => b.contains(approxListingLatLng(l)));
    renderMapMarkers(inView, { fit: false });
    const btn = document.getElementById('mapSearchAreaBtn'); if (btn) btn.hidden = true;
  }
