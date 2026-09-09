  // ===== LISTINGS DATA =====
  let favorites = (function() {
    try { return JSON.parse(localStorage.getItem('bairxFavorites') || '[]'); } catch(e) { return []; }
  })();
  // Starts empty: the 20 hardcoded demo/sample listings that used to seed this array have
  // been removed. Everything in here now comes from real sources — user listings restored
  // from localStorage just below, and active listings loaded from Firestore further down.
  const listings = [];

  // Load any user-submitted listings from localStorage
  (function() {
    try {
      var saved = JSON.parse(localStorage.getItem('bairxUserListings') || '[]');
      saved.forEach(function(l) {
        if (!listings.find(function(x) { return x.id === l.id; })) {
          listings.push(l);
          if (l._gallery && l._gallery.length > 0) {
            listingExtras[l.id] = { coords: { x: 50, y: 50 }, gallery: l._gallery };
          }
        }
      });
    } catch(e) {}

    // Restore boost (vip) badges from localStorage
    try {
      var boosted = JSON.parse(localStorage.getItem('bairxBoostedListings') || '[]');
      boosted.forEach(function(id) {
        var l = listings.find(function(x) { return x.id === id; });
        if (l && !l.badges.includes('vip')) l.badges.push('vip');
      });
    } catch(e) {}

    // Restore seller data for user listings from localStorage
    try {
      var sellerSaved = JSON.parse(localStorage.getItem('bairxSellerData') || '{}');
      Object.keys(sellerSaved).forEach(function(id) {
        sellerData[parseInt(id, 10)] = sellerSaved[id];
      });
    } catch(e) {}
  })();

  // ===== PUBLIC LISTINGS FROM FIRESTORE =====
  // Everyone (logged in or not) needs to see every active real listing, not just their own —
  // this is what actually makes user-submitted listings visible across devices/accounts.
  // Paginated via limit()/startAfter() on the query's default (document-ID) ordering — no
  // .orderBy() on a separate field, since that would need a composite Firestore index that
  // isn't deployed anywhere in this repo (firestore.indexes.json doesn't exist); adding one
  // blind would 500 the live query until someone manually created it in the console.
  const PUBLIC_LISTINGS_PAGE_SIZE = 60;
  let _publicListingsCursor = null;
  let _publicListingsExhausted = false;
  async function loadPublicListings(loadMore) {
    if (loadMore && _publicListingsExhausted) return;
    try {
      let q = db.collection('listings').where('status', '==', 'active').limit(PUBLIC_LISTINGS_PAGE_SIZE);
      if (loadMore && _publicListingsCursor) q = q.startAfter(_publicListingsCursor);
      const snap = await q.get();
      if (snap.docs.length > 0) _publicListingsCursor = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < PUBLIC_LISTINGS_PAGE_SIZE) _publicListingsExhausted = true;
      let added = false;
      snap.forEach(doc => {
        if (listings.some(l => l.firestoreId === doc.id)) return;
        const d = doc.data();
        const numId = listings.reduce((m, l) => l.id > m ? l.id : m, 0) + 1;
        const feats = d.features || [];
        const entry = {
          id: numId, firestoreId: doc.id, ownerId: d.ownerId, sellerVerified: !!d.sellerVerified,
          phoneVerified: !!d.phoneVerified, listingVerified: !!d.listingVerified, reportCount: d.reportCount || 0,
          cat: d.category || 'apartment', propertyType: d.propertyType || d.category || 'apartment',
          title: d.title, loc: d.loc, district: d.district,
          khoroo: d.khoroo || null,
          geoLat: d.geoLat || null, geoLng: d.geoLng || null,
          price: d.price, area: d.area, rooms: d.rooms, floor: d.floor, year: d.year,
          bedrooms: d.bedrooms || null, bathrooms: d.bathrooms || null,
          buildingName: d.buildingName || '', complex: d.complex || '',
          buildingType: d.buildingType || '', insulation: d.insulation || '', windowDirection: d.windowDirection || '',
          hoaFee: d.hoaFee || null, heating: d.heating || '',
          parking: feats.includes('parking') ? 'Паркинг бий' : '', elevator: feats.includes('elevator') ? 'Лифттэй' : '',
          balcony: feats.includes('balcony') ? 'Тагттай' : '', basement: feats.includes('basement') ? 'Зоорьтой' : '',
          furniture: feats.includes('furnished') ? 'Тавилгатай' : '',
          landArea: d.landArea || null, usageType: d.usageType || '', barterOk: !!d.barterOk,
          deposit: d.deposit || null, minTerm: d.minTerm || '',
          condition: d.condition || '', features: feats,
          // Legal/ownership detail shown on the listing detail page and (legalNotes) in the
          // rent card's "Барьцаа" strip. Previously never carried across from the document,
          // so these sections were always blank for Firestore-loaded listings.
          legalNotes: d.legalNotes || '', ownership: d.ownership || '',
          cadastre: d.cadastre || '', collateral: d.collateral || '', taxDebt: d.taxDebt || '',
          paymentTerms: d.paymentTerms || [], constructionProgress: d.constructionProgress || '',
          description: d.description || '',
          videoUrl: d.videoUrl || '', tourUrl: d.tourUrl || '', floorPlan: d.floorPlan || null,
          img: (d.images && d.images[0]) || d.img || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
          tag: d.tag || { type: 'new', text: 'Шинэ зар' }, badges: d.badges || ['new', 'user'],
          loanType: d.loanType || 'Тохиролцоно', monthly: d.monthly || 0,
          // Read from the document rather than hardcoded, so seeded demo listings
          // (isDemo:true, userSubmitted:false — see scripts/seed-demo-listings.js) keep
          // their DEMO badge and stay behind the `if (l.isDemo)` guards, e.g. the one
          // that blocks starting a chat with a seller account that doesn't exist.
          userSubmitted: d.userSubmitted !== false, isDemo: !!d.isDemo,
          // This query already only fetches status=='active' docs, so _inactive is false in
          // practice — kept as a real status check (not a hardcoded false) so this stays
          // correct if the query is ever loosened.
          status: d.status || 'active', rejectionReason: d.rejectionReason || '',
          _inactive: (d.status || 'active') !== 'active',
          viewCount: d.viewCount || 0, favoriteCount: d.favoriteCount || 0, contactCount: d.contactCount || 0,
          expiresAt: d.expiresAt || null, _bumpedAt: d.bumpedAt || numId,
          _createdAtMs: d.createdAt?.toMillis?.() || 0,
          _updatedAtMs: d.updatedAt?.toMillis?.() || 0,
          _lastRefreshedAtMs: d.lastRefreshedAt?.toMillis?.() || 0
        };
        listings.push(entry);
        if (d.images && d.images.length > 1) listingExtras[numId] = { coords: { x: 50, y: 50 }, gallery: d.images };
        sellerData[numId] = { phone: d.sellerPhone || '', name: d.sellerName || 'Хэрэглэгч', type: d.sellerType || 'Хувь хүн', company: d.sellerCompany || '', email: d.sellerEmail || '', photoURL: d.sellerPhotoURL || '' };
        added = true;
      });
      if (added) {
        if (typeof checkExpiredListings === 'function') checkExpiredListings();
        renderHomeListings(); renderListings(getFilteredListings()); updateCatPillCounts();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof checkNotificationTriggers === 'function') checkNotificationTriggers();
      }
      const loadMoreWrap = document.getElementById('loadMoreListingsWrap');
      if (loadMoreWrap) loadMoreWrap.style.display = _publicListingsExhausted ? 'none' : 'block';
    } catch(e) {}
  }

  async function loadMorePublicListings() {
    const btn = document.getElementById('loadMoreListingsBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ачааллаж байна…'; }
    await loadPublicListings(true);
    if (btn) { btn.disabled = false; btn.textContent = 'Цааш үзэх'; }
  }
