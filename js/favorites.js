  // ===== FAVORITE =====
  async function toggleFav(btn, id) {
    const l = listings.find(x => x.id === id);
    const idx = favorites.indexOf(id);
    if (idx > -1) {
      removeFavorite(id);
      showToast('Таалагдсанаас хаслаа');
    } else {
      favorites.push(id);
      // Repaint every copy of this listing's heart, not just the one clicked — the same
      // listing is routinely on screen twice (Шинээр нэмэгдсэн + Онцлох, or a card plus the
      // open detail page).
      syncFavoriteUI();
      showToast('Таалагдсан зар хадгаллаа', 'success');
      if (l) l.favoriteCount = (l.favoriteCount || 0) + 1;
      if (currentUser) {
        try {
          await db.collection('favorites').add({
            userId: currentUser.uid,
            listingId: id,
            firestoreId: l?.firestoreId || null,
            priceAtSave: l?.price ?? null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (typeof checkNotificationTriggers === 'function') checkNotificationTriggers();
        } catch(e) {}
      }
      if (l?.firestoreId) {
        db.collection('listings').doc(l.firestoreId).update({ favoriteCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
      }
    }
    afterFavoritesChanged();
  }

  // ===== SHARED FAVORITE STATE =====
  // `favorites` (data.js) is the single source of truth. Every path that changes it — the
  // card heart, the detail-page heart, the price-alert button, the Хадгалсан modal's ✕ and
  // "Бүгдийг хасах" — goes through these three, so the array, localStorage, Firestore, the
  // badge counts and every heart on screen can never disagree.

  // Removal used to exist only inside toggleFav(). removeFav()/clearAllFavs() (the modal)
  // re-implemented it as a bare array filter, which is what caused the reported bug: no
  // heart on the page was repainted, the Firestore favorites doc was never deleted (so for
  // a signed-in user auth.js restored the favorite on the next load), and favoriteCount was
  // never decremented. Local state changes synchronously; the network writes run behind it
  // so the UI never waits on them, and a failure is logged instead of swallowed.
  function removeFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx === -1) return;
    favorites.splice(idx, 1);
    const l = listings.find(x => x.id === id);
    if (l) l.favoriteCount = Math.max(0, (l.favoriteCount || 0) - 1);
    if (currentUser) {
      db.collection('favorites')
        .where('userId', '==', currentUser.uid)
        .where('listingId', '==', id).get()
        .then(q => Promise.all(q.docs.map(doc => doc.ref.delete())))
        .catch(e => console.error('removeFavorite: Firestore delete failed:', e.code, e.message));
    }
    if (l?.firestoreId) {
      db.collection('listings').doc(l.firestoreId).update({ favoriteCount: firebase.firestore.FieldValue.increment(-1) })
        .catch(e => console.error('removeFavorite: favoriteCount update failed:', e.code, e.message));
    }
  }

  // Repaints every favorite control currently in the DOM from the `favorites` array. Cheap
  // (class/attribute flips only, no re-render), so it is safe to call after any change.
  function syncFavoriteUI() {
    document.querySelectorAll('.listing-fav[data-fav-id]').forEach(b => {
      b.classList.toggle('faved', favorites.includes(Number(b.dataset.favId)));
    });
    const detailBtn = document.querySelector('#detailFavBtn[data-fav-id]');
    const detailSvg = detailBtn?.querySelector('svg');
    if (detailSvg) {
      const isFav = favorites.includes(Number(detailBtn.dataset.favId));
      detailSvg.setAttribute('fill', isFav ? '#FF4757' : 'none');
      detailSvg.setAttribute('stroke', isFav ? '#FF4757' : 'currentColor');
    }
    document.querySelectorAll('.price-alert-btn[data-fav-id]').forEach(b => {
      const isFav = favorites.includes(Number(b.dataset.favId));
      if (b.classList.contains('active') === isFav) return;
      b.classList.toggle('active', isFav);
      b.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>${isFav ? 'Үнийн мэдэгдэл идэвхтэй' : 'Үнэ буувал мэдэгд'}`;
    });
  }

  function afterFavoritesChanged() {
    try { localStorage.setItem('bairxFavorites', JSON.stringify(favorites)); } catch(e) {}
    updateFavCount();
    syncFavoriteUI();
    if (typeof renderDashboard === 'function') renderDashboard();
  }

  function updateFavCount() {
    const badge = document.getElementById('favCount');
    if (badge) {
      if (favorites.length > 0) { badge.textContent = favorites.length; badge.style.display = 'grid'; }
      else badge.style.display = 'none';
    }
    const mbnBadge = document.getElementById('mbnFavCount');
    if (mbnBadge) {
      if (favorites.length > 0) { mbnBadge.textContent = favorites.length; mbnBadge.style.display = 'flex'; }
      else mbnBadge.style.display = 'none';
    }
    if (typeof renderAccountSidebar === 'function') renderAccountSidebar();
  }

  function openFavorites() {
    if (favorites.length === 0) {
      document.getElementById('modalContent').innerHTML = `
        <button class="modal-close" onclick="closeModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div style="padding:48px 32px; text-align:center;">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" stroke-width="1.5" style="margin:0 auto 16px; opacity:0.4;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
          <div style="font-family:'Fraunces',serif; font-size:22px; font-weight:700; margin-bottom:8px;">Хадгалсан зар алга</div>
          <div style="color:var(--ink-3); font-size:14px; max-width:340px; margin:0 auto;">Зар дээрх зүрхэн товчийг дарж дуртай байруудаа хадгалаарай. Дараа нь нэг дороос харьцуулж үзэх боломжтой.</div>
          <button class="btn btn-blue btn-lg" style="margin-top:24px;" onclick="closeModal(); scrollToSection('listings');">Зар үзэх</button>
        </div>
      `;
      document.getElementById('modal').classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }
    const favListings = favorites.map(id => listings.find(l => l.id === id)).filter(Boolean);
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span class="al-eyebrow">Миний хадгалсан</span>
          <button onclick="clearAllFavs()" style="background:none;border:none;font-size:12px;color:var(--danger);cursor:pointer;font-weight:600;">Бүгдийг хасах</button>
        </div>
        <div class="al-title" style="margin-bottom:20px;">${favListings.length} таалагдсан зар</div>
        <div style="display:grid; gap:14px;">
          ${favListings.map(l => `
            <div class="dash-listing" onclick="closeModal(); setTimeout(() => openListing(${l.id}), 300)" style="cursor:pointer;">
              <img class="dash-listing-img" src="${esc(l.img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
              <div class="dash-listing-info">
                <div class="dash-listing-title">${!l.userSubmitted ? '<span class="badge demo" style="position:static;display:inline-block;font-size:9px;padding:2px 6px;margin-right:6px;vertical-align:middle;">Жишээ</span>' : ''}${esc(l.title)}</div>
                <div class="dash-listing-price">${fmtPrice(l.price)}</div>
                <div class="dash-listing-stats">
                  <span class="dash-listing-stat">${l.area} м²</span>
                  <span class="dash-listing-stat">${typeof l.rooms === 'number' ? l.rooms + ' өрөө' : l.rooms}</span>
                  <span class="dash-listing-stat">${esc(l.loc.split('·')[0].trim())}</span>
                </div>
              </div>
              <button class="compare-bar-remove" onclick="event.stopPropagation(); removeFav(${l.id})" style="width:32px; height:32px; background:var(--paper-2);" title="Хасах">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        ${favListings.length >= 2 ? `
          <button class="btn btn-blue btn-lg" style="width:100%; justify-content:center; margin-top:20px;" onclick="compareFavorites()">
            Эдгээрийг харьцуулах
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        ` : ''}
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function removeFav(id) {
    removeFavorite(id);
    afterFavoritesChanged();
    openFavorites();
  }

  function clearAllFavs() {
    favorites.slice().forEach(removeFavorite);
    afterFavoritesChanged();
    closeModal();
    showToast('Бүх хадгалсан зар хасагдлаа');
  }

  function compareFavorites() {
    compareList = favorites.slice(0, 3);
    closeModal();
    setTimeout(() => {
      // restore compare button states on cards
      renderListings(getFilteredListings());
      compareList.forEach(id => {
        document.querySelectorAll('.listing-compare').forEach(b => {
          if (b.getAttribute('onclick').includes(`toggleCompare(${id},`)) b.classList.add('active');
        });
      });
      updateCompareBar();
      openCompareModal();
    }, 300);
  }

