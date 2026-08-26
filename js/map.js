  // ===== MAP VIEW (real Leaflet/OpenStreetMap) =====
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
      renderMiniMap(getFilteredListings());
    } else {
      mapView.style.display = 'none';
      if (label) label.textContent = 'Газрын зураг дээр харах';
      if (icon) icon.innerHTML = '<path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"/>';
      if (btn) { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
    }
  }

  let browseMap = null;
  let browseMapMarkers = [];

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

  function renderMiniMap(items) {
    const el = document.getElementById('miniMap');
    if (!el || typeof L === 'undefined') return;

    if (!browseMap) {
      browseMap = L.map('miniMap').setView((typeof UB_CENTER !== 'undefined' ? UB_CENTER : [47.9184, 106.9177]), 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      }).addTo(browseMap);
    }

    browseMapMarkers.forEach(m => browseMap.removeLayer(m));
    browseMapMarkers = [];

    const bounds = [];
    items.forEach(l => {
      const pos = approxListingLatLng(l);
      bounds.push(pos);
      const priceLabel = l.price >= 1000 ? (l.price / 1000).toFixed(1) + 'тэр' : l.price + 'сая';
      const icon = L.divIcon({
        className: '',
        html: `<div style="transform:translate(-50%,-100%); cursor:pointer;"><div class="map-pin-marker">${priceLabel}</div></div>`,
        iconSize: null, iconAnchor: [0, 0]
      });
      const marker = L.marker(pos, { icon }).addTo(browseMap);
      marker.on('click', () => openListing(l.id));
      browseMapMarkers.push(marker);
    });

    setTimeout(() => {
      browseMap.invalidateSize();
      if (bounds.length > 0) browseMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }, 50);
  }
