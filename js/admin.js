  // ===== ADMIN DASHBOARD — Owner / Admin control center =====
  // Every privileged read/write triggered from this file is re-enforced in firestore.rules —
  // this file is the UI layer only. See js/permissions.js for isOwnerUser()/isAdminUser()/
  // isAdminOrOwnerUser() (the single source of truth for role checks) and logAdminAction()
  // (the audit-log writer every mutating action below calls). guardAdminRoute(), called from
  // showPage('admin') before this file ever runs, is what actually keeps a non-admin out —
  // the currentUser.role check here is redundant-on-purpose defense in depth, not the real gate.

  let _adminSection = 'overview';
  let _adminLoading = false;

  const ADMIN_NAV = [
    { group: 'Хяналтын самбар', items: [{ id: 'overview', label: 'Overview' }] },
    { group: 'Зар', items: [
        { id: 'listings-all', label: 'Бүх зар' },
        { id: 'listings-pending', label: 'Хүлээгдэж буй' },
        { id: 'listings-active', label: 'Нийтлэгдсэн' },
        { id: 'listings-rejected', label: 'Татгалзсан' },
        { id: 'listings-flagged', label: 'Report авсан' }
      ]
    },
    { group: 'Хэрэглэгч', items: [{ id: 'users', label: 'Бүх хэрэглэгч', ownerOnly: true }] },
    { group: 'Шинэ орон сууц', items: [{ id: 'projects', label: 'Projects' }] },
    { group: 'Сурталчилгаа', items: [{ id: 'ads', label: 'Зар сурталчилгаа' }] },
    { group: 'Moderation', items: [{ id: 'moderation', label: 'Сэжигтэй & давхардсан' }] },
    { group: 'Analytics', items: [{ id: 'analytics', label: 'Тоон үзүүлэлт' }] },
    { group: 'Аудит', items: [{ id: 'auditlog', label: 'Үйлдлийн түүх', ownerOnly: true }] }
  ];

  async function renderAdminDashboard(section) {
    const el = document.getElementById('adminContent');
    if (!el) return;
    if (!guardAdminRoute()) return; // defense-in-depth — showPage() already guards this

    if (section) _adminSection = section;
    const owner = isOwnerUser();
    const validIds = ADMIN_NAV.flatMap(g => g.items).filter(it => !it.ownerOnly || owner).map(it => it.id);
    if (!validIds.includes(_adminSection)) _adminSection = 'overview';

    el.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="admin-role-badge ${owner ? 'owner' : ''}">${owner ? 'OWNER' : 'ADMIN'}</div>
          <div class="admin-role-email">${esc(currentUser.email || '')}</div>
          ${ADMIN_NAV.map(g => {
            const items = g.items.filter(it => !it.ownerOnly || owner);
            if (!items.length) return '';
            return `
              <div class="admin-nav-group">
                <div class="admin-nav-group-label">${esc(g.group)}</div>
                ${items.map(it => `<button class="admin-nav-item ${_adminSection === it.id ? 'active' : ''}" onclick="renderAdminDashboard('${it.id}')">${esc(it.label)}</button>`).join('')}
              </div>
            `;
          }).join('')}
        </aside>
        <div class="admin-main">
          <div id="adminSummaryRow" class="admin-summary-row" style="display:none;"></div>
          <div id="adminSectionContent"><div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div></div>
        </div>
      </div>
    `;

    const s = _adminSection;
    if (s === 'overview') await renderAdminOverview();
    else if (s.startsWith('listings-')) await renderAdminListingsTab(s.replace('listings-', ''));
    else if (s === 'users' && owner) await renderAdminUsersSection();
    else if (s === 'projects') await renderAdminProjectsSection();
    else if (s === 'ads') await renderAdminAdsSection();
    else if (s === 'moderation') await renderAdminModerationSection();
    else if (s === 'analytics') await renderAdminAnalyticsSection();
    else if (s === 'auditlog' && owner) await renderAdminAuditLogSection();
  }

  function adminSectionEl() { return document.getElementById('adminSectionContent'); }
  function adminEmptyState(icon, title, sub) {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--ink-3);">
        ${icon}
        <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--ink);margin-bottom:6px;">${esc(title)}</div>
        <div style="font-size:13px;">${esc(sub)}</div>
      </div>
    `;
  }
  const ADMIN_EMPTY_ICON = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35;margin:0 auto 12px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>`;

  // ===== OVERVIEW =====
  async function renderAdminOverview() {
    const el = adminSectionEl();
    if (!el) return;
    let listingsSnap, usersCount = null, pendingReportsCount = 0;
    try { listingsSnap = await db.collection('listings').get(); } catch(e) { listingsSnap = null; }
    try {
      if (isOwnerUser()) { const uSnap = await db.collection('users').get(); usersCount = uSnap.size; }
    } catch(e) {}
    try { const rSnap = await db.collection('reports').where('status', '==', 'pending').get(); pendingReportsCount = rSnap.size; } catch(e) {}

    const byStatus = { pending: 0, active: 0, rejected: 0, expired: 0, sold: 0, rented: 0 };
    let totalViews = 0, totalFavorites = 0, totalContacts = 0;
    if (listingsSnap) {
      listingsSnap.forEach(doc => {
        const d = doc.data();
        const st = d.status || 'active';
        byStatus[st] = (byStatus[st] || 0) + 1;
        totalViews += d.viewCount || 0;
        totalFavorites += d.favoriteCount || 0;
        totalContacts += d.contactCount || 0;
      });
    }

    el.innerHTML = `
      <div class="admin-stat-grid">
        <div class="admin-stat-card"><div class="v">${listingsSnap ? listingsSnap.size : '—'}</div><div class="l">Нийт зар</div></div>
        <div class="admin-stat-card"><div class="v">${byStatus.pending}</div><div class="l">Хянагдаж буй</div></div>
        <div class="admin-stat-card"><div class="v">${byStatus.active}</div><div class="l">Нийтлэгдсэн</div></div>
        <div class="admin-stat-card"><div class="v">${pendingReportsCount}</div><div class="l">Шийдэгдээгүй report</div></div>
        ${usersCount != null ? `<div class="admin-stat-card"><div class="v">${usersCount}</div><div class="l">Нийт хэрэглэгч</div></div>` : ''}
        <div class="admin-stat-card"><div class="v">${fmt(totalViews)}</div><div class="l">Нийт үзэлт</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalFavorites)}</div><div class="l">Хадгалагдсан</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalContacts)}</div><div class="l">Холбогдсон</div></div>
      </div>
      <div class="admin-panel" style="margin-top:20px;">
        <div class="admin-panel-head">Хурдан холбоос</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:16px;">
          <button class="btn btn-blue" onclick="renderAdminDashboard('listings-pending')">Хянагдаж буй зар (${byStatus.pending})</button>
          <button class="btn btn-ghost" onclick="renderAdminDashboard('moderation')">Сэжигтэй зар шалгах</button>
          <button class="btn btn-ghost" onclick="renderAdminDashboard('ads')">Сурталчилгаа удирдах</button>
        </div>
      </div>
    `;
  }

  // ===== LISTINGS MODERATION =====
  async function renderAdminListingsTab(tab) {
    const summaryEl = document.getElementById('adminSummaryRow');
    if (summaryEl) summaryEl.style.display = 'none';
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;

    if (tab === 'flagged') { await renderAdminFlaggedTab(); return; }

    const statusMap = { all: null, pending: ['pending'], active: ['active'], rejected: ['rejected'] };
    const statuses = statusMap[tab] || ['pending'];
    const items = statuses ? await adminFetchListingsByStatus(statuses) : await adminFetchListingsByStatus(['pending', 'active', 'rejected', 'expired', 'sold', 'rented']);
    if (items.length === 0) {
      el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Хоосон байна', 'Энэ ангилалд зар алга байна.');
      return;
    }
    el.innerHTML = `<div class="admin-list-table">${items.map(d => adminListingRow(d)).join('')}</div>`;
  }

  async function renderAdminFlaggedTab() {
    if (_adminLoading) return;
    _adminLoading = true;
    const reportsByListing = await fetchPendingReportsGrouped();
    const anomalies = computePriceAnomalies();

    const flagged = {};
    Object.keys(reportsByListing).forEach(fsId => {
      const group = reportsByListing[fsId];
      const l = listings.find(x => x.firestoreId === fsId);
      if (!l) return;
      flagged[fsId] = flagged[fsId] || { l, reasons: [], reportIds: [] };
      flagged[fsId].reasons.push(...group.reasons.map(r => 'Мэдээлэгдсэн: ' + r));
      flagged[fsId].reportIds = group.reportIds;
    });
    anomalies.forEach(({ l, val }) => {
      if (!l.firestoreId) return;
      flagged[l.firestoreId] = flagged[l.firestoreId] || { l, reasons: [], reportIds: [] };
      flagged[l.firestoreId].reasons.push(`Зах зээлийн дундаж үнээс ${Math.abs(Math.round(val.diffPct * 100))}% хямд (${val.basisText})`);
    });

    const items = Object.values(flagged).sort((a, b) => b.reasons.length - a.reasons.length);
    _adminLoading = false;
    renderAdminFlaggedList(items, Object.keys(reportsByListing).length, anomalies.length);
  }

  async function fetchPendingReportsGrouped() {
    try {
      const snap = await db.collection('reports').where('status', '==', 'pending').get();
      const map = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        const key = d.listingFsId;
        if (!key) return;
        map[key] = map[key] || { reasons: [], reportIds: [] };
        map[key].reasons.push(d.reason);
        map[key].reportIds.push(doc.id);
      });
      return map;
    } catch(e) {
      console.error('fetchPendingReportsGrouped failed:', e.code, e.message);
      return {};
    }
  }

  // Real comparable-sales analysis (computeValuation, utils.js) — flags listings priced far
  // enough below genuine comparable listings that it's worth a human look, not a fabricated
  // "AI fraud score". Ignored when there isn't enough comparable data to trust (confidence
  // 'low'), so a listing never gets flagged from a thin sample.
  function computePriceAnomalies() {
    return listings
      .filter(l => l.userSubmitted && !l._inactive && l.cat !== 'rent' && l.firestoreId)
      .map(l => ({ l, val: computeValuation(l) }))
      .filter(x => x.val.available && x.val.confidence !== 'low' && x.val.diffPct <= -0.35)
      .sort((a, b) => a.val.diffPct - b.val.diffPct);
  }

  function renderAdminFlaggedList(items, reportedCount, anomalyCount) {
    const summaryEl = document.getElementById('adminSummaryRow');
    const el = adminSectionEl();
    if (!el) return;
    if (summaryEl) {
      summaryEl.style.display = 'flex';
      summaryEl.innerHTML = `
        <div class="admin-summary-stat"><div class="num">${items.length}</div><div class="label">Сэжигтэй зар</div></div>
        <div class="admin-summary-stat"><div class="num">${reportedCount}</div><div class="label">Мэдээлэгдсэн зар</div></div>
        <div class="admin-summary-stat"><div class="num">${anomalyCount}</div><div class="label">Огцом хямд үнэтэй зар</div></div>
      `;
    }
    if (items.length === 0) {
      el.innerHTML = adminEmptyState(
        `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35;margin:0 auto 12px;"><polyline points="20 6 9 17 4 12"/></svg>`,
        'Сэжигтэй зар алга', 'Одоогоор мэдээлэгдсэн болон үнийн хэвийн бус зар олдсонгүй.'
      );
      return;
    }
    el.innerHTML = items.map(item => adminFlagCard(item)).join('');
  }

  function adminFlagCard({ l, reasons, reportIds }) {
    const seller = sellerData[l.id] || {};
    const ownerVerified = !!l.sellerVerified;
    const phoneOk = !!l.phoneVerified;
    const listingOk = !!l.listingVerified;
    const pill = (on, label) => `<span class="verify-pill ${on ? 'on' : 'off'}">${on ? '✓' : '○'} ${label}</span>`;
    return `
      <div class="admin-flag-card">
        <img class="admin-flag-img" src="${esc(l.img || '')}" alt="" onerror="this.style.display='none';" />
        <div style="flex:1;min-width:0;">
          <div class="admin-flag-title">${esc(l.title)}</div>
          <div class="admin-flag-meta">${esc(l.loc)} · ${fmtPrice(l.price)} · Эзэмшигч: ${esc(seller.name || 'Тодорхойгүй')} (${esc(seller.phone || '—')})</div>
          <div class="verify-status-row" style="margin:0 0 10px;">
            ${pill(ownerVerified, 'Эзэмшигч')}${pill(phoneOk, 'Утас')}${pill(listingOk, 'Зар')}
          </div>
          <ul class="admin-flag-reasons">${reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          <div class="admin-flag-actions">
            <button class="btn btn-blue" onclick="adminVerifyListing('${l.firestoreId}')">Баталгаажуулах</button>
            <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="adminArchiveListing('${l.firestoreId}')">Архивлах</button>
            ${reportIds && reportIds.length ? `<button class="btn btn-ghost" onclick="adminDismissReports('${l.firestoreId}', ${JSON.stringify(reportIds).replace(/"/g, '&quot;')})">Мэдээллийг хаах</button>` : ''}
            <button class="btn btn-ghost" onclick="showPage('listings'); setTimeout(()=>openListing(${l.id}), 150)">Дэлгэрэнгүй</button>
          </div>
        </div>
      </div>
    `;
  }

  async function adminVerifyListing(fsId) {
    try {
      await db.collection('listings').doc(fsId).update({ listingVerified: true });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) l.listingVerified = true;
      logAdminAction('verify', 'listing', fsId, '');
      showToast('Зар баталгаажлаа', 'success');
      renderAdminDashboard();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminVerifyListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminDismissReports(fsId, reportIds) {
    try {
      await Promise.all(reportIds.map(id => db.collection('reports').doc(id).update({ status: 'resolved' })));
      logAdminAction('dismiss_reports', 'listing', fsId, reportIds.length + ' report(s)');
      showToast('Мэдээллүүдийг хаалаа', 'success');
      renderAdminDashboard();
    } catch(e) {
      console.error('adminDismissReports failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // Fetched straight from Firestore rather than the local `listings` array, since that array
  // only ever holds the current visitor's OWN listings plus whatever's publicly active — an
  // admin needs to see every user's listing in every status.
  async function adminFetchListingsByStatus(statuses) {
    try {
      const results = [];
      for (const st of statuses) {
        const snap = await db.collection('listings').where('status', '==', st).get();
        snap.forEach(doc => results.push(Object.assign({ fsId: doc.id }, doc.data())));
      }
      return results;
    } catch(e) {
      console.error('adminFetchListingsByStatus failed:', e.code, e.message);
      return [];
    }
  }

  // The admin listings table is fetched straight from Firestore (adminFetchListingsByStatus)
  // and only carries the real document's own fields — never the client-only numeric `id`
  // that openListing() keys off (that id is assigned when a listing loads into the local
  // `listings` array, see data.js/auth.js). Resolve it by firestoreId here instead of trying
  // to thread a numeric id through data that was never fetched that way.
  function adminOpenListingByFsId(fsId) {
    const l = listings.find(x => x.firestoreId === fsId);
    if (!l) { showToast('Энэ зар одоогоор жагсаалтад олдсонгүй'); return; }
    showPage('listings');
    setTimeout(() => openListing(l.id), 150);
  }

  function adminListingRow(d) {
    const status = d.status || 'active';
    const img = d.img || (d.images && d.images[0]) || '';
    const statusLabels = { pending: 'Хүлээгдэж буй', active: 'Нийтлэгдсэн', rejected: 'Татгалзсан', expired: 'Хугацаа дууссан', sold: 'Зарагдсан', rented: 'Түрээслэгдсэн' };
    let actions;
    if (status === 'pending') {
      actions = `
        <button class="btn btn-blue" onclick="adminApproveListing('${d.fsId}')">Approve</button>
        <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="adminRejectListing('${d.fsId}')">Reject</button>
        <button class="btn btn-ghost" onclick="adminDeleteListing('${d.fsId}')">Устгах</button>
      `;
    } else if (status === 'rejected') {
      actions = `
        <button class="btn btn-blue" onclick="adminApproveListing('${d.fsId}')">Approve</button>
        <button class="btn btn-ghost" onclick="adminDeleteListing('${d.fsId}')">Устгах</button>
      `;
    } else if (status === 'active') {
      actions = `
        <button class="btn btn-ghost" onclick="adminOpenListingByFsId('${d.fsId}')">Харах</button>
        <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="adminArchiveListing('${d.fsId}')">Hide</button>
        <button class="btn btn-ghost" onclick="adminDeleteListing('${d.fsId}')">Устгах</button>
        ${d.ownerId ? `<button class="btn btn-ghost" onclick="adminBlockUser('${d.ownerId}')">Хэрэглэгч блоклох</button>` : ''}
      `;
    } else {
      actions = `<button class="btn btn-ghost" onclick="adminDeleteListing('${d.fsId}')">Устгах</button>`;
    }
    const dateText = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : (d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleDateString() : '—');
    return `
      <div class="admin-row">
        <img class="admin-row-img" src="${esc(img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(d.title || '')}</div>
          <div class="admin-row-meta">${esc(d.sellerName || 'Тодорхойгүй')} · ${fmtPrice(d.price || 0)} · ${esc(dateText)}
            ${d.reportCount ? ` · <span style="color:var(--danger);font-weight:700;">${d.reportCount} report</span>` : ''}
          </div>
          <span class="admin-status-pill status-${status}">${esc(statusLabels[status] || status)}</span>
          ${status === 'rejected' && d.rejectionReason ? `<div style="font-size:12px;color:var(--danger);margin-top:6px;">Шалтгаан: ${esc(d.rejectionReason)}</div>` : ''}
        </div>
        <div class="admin-row-actions">${actions}</div>
      </div>
    `;
  }

  async function adminApproveListing(fsId) {
    try {
      await db.collection('listings').doc(fsId).update({ status: 'active', listingVerified: true, rejectionReason: '' });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) { l.status = 'active'; l._inactive = false; l._expired = false; l.listingVerified = true; l.rejectionReason = ''; }
      logAdminAction('approve', 'listing', fsId, '');
      showToast('Зар батлагдлаа', 'success');
      renderAdminDashboard();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminApproveListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminRejectListing(fsId) {
    const reason = prompt('Татгалзах шалтгаан (заавал, эзэмшигчид харагдана):');
    if (reason === null) return;
    if (!reason.trim()) { showToast('Шалтгаан оруулна уу'); return; }
    try {
      await db.collection('listings').doc(fsId).update({ status: 'rejected', rejectionReason: reason.trim() });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) { l.status = 'rejected'; l._inactive = true; l.rejectionReason = reason.trim(); }
      logAdminAction('reject', 'listing', fsId, reason.trim());
      showToast('Зар татгалзагдлаа', 'success');
      renderAdminDashboard();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminRejectListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // "Hide/Архивлах" files an active (or flagged) listing under Expired — same status a
  // listing reaches on its own after 30 days, just admin/owner-triggered. Never a hard delete.
  async function adminArchiveListing(fsId) {
    const reason = prompt('Нуух шалтгаан (заавал):');
    if (reason === null) return;
    if (!reason.trim()) { showToast('Шалтгаан оруулна уу'); return; }
    try {
      await db.collection('listings').doc(fsId).update({ status: 'expired' });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) { l.status = 'expired'; l._inactive = true; l._expired = true; }
      logAdminAction('hide', 'listing', fsId, reason.trim());
      showToast('Зар нуугдлаа', 'success');
      renderAdminDashboard();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminArchiveListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminDeleteListing(fsId) {
    const reason = prompt('Устгах шалтгаан (заавал):');
    if (reason === null) return;
    if (!reason.trim()) { showToast('Шалтгаан оруулна уу'); return; }
    if (!confirm('Энэ зарыг бүрмөсөн устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
    try {
      await db.collection('listings').doc(fsId).delete();
      const idx = listings.findIndex(x => x.firestoreId === fsId);
      if (idx > -1) listings.splice(idx, 1);
      logAdminAction('delete', 'listing', fsId, reason.trim());
      showToast('Зар устгагдлаа', 'success');
      renderAdminDashboard();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminDeleteListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminBlockUser(uid) {
    if (!uid) return;
    if (!confirm('Энэ хэрэглэгчийг блоклох уу? Цаашид шинэ зар нэмэх, зараа засах боломжгүй болно.')) return;
    try {
      await db.collection('users').doc(uid).set({ blocked: true }, { merge: true });
      logAdminAction('block_user', 'user', uid, '');
      showToast('Хэрэглэгч блоклогдлоо', 'success');
    } catch(e) {
      console.error('adminBlockUser failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminUnblockUser(uid) {
    if (!uid) return;
    try {
      await db.collection('users').doc(uid).set({ blocked: false }, { merge: true });
      logAdminAction('unblock_user', 'user', uid, '');
      showToast('Блок цуцлагдлаа', 'success');
      renderAdminDashboard();
    } catch(e) {
      console.error('adminUnblockUser failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== USERS (owner only) =====
  let _adminUsersCache = null;
  let _adminUsersSearch = '';

  async function renderAdminUsersSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('users').get();
      _adminUsersCache = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
    } catch(e) {
      console.error('renderAdminUsersSection failed:', e.code, e.message);
      el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Ачаалж чадсангүй', 'Хэрэглэгчдийн жагсаалт татахад алдаа гарлаа.');
      return;
    }
    // Listings-per-owner count — one pass over the public+own-visible local array is not
    // exhaustive (admin needs every user's count), so this queries Firestore directly.
    let listingCounts = {};
    try {
      const lsnap = await db.collection('listings').get();
      lsnap.forEach(doc => {
        const ownerId = doc.data().ownerId;
        if (ownerId) listingCounts[ownerId] = (listingCounts[ownerId] || 0) + 1;
      });
    } catch(e) {}
    _adminUsersCache.forEach(u => { u._listingCount = listingCounts[u.uid] || 0; });
    renderAdminUsersList();
  }

  function renderAdminUsersList() {
    const el = adminSectionEl();
    if (!el || !_adminUsersCache) return;
    const q = _adminUsersSearch.trim().toLowerCase();
    const items = _adminUsersCache.filter(u => {
      if (!q) return true;
      const name = ((u.lastName || '') + ' ' + (u.firstName || '')).toLowerCase();
      return name.includes(q) || (u.email || '').toLowerCase().includes(q);
    });
    el.innerHTML = `
      <div class="admin-search-row">
        <input type="text" class="form-input" id="adminUserSearch" placeholder="Нэр эсвэл email хайх" value="${esc(_adminUsersSearch)}" oninput="adminFilterUsers(this.value)" />
      </div>
      <div class="admin-list-table">
        ${items.length === 0 ? adminEmptyState(ADMIN_EMPTY_ICON, 'Хэрэглэгч олдсонгүй', 'Хайлтын нөхцлөө өөрчилж үзнэ үү.') : items.map(u => adminUserRow(u)).join('')}
      </div>
    `;
  }

  function adminFilterUsers(val) {
    _adminUsersSearch = val;
    renderAdminUsersList();
  }

  function adminUserRow(u) {
    const isSelf = currentUser && currentUser.uid === u.uid;
    const role = u.role || 'user';
    const created = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—';
    const status = u.blocked ? '<span class="admin-status-pill status-rejected">Блоклогдсон</span>' : '<span class="admin-status-pill status-active">Идэвхтэй</span>';
    let actions = '';
    if (!isSelf && role !== 'owner') {
      if (role === 'admin') {
        actions += `<button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="confirmRevokeAdmin('${u.uid}', '${esc((u.firstName || '') + ' ' + (u.lastName || '')).replace(/'/g, "\\'")}')">Admin эрх цуцлах</button>`;
      } else {
        actions += `<button class="btn btn-blue" onclick="confirmGrantAdmin('${u.uid}', '${esc((u.firstName || '') + ' ' + (u.lastName || '')).replace(/'/g, "\\'")}')">Admin эрх өгөх</button>`;
      }
      actions += u.blocked
        ? `<button class="btn btn-ghost" onclick="adminUnblockUser('${u.uid}')">Блок цуцлах</button>`
        : `<button class="btn btn-ghost" onclick="adminBlockUser('${u.uid}')">Блоклох</button>`;
    }
    return `
      <div class="admin-row">
        <div class="admin-user-avatar">${esc((u.firstName || u.email || '?')[0].toUpperCase())}</div>
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(((u.lastName || '') + ' ' + (u.firstName || '')).trim() || 'Нэргүй')} ${isSelf ? '<span style="color:var(--ink-3);font-weight:500;">(та)</span>' : ''}</div>
          <div class="admin-row-meta">${esc(u.email || '—')} · UID: <code style="font-size:11px;">${esc(u.uid.slice(0, 10))}…</code> · ${esc(created)} · ${u._listingCount} зар</div>
          <span class="admin-role-pill role-${role}">${roleLabel(role)}</span> ${status}
        </div>
        <div class="admin-row-actions">${actions}</div>
      </div>
    `;
  }

  function confirmGrantAdmin(uid, name) {
    if (!confirm(`${name || 'Энэ хэрэглэгч'} хэрэглэгчид Admin эрх өгөх үү?`)) return;
    grantAdminRole(uid, name);
  }
  function confirmRevokeAdmin(uid, name) {
    if (!confirm(`${name || 'Энэ хэрэглэгч'}-ийн Admin эрхийг цуцлах уу?`)) return;
    revokeAdminRole(uid, name);
  }

  // The one privileged path — matches firestore.rules' owner-only role-change rule exactly
  // (only 'role' + 'updatedAt' touched, target can't already be 'owner'). Any other user
  // trying this same write is rejected server-side regardless of what the client here does.
  async function grantAdminRole(uid, name) {
    try {
      await db.collection('users').doc(uid).update({ role: 'admin', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      logAdminAction('grant_admin', 'user', uid, name || '');
      showToast((name || 'Хэрэглэгч') + ' Admin эрх авлаа', 'success');
      renderAdminDashboard('users');
    } catch(e) {
      console.error('grantAdminRole failed:', e.code, e.message);
      showToast('Эрх өгөхөд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function revokeAdminRole(uid, name) {
    try {
      await db.collection('users').doc(uid).update({ role: 'user', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      logAdminAction('revoke_admin', 'user', uid, name || '');
      showToast((name || 'Хэрэглэгч') + '-ийн Admin эрх цуцлагдлаа', 'success');
      renderAdminDashboard('users');
    } catch(e) {
      console.error('revokeAdminRole failed:', e.code, e.message);
      showToast('Эрх цуцлахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== NEW DEVELOPMENTS MODERATION =====
  async function renderAdminProjectsSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('projects').get();
      const items = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
      if (items.length === 0) {
        el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Төсөл алга', 'Одоогоор нийтэлсэн барилгын төсөл алга байна.');
        return;
      }
      el.innerHTML = `<div class="admin-list-table">${items.map(p => adminProjectRow(p)).join('')}</div>`;
    } catch(e) {
      console.error('renderAdminProjectsSection failed:', e.code, e.message);
      el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Ачаалж чадсангүй', 'Дахин оролдоно уу.');
    }
  }

  function adminProjectRow(p) {
    const status = p.status || 'active';
    const img = (p.images && p.images[0]) || p.img || '';
    return `
      <div class="admin-row">
        <img class="admin-row-img" src="${esc(img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(p.projectName || '')}</div>
          <div class="admin-row-meta">${esc(p.company || 'Тодорхойгүй компани')} · ${esc(ndDistrictLabel ? ndDistrictLabel(p.district) : (p.district || ''))}</div>
          <span class="admin-status-pill status-${status === 'active' ? 'active' : 'rejected'}">${status === 'active' ? 'Идэвхтэй' : 'Нуугдсан'}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost" onclick="showPage('newdev'); setTimeout(()=>openProjectDetail('${p.fsId}'), 150)">Харах</button>
          ${status === 'active'
            ? `<button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="adminHideProject('${p.fsId}')">Нуух</button>`
            : `<button class="btn btn-blue" onclick="adminUnhideProject('${p.fsId}')">Дахин нийтлэх</button>`}
          <button class="btn btn-ghost" onclick="adminDeleteProject('${p.fsId}')">Устгах</button>
        </div>
      </div>
    `;
  }

  async function adminHideProject(fsId) {
    const reason = prompt('Нуух шалтгаан (заавал):');
    if (reason === null) return;
    if (!reason.trim()) { showToast('Шалтгаан оруулна уу'); return; }
    try {
      await db.collection('projects').doc(fsId).update({ status: 'hidden' });
      logAdminAction('hide', 'project', fsId, reason.trim());
      showToast('Төсөл нуугдлаа', 'success');
      renderAdminDashboard('projects');
    } catch(e) {
      console.error('adminHideProject failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function adminUnhideProject(fsId) {
    try {
      await db.collection('projects').doc(fsId).update({ status: 'active' });
      logAdminAction('unhide', 'project', fsId, '');
      showToast('Төсөл дахин нийтлэгдлээ', 'success');
      renderAdminDashboard('projects');
    } catch(e) {
      console.error('adminUnhideProject failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function adminDeleteProject(fsId) {
    const reason = prompt('Устгах шалтгаан (заавал):');
    if (reason === null) return;
    if (!reason.trim()) { showToast('Шалтгаан оруулна уу'); return; }
    if (!confirm('Энэ төслийг бүрмөсөн устгах уу?')) return;
    try {
      await db.collection('projects').doc(fsId).delete();
      logAdminAction('delete', 'project', fsId, reason.trim());
      showToast('Төсөл устгагдлаа', 'success');
      renderAdminDashboard('projects');
    } catch(e) {
      console.error('adminDeleteProject failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== ADVERTISING =====
  const AD_PLACEMENTS = {
    'home-banner': 'Homepage banner', 'listings': 'Listings хуудас',
    'search-results': 'Хайлтын үр дүн', 'featured': 'Featured listings'
  };
  let _adminAdsCache = null;
  let _adAddState = null;

  async function renderAdminAdsSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('ads').orderBy('createdAt', 'desc').get();
      _adminAdsCache = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
    } catch(e) {
      try {
        const snap = await db.collection('ads').get();
        _adminAdsCache = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
      } catch(e2) { _adminAdsCache = []; }
    }
    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <button class="btn btn-blue" onclick="openAdForm()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Шинэ сурталчилгаа нэмэх
        </button>
      </div>
      <div id="adFormWrap"></div>
      <div class="admin-list-table" id="adListWrap">
        ${_adminAdsCache.length === 0 ? adminEmptyState(ADMIN_EMPTY_ICON, 'Сурталчилгаа алга', 'Одоогоор идэвхтэй эсвэл идэвхгүй сурталчилгаа алга байна.') : _adminAdsCache.map(adminAdRow).join('')}
      </div>
    `;
  }

  function isAdCurrentlyActive(ad) {
    if (!ad.active) return false;
    const now = Date.now();
    if (ad.startDate && now < new Date(ad.startDate).getTime()) return false;
    if (ad.endDate && now > new Date(ad.endDate).getTime() + 86399999) return false;
    return true;
  }

  function adminAdRow(ad) {
    const live = isAdCurrentlyActive(ad);
    return `
      <div class="admin-row">
        <img class="admin-row-img" src="${esc(ad.image || '')}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(ad.title || '')}</div>
          <div class="admin-row-meta">${esc(ad.sponsorName || '')} · ${esc(AD_PLACEMENTS[ad.placement] || ad.placement)} · ${esc(ad.startDate || '?')} → ${esc(ad.endDate || '?')}</div>
          <span class="admin-status-pill status-${live ? 'active' : 'rejected'}">${live ? 'Идэвхтэй' : (ad.active ? 'Хугацаанаас гадуур' : 'Идэвхгүй')}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost" onclick="openAdForm('${ad.fsId}')">Засах</button>
          <button class="btn btn-ghost" onclick="adminToggleAd('${ad.fsId}', ${!ad.active})">${ad.active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</button>
          <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="adminDeleteAd('${ad.fsId}')">Устгах</button>
        </div>
      </div>
    `;
  }

  let _adEditingFsId = null;

  function openAdForm(fsId) {
    _adEditingFsId = fsId || null;
    const existing = fsId ? _adminAdsCache.find(a => a.fsId === fsId) : null;
    _adAddState = existing ? Object.assign({}, existing) : { title: '', image: '', targetUrl: '', placement: 'home-banner', startDate: '', endDate: '', active: true, sponsorName: '' };
    renderAdFormHtml();
  }

  // Reads whatever's currently in the form's own DOM fields back into _adAddState — called
  // before any action (like an image upload) that needs to re-paint the form, so that repaint
  // doesn't silently drop text the admin already typed into the other fields.
  function saveAdFormFieldsToState() {
    if (!document.getElementById('adTitle')) return;
    Object.assign(_adAddState, {
      title: document.getElementById('adTitle').value,
      sponsorName: document.getElementById('adSponsor').value,
      targetUrl: document.getElementById('adUrl').value,
      placement: document.getElementById('adPlacement').value,
      active: document.getElementById('adActive').value === 'true',
      startDate: document.getElementById('adStart').value,
      endDate: document.getElementById('adEnd').value
    });
  }

  function renderAdFormHtml() {
    const wrap = document.getElementById('adFormWrap');
    if (!wrap) return;
    const s = _adAddState;
    wrap.innerHTML = `
      <div class="admin-panel" style="margin-bottom:20px;">
        <div class="admin-panel-head">${_adEditingFsId ? 'Сурталчилгаа засах' : 'Шинэ сурталчилгаа'}</div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div class="form-row"><label class="form-label">Гарчиг<span class="req">*</span></label><input class="form-input" id="adTitle" value="${esc(s.title)}" maxlength="80" /></div>
          <div class="form-row"><label class="form-label">Ивээн тэтгэгчийн нэр<span class="req">*</span></label><input class="form-input" id="adSponsor" value="${esc(s.sponsorName)}" maxlength="60" /></div>
          <div class="form-row"><label class="form-label">Холбоос URL</label><input class="form-input" id="adUrl" value="${esc(s.targetUrl)}" placeholder="https://..." /></div>
          <div class="form-grid-2">
            <div><label class="form-label">Байршил</label>
              <select class="form-select" id="adPlacement">${Object.keys(AD_PLACEMENTS).map(k => `<option value="${k}" ${s.placement === k ? 'selected' : ''}>${AD_PLACEMENTS[k]}</option>`).join('')}</select>
            </div>
            <div><label class="form-label">Төлөв</label>
              <select class="form-select" id="adActive"><option value="true" ${s.active ? 'selected' : ''}>Идэвхтэй</option><option value="false" ${!s.active ? 'selected' : ''}>Идэвхгүй</option></select>
            </div>
          </div>
          <div class="form-grid-2">
            <div><label class="form-label">Эхлэх огноо</label><input type="date" class="form-input" id="adStart" value="${esc(s.startDate)}" /></div>
            <div><label class="form-label">Дуусах огноо</label><input type="date" class="form-input" id="adEnd" value="${esc(s.endDate)}" /></div>
          </div>
          <div class="form-row">
            <label class="form-label">Зураг</label>
            ${s.image ? `<img src="${esc(s.image)}" style="max-width:220px;border-radius:10px;border:1px solid var(--line);display:block;margin-bottom:8px;" />` : ''}
            <input type="file" accept="image/*" id="adImageInput" onchange="handleAdImageUpload(event)" />
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-blue" onclick="saveAd()">Хадгалах</button>
            <button class="btn btn-ghost" onclick="document.getElementById('adFormWrap').innerHTML='';">Цуцлах</button>
          </div>
        </div>
      </div>
    `;
  }

  function handleAdImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    saveAdFormFieldsToState();
    compressImageFile(file, 1200, 0.85).then(dataUrl => {
      _adAddState.image = dataUrl;
      renderAdFormHtml();
    }).catch(() => showToast('Зураг оруулахад алдаа гарлаа (8MB-аас бага зурган файл сонгоно уу)'));
  }

  async function saveAd() {
    const fsId = _adEditingFsId;
    const title = document.getElementById('adTitle')?.value.trim();
    const sponsorName = document.getElementById('adSponsor')?.value.trim();
    if (!title || !sponsorName) { showToast('Гарчиг болон ивээн тэтгэгчийн нэрийг бөглөнө үү'); return; }
    const doc = {
      title, sponsorName,
      targetUrl: document.getElementById('adUrl')?.value.trim() || '',
      placement: document.getElementById('adPlacement')?.value || 'home-banner',
      active: document.getElementById('adActive')?.value === 'true',
      startDate: document.getElementById('adStart')?.value || '',
      endDate: document.getElementById('adEnd')?.value || '',
      image: _adAddState.image || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (fsId) {
        await db.collection('ads').doc(fsId).update(doc);
        logAdminAction('update_ad', 'ad', fsId, title);
      } else {
        doc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        doc.createdBy = currentUser.uid;
        const ref = await db.collection('ads').add(doc);
        logAdminAction('create_ad', 'ad', ref.id, title);
      }
      showToast('Сурталчилгаа хадгалагдлаа', 'success');
      renderAdminDashboard('ads');
      if (typeof renderSiteAds === 'function') renderSiteAds();
    } catch(e) {
      console.error('saveAd failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminToggleAd(fsId, newActive) {
    try {
      await db.collection('ads').doc(fsId).update({ active: newActive });
      logAdminAction(newActive ? 'activate_ad' : 'deactivate_ad', 'ad', fsId, '');
      renderAdminDashboard('ads');
      if (typeof renderSiteAds === 'function') renderSiteAds();
    } catch(e) {
      console.error('adminToggleAd failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function adminDeleteAd(fsId) {
    if (!confirm('Энэ сурталчилгааг устгах уу?')) return;
    try {
      await db.collection('ads').doc(fsId).delete();
      logAdminAction('delete_ad', 'ad', fsId, '');
      showToast('Сурталчилгаа устгагдлаа', 'success');
      renderAdminDashboard('ads');
      if (typeof renderSiteAds === 'function') renderSiteAds();
    } catch(e) {
      console.error('adminDeleteAd failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== MODERATION (suspicious + duplicate listings) =====
  async function renderAdminModerationSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    await renderAdminFlaggedTab();
    // Append a real duplicate-listing scan below the existing flagged list — same signal
    // isDuplicateListing() (my-listings.js) uses at submit time (same owner, district, price,
    // area), just run across every active/pending listing instead of just the current user's.
    try {
      const snap = await db.collection('listings').where('status', 'in', ['active', 'pending']).get();
      const all = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
      const groups = {};
      all.forEach(d => {
        if (!d.ownerId || !d.district || !d.price || !d.area) return;
        const key = [d.ownerId, d.district, d.price, d.area].join('|');
        (groups[key] = groups[key] || []).push(d);
      });
      const dupGroups = Object.values(groups).filter(g => g.length > 1);
      const dupWrap = document.createElement('div');
      dupWrap.innerHTML = `
        <div class="admin-panel-head" style="margin-top:24px;">Магадгүй давхардсан зар (${dupGroups.length} бүлэг)</div>
        ${dupGroups.length === 0
          ? `<div style="padding:20px;color:var(--ink-3);font-size:13px;">Ижил эзэмшигч, дүүрэг, талбай, үнэтэй давхардсан зар олдсонгүй.</div>`
          : `<div class="admin-list-table">${dupGroups.map(g => g.map(d => adminListingRow(d)).join('')).join('<div style="height:2px;background:var(--line);margin:8px 0;"></div>')}</div>`}
      `;
      el.appendChild(dupWrap);
    } catch(e) {
      console.error('duplicate scan failed:', e.code, e.message);
    }
  }

  // ===== ANALYTICS (real data only) =====
  async function renderAdminAnalyticsSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    let listingsSnap, projectsSnap, usersCount = null;
    try { listingsSnap = await db.collection('listings').get(); } catch(e) { listingsSnap = null; }
    try { projectsSnap = await db.collection('projects').get(); } catch(e) { projectsSnap = null; }
    try { if (isOwnerUser()) { const u = await db.collection('users').get(); usersCount = u.size; } } catch(e) {}

    let totalViews = 0, totalFavorites = 0, totalContacts = 0;
    const byCat = {};
    if (listingsSnap) {
      listingsSnap.forEach(doc => {
        const d = doc.data();
        totalViews += d.viewCount || 0;
        totalFavorites += d.favoriteCount || 0;
        totalContacts += d.contactCount || 0;
        const cat = d.category || 'apartment';
        byCat[cat] = (byCat[cat] || 0) + 1;
      });
    }
    let projectViews = 0, projectContacts = 0;
    if (projectsSnap) projectsSnap.forEach(doc => { const d = doc.data(); projectViews += d.viewCount || 0; projectContacts += d.contactCount || 0; });

    const catLabels = { apartment: 'Орон сууц', house: 'Хаус', land: 'Газар', office: 'Оффис', rent: 'Түрээс' };
    el.innerHTML = `
      <div class="admin-stat-grid">
        ${usersCount != null ? `<div class="admin-stat-card"><div class="v">${usersCount}</div><div class="l">Хэрэглэгч</div></div>` : ''}
        <div class="admin-stat-card"><div class="v">${listingsSnap ? listingsSnap.size : '—'}</div><div class="l">Зар</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalViews)}</div><div class="l">Зарын үзэлт</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalFavorites)}</div><div class="l">Хадгалагдсан</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalContacts)}</div><div class="l">Холбогдсон (зар)</div></div>
        <div class="admin-stat-card"><div class="v">${projectsSnap ? projectsSnap.size : '—'}</div><div class="l">Шинэ орон сууцны төсөл</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(projectViews)}</div><div class="l">Төслийн үзэлт</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(projectContacts)}</div><div class="l">Холбогдсон (төсөл)</div></div>
      </div>
      <div class="admin-panel" style="margin-top:20px;">
        <div class="admin-panel-head">Ангилалаар</div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
          ${Object.keys(byCat).length === 0 ? '<div style="color:var(--ink-3);font-size:13px;">Дата алга.</div>' : Object.keys(byCat).map(c => `
            <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:6px 0;border-bottom:1px solid var(--line);">
              <span>${esc(catLabels[c] || c)}</span><strong>${byCat[c]}</strong>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head">Compare ашиглалт</div>
        <div style="padding:16px;color:var(--ink-3);font-size:13px;line-height:1.6;">Одоогоор энэ үзүүлэлтийг хэмжиж хадгалдаг backend алга — Compare нь зөвхөн тухайн session дотор, browser санах ойд л ажилладаг тул бодит тоо гаргах боломжгүй. Fake тоо харуулахгүй байна.</div>
      </div>
    `;
  }

  // ===== AUDIT LOG (owner only) =====
  async function renderAdminAuditLogSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink-3);">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(200).get();
      const items = snap.docs.map(d => d.data());
      if (items.length === 0) {
        el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Түүх алга', 'Одоогоор бүртгэгдсэн admin/owner үйлдэл алга байна.');
        return;
      }
      const actionLabels = {
        approve: 'Approve', reject: 'Reject', hide: 'Hide', delete: 'Устгах',
        verify: 'Баталгаажуулах', dismiss_reports: 'Report хаах', block_user: 'Блоклох',
        unblock_user: 'Блок цуцлах', grant_admin: 'Admin эрх өгсөн', revoke_admin: 'Admin эрх цуцалсан',
        create_ad: 'Ad үүсгэсэн', update_ad: 'Ad засварласан', delete_ad: 'Ad устгасан',
        activate_ad: 'Ad идэвхжүүлсэн', deactivate_ad: 'Ad идэвхгүй болгосон', unhide: 'Дахин нийтлэх'
      };
      el.innerHTML = `<div class="admin-list-table">${items.map(l => `
        <div class="admin-row" style="align-items:flex-start;">
          <div class="admin-row-body">
            <div class="admin-row-title">${esc(actionLabels[l.action] || l.action)} <span style="color:var(--ink-3);font-weight:500;">· ${esc(l.targetType)} ${esc(l.targetId)}</span></div>
            <div class="admin-row-meta">${esc(l.actorEmail)} (${esc(roleLabel(l.actorRole))}) · ${l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : '—'}</div>
            ${l.reason ? `<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px;">Шалтгаан: ${esc(l.reason)}</div>` : ''}
          </div>
        </div>
      `).join('')}</div>`;
    } catch(e) {
      console.error('renderAdminAuditLogSection failed:', e.code, e.message);
      el.innerHTML = adminEmptyState(ADMIN_EMPTY_ICON, 'Ачаалж чадсангүй', 'Дахин оролдоно уу.');
    }
  }
