  // ===== RENDER LISTINGS =====
  function renderListings(items) {
    const grid = document.getElementById('listingsGrid');
    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:72px 24px;color:var(--ink-3);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:18px;opacity:0.3;"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px;">Тохирох зар олдсонгүй</div>
        <div style="font-size:14px;max-width:340px;margin:0 auto 24px;">Шүүлтүүрийн нөхцөлийг өөрчлөх эсвэл хайлтыг цэвэрлэж дахин оролдоно уу.</div>
        <button class="btn btn-blue" onclick="resetFilters()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Шүүлтүүр цэвэрлэх
        </button>
      </div>`;
      return;
    }
    grid.innerHTML = items.map(l => listingCardHtml(l, { fullFeatures: true })).join('');
  }

  // Grid/list view toggle for the Listings page's browse grid (results header).
  function setListingsView(mode) {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.classList.toggle('view-list', mode === 'list');
    document.querySelectorAll('.lrh-view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === mode));
  }

