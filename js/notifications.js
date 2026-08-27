  // ===== NOTIFICATIONS (Firestore-backed) =====
  // Schema: notifications/{id} { userId, type: 'match' | 'price', text, listingLocalId,
  //   listingFsId, savedSearchId (match only), price (price only), read, createdAt }
  //
  // Honesty note: TP Property has no backend / Cloud Functions running around the clock, so this
  // is not instant push. Matching runs client-side — right after login, and again every time
  // fresh public listings load (see auth.js / data.js) — so a real match or price drop shows
  // up the next time a user opens or refreshes TP Property, not the second it actually happens.
  let notifications = [];
  let _notifUnsub = null;

  function subscribeNotifications() {
    if (_notifUnsub) { _notifUnsub(); _notifUnsub = null; }
    if (!currentUser) { notifications = []; renderNotifications(); updateNotifCount(); return; }
    _notifUnsub = db.collection('notifications').where('userId', '==', currentUser.uid)
      .onSnapshot(snap => {
        notifications = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
          .slice(0, 30);
        renderNotifications();
        updateNotifCount();
      }, () => {});
  }

  function timeAgoNotif(ts) {
    const ms = ts?.toMillis?.();
    if (!ms) return 'Дөнгөж сая';
    const diffMin = Math.floor((Date.now() - ms) / 60000);
    if (diffMin < 1) return 'Дөнгөж сая';
    if (diffMin < 60) return diffMin + ' минутын өмнө';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + ' цагийн өмнө';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Өчигдөр';
    if (diffDay < 7) return diffDay + ' хоногийн өмнө';
    return new Date(ms).toLocaleDateString('mn-MN');
  }

  function renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const icons = {
      price: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      match: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>',
      chat_message: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    };
    if (!currentUser) {
      list.innerHTML = '<div style="padding:32px 20px;text-align:center;color:var(--ink-3);font-size:13px;">Мэдэгдэл авахын тулд нэвтэрнэ үү.</div>';
      return;
    }
    if (notifications.length === 0) {
      list.innerHTML = '<div style="padding:32px 20px;text-align:center;color:var(--ink-3);font-size:13px;">Одоогоор мэдэгдэл алга.<br>Хайлт хадгалах эсвэл зар таалагдвал (зүрхэн товч) шинэ мэдээллийг энд харуулна.</div>';
      return;
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotif('${n.id}', this, ${n.listingLocalId != null ? n.listingLocalId : 'null'}, ${n.chatId ? `'${n.chatId}'` : 'null'})">
        <div class="notif-icon ${n.type}">${icons[n.type] || icons.match}</div>
        <div class="notif-content">
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${timeAgoNotif(n.createdAt)}</div>
        </div>
      </div>
    `).join('');
  }

  function toggleNotif(e) {
    e.stopPropagation();
    document.getElementById('notifPanel').classList.toggle('open');
  }

  function readNotif(id, el, listingLocalId, chatId) {
    const n = notifications.find(x => x.id === id);
    if (n && !n.read) {
      n.read = true;
      el.classList.remove('unread');
      updateNotifCount();
      db.collection('notifications').doc(id).update({ read: true }).catch(() => {});
    }
    if (chatId && typeof openChatById === 'function') {
      document.getElementById('notifPanel').classList.remove('open');
      openChatById(chatId);
      return;
    }
    if (listingLocalId != null && !isNaN(listingLocalId) && listings.some(l => l.id === listingLocalId)) {
      document.getElementById('notifPanel').classList.remove('open');
      openListing(listingLocalId);
    }
  }

  function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    notifications.forEach(n => n.read = true);
    renderNotifications();
    updateNotifCount();
    showToast('Бүх мэдэгдлийг уншсан болголоо', 'success');
    unreadIds.forEach(id => db.collection('notifications').doc(id).update({ read: true }).catch(() => {}));
  }

  function updateNotifCount() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notifCount');
    if (badge) {
      if (unread > 0) { badge.textContent = unread; badge.style.display = 'grid'; }
      else badge.style.display = 'none';
    }
  }

  // Close notif panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    const trigger = e.target.closest('.notif-trigger');
    if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !trigger) {
      panel.classList.remove('open');
    }
  });

  // ===== REAL MATCHING: saved-search matches + price drops =====
  let _notifCheckInFlight = false;

  async function checkNotificationTriggers() {
    if (!currentUser || _notifCheckInFlight) return;
    _notifCheckInFlight = true;
    try {
      await checkSavedSearchMatches();
      await checkPriceDrops();
    } catch(e) {}
    _notifCheckInFlight = false;
  }

  function listingMatchesSavedSearch(l, s) {
    if (l.cat === 'rent' && s.category !== 'rent') return false;
    if (s.category && s.category !== 'all' && l.cat !== s.category) return false;
    if (s.district && s.district !== 'all' && l.district !== s.district) return false;
    if (s.rooms && s.rooms !== 'all') {
      const r = parseInt(s.rooms, 10);
      if (typeof l.rooms !== 'number' || (r === 4 ? l.rooms < 4 : l.rooms !== r)) return false;
    }
    const priceMin = parseFloat(s.priceMin) || 0;
    const priceMax = parseFloat(s.priceMax) || Infinity;
    if (l.cat !== 'rent' && (l.price < priceMin || l.price > priceMax)) return false;
    const areaMin = parseFloat(s.areaMin) || 0;
    const areaMax = parseFloat(s.areaMax) || Infinity;
    if (l.area < areaMin || l.area > areaMax) return false;
    if (s.keyword) {
      const haystack = [l.title, l.loc, l.district, String(l.rooms), String(l.price)].join(' ').toLowerCase();
      if (!s.keyword.toLowerCase().split(/\s+/).every(w => haystack.includes(w))) return false;
    }
    return true;
  }

  async function checkSavedSearchMatches() {
    const searchSnap = await db.collection('savedSearches').where('userId', '==', currentUser.uid).get();
    if (searchSnap.empty) return;
    const candidates = listings.filter(l => l.userSubmitted && !l._inactive && l.ownerId !== currentUser.uid && l.firestoreId);
    if (candidates.length === 0) return;
    for (const searchDoc of searchSnap.docs) {
      const s = searchDoc.data();
      const searchCreatedMs = s.createdAt?.toMillis?.() || 0;
      for (const l of candidates) {
        // Only real, genuinely-new listings that appeared after the search was saved —
        // otherwise every pre-existing listing would "match" on the very first check.
        if (!searchCreatedMs || !l._createdAtMs || l._createdAtMs <= searchCreatedMs) continue;
        if (!listingMatchesSavedSearch(l, s)) continue;
        const existing = await db.collection('notifications')
          .where('userId', '==', currentUser.uid)
          .where('type', '==', 'match')
          .where('savedSearchId', '==', searchDoc.id)
          .where('listingFsId', '==', l.firestoreId).get();
        if (!existing.empty) continue;
        await db.collection('notifications').add({
          userId: currentUser.uid, type: 'match',
          text: `"<strong>${esc(s.label || 'Хайлт')}</strong>" хайлтад тохирох шинэ зар орлоо: <strong>${esc(l.title)}</strong>, ${fmtPrice(l.price)}`,
          listingLocalId: l.id, listingFsId: l.firestoreId, savedSearchId: searchDoc.id,
          read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
    }
  }

  async function checkPriceDrops() {
    const favSnap = await db.collection('favorites').where('userId', '==', currentUser.uid).get();
    if (favSnap.empty) return;
    for (const favDoc of favSnap.docs) {
      const f = favDoc.data();
      if (!f.firestoreId || f.priceAtSave == null) continue;
      const l = listings.find(x => x.firestoreId === f.firestoreId);
      if (!l || l.price == null || l.price >= f.priceAtSave) continue;
      const existing = await db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'price')
        .where('listingFsId', '==', f.firestoreId)
        .where('price', '==', l.price).get();
      if (existing.empty) {
        await db.collection('notifications').add({
          userId: currentUser.uid, type: 'price',
          text: `Таны хадгалсан <strong>${esc(l.title)}</strong> зарын үнэ ${fmtPrice(f.priceAtSave)} → <strong>${fmtPrice(l.price)}</strong> болж буурлаа`,
          listingLocalId: l.id, listingFsId: f.firestoreId, price: l.price,
          read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
      // Track the new price so a further drop can be detected/notified again later,
      // and so this same drop doesn't get re-notified on every future check.
      favDoc.ref.update({ priceAtSave: l.price }).catch(() => {});
    }
  }
