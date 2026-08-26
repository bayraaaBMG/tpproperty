  // ===== RENDER LISTINGS =====
  function renderListings(items) {
    const grid = document.getElementById('listingsGrid');
    if (items.length === 0) {
      grid.innerHTML = buyerEmptyState({
        icon: BUYER_EMPTY_ICON_SEARCH,
        title: 'Тохирох зар олдсонгүй',
        sub: 'Шүүлтүүрийн нөхцөлийг өөрчлөх эсвэл хайлтыг цэвэрлэж дахин оролдоно уу.',
        resetLabel: 'Шүүлтүүр цэвэрлэх',
        resetOnclick: 'resetFilters()'
      });
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

