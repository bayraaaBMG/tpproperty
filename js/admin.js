  // ===== ADMIN DASHBOARD — Owner / Admin control center =====
  // Every privileged read/write triggered from this file is re-enforced in firestore.rules —
  // this file is the UI layer only. See js/permissions.js for isOwnerUser()/isAdminUser()/
  // isAdminOrOwnerUser() (the single source of truth for role checks) and logAdminAction()
  // (the audit-log writer every mutating action below calls). guardAdminRoute(), called from
  // showPage('admin') before this file ever runs, is what actually keeps a non-admin out —
  // the currentUser.role check here is redundant-on-purpose defense in depth, not the real gate.
  //
  // Deliberately flat: 6 top-level sections (Нүүр/Зарууд/Хэрэглэгчид/Шинэ орон сууц/
  // Сурталчилгаа/Тохиргоо), no nested menu groups. What used to be separate "Moderation" and
  // "Analytics" sidebar items now live inside Зарууд (the "Report авсан" tab folds in
  // reports + price anomalies + a duplicate-listing scan) and Нүүр (the KPI row) respectively;
  // the full numeric breakdown and the audit log both moved into Тохиргоо.

  const ADMIN_NAV = [
    { id: 'overview', label: 'Нүүр' },
    { id: 'listings', label: 'Зарууд' },
    { id: 'users', label: 'Agent-ууд', ownerOnly: true },
    { id: 'projects', label: 'Шинэ орон сууц' },
    { id: 'ads', label: 'Сурталчилгаа' },
    { id: 'settings', label: 'Тохиргоо' }
  ];

  const ADMIN_ACTION_LABELS = {
    approve: 'Approve', reject: 'Reject', hide: 'Hide', unhide: 'Дахин нийтлэх', delete: 'Устгах',
    verify: 'Баталгаажуулах', dismiss_reports: 'Report хаах', block_user: 'Блоклох',
    unblock_user: 'Блок цуцлах', grant_admin: 'Admin эрх өгсөн', revoke_admin: 'Admin эрх цуцалсан',
    create_ad: 'Ad үүсгэсэн', update_ad: 'Ad засварласан', delete_ad: 'Ad устгасан',
    activate_ad: 'Ad идэвхжүүлсэн', deactivate_ad: 'Ad идэвхгүй болгосон',
    activate_agent: 'Agent идэвхжүүлсэн', deactivate_agent: 'Agent идэвхгүй болгосон',
    revoke_agent: 'Agent цуцалсан', invite_agent: 'Agent урьсан',
    mark_sold: 'Зарагдсан болгосон', mark_rented: 'Түрээслэгдсэн болгосон'
  };

  let _adminSection = 'overview';

  async function renderAdminDashboard(section) {
    const el = document.getElementById('adminContent');
    if (!el) return;
    if (!guardAdminRoute()) return; // defense-in-depth — showPage() already guards this

    if (section) _adminSection = section;
    const owner = isOwnerUser();
    const validIds = ADMIN_NAV.filter(it => !it.ownerOnly || owner).map(it => it.id);
    if (!validIds.includes(_adminSection)) _adminSection = 'overview';

    renderAdminHeaderBar();

    el.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar" id="adminSidebar">
          ${ADMIN_NAV.filter(it => !it.ownerOnly || owner).map(it => `<button class="admin-nav-item ${_adminSection === it.id ? 'active' : ''}" onclick="renderAdminDashboard('${it.id}'); closeAdminSidebar();">${esc(it.label)}</button>`).join('')}
        </aside>
        <button type="button" class="admin-sidebar-overlay" id="adminSidebarOverlay" onclick="closeAdminSidebar()" aria-label="Хаах"></button>
        <div class="admin-main">
          <div id="adminSectionContent"><div class="admin-loading">Ачааллаж байна…</div></div>
        </div>
      </div>
    `;

    const s = _adminSection;
    if (s === 'overview') await renderAdminOverview();
    else if (s === 'listings') await renderAdminListingsSection();
    else if (s === 'users' && owner) await renderAdminUsersSection();
    else if (s === 'projects') await renderAdminProjectsSection();
    else if (s === 'ads') await renderAdminAdsSection();
    else if (s === 'settings') await renderAdminSettingsSection();
  }

  function renderAdminHeaderBar() {
    const bar = document.getElementById('adminHeaderBar');
    if (!bar) return;
    const owner = isOwnerUser();
    const letter = esc(((currentUser.name || currentUser.email || '?')[0] || '?').toUpperCase());
    bar.innerHTML = `
      <div class="admin-topbar">
        <div class="admin-topbar-left">
          <button type="button" class="admin-topbar-menu-btn" onclick="openAdminSidebar()" aria-label="Цэс">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div class="admin-topbar-logo"><img src="/img/logo-mark.png" alt="TP Property" /></div>
          <span class="admin-topbar-title">TP Property Удирдлага</span>
          <span class="admin-role-badge ${owner ? 'owner' : ''}">${owner ? 'OWNER' : 'ADMIN'}</span>
        </div>
        <div class="admin-topbar-right">
          <div class="admin-topbar-avatar" title="${esc(currentUser.email || '')}">${letter}</div>
          <button class="btn btn-ghost admin-topbar-back" onclick="showPage('home')">Сайт руу буцах</button>
        </div>
      </div>
    `;
  }

  function openAdminSidebar() {
    document.getElementById('adminSidebar')?.classList.add('open');
    document.getElementById('adminSidebarOverlay')?.classList.add('open');
  }
  function closeAdminSidebar() {
    document.getElementById('adminSidebar')?.classList.remove('open');
    document.getElementById('adminSidebarOverlay')?.classList.remove('open');
  }

  function adminSectionEl() { return document.getElementById('adminSectionContent'); }

  function adminEmptyState(title, sub) {
    return `
      <div class="admin-state-block">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink-3);opacity:0.35;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
        <div class="admin-state-title">${esc(title)}</div>
        <div class="admin-state-sub">${esc(sub)}</div>
      </div>
    `;
  }

  // Used everywhere a fetch can genuinely fail (network/permission) — always names the
  // reason and gives a real retry action, instead of a dead-end blank state.
  function adminErrorState(reason, retryCall) {
    return `
      <div class="admin-state-block">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.8" style="opacity:0.6;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
        <div class="admin-state-title">Ачаалж чадсангүй</div>
        <div class="admin-state-sub">${esc(reason)}</div>
        <button class="btn btn-blue" onclick="${retryCall}">Дахин оролдох</button>
      </div>
    `;
  }

  // ===== COMPACT ACTION MENU (shared by every row type) =====
  function adminActionMenu(menuId, actions) {
    const list = actions.filter(Boolean);
    if (!list.length) return '';
    return `
      <div class="admin-menu">
        <button type="button" class="admin-menu-trigger" onclick="toggleAdminMenu(event, '${menuId}')" aria-label="Үйлдлүүд">⋮</button>
        <div class="admin-menu-list" id="admMenu-${menuId}">
          ${list.map(a => `<button type="button" class="admin-menu-item${a.danger ? ' danger' : ''}" onclick="closeAllAdminMenus(); ${a.onclick}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>
    `;
  }
  function toggleAdminMenu(e, id) {
    e.stopPropagation();
    const target = document.getElementById('admMenu-' + id);
    const wasOpen = target?.classList.contains('open');
    closeAllAdminMenus();
    if (target && !wasOpen) target.classList.add('open');
  }
  function closeAllAdminMenus() {
    document.querySelectorAll('.admin-menu-list.open').forEach(el => el.classList.remove('open'));
  }
  document.addEventListener('click', closeAllAdminMenus);

  // ===== OVERVIEW (Нүүр) =====
  // Every KPI/attention figure below is tracked as { ok, value } rather than defaulting a
  // failed fetch to 0 — a permission-denied or network error must never render as if it
  // were a genuine zero. adminKpiCard()/adminAttentionRow() branch on `ok` to show an
  // explicit "Ачаалж чадсангүй" in that one card instead of a number.
  async function renderAdminOverview() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    const owner = isOwnerUser();

    const listingsResult = await adminSafeFetch(() => db.collection('listings').get());
    if (!listingsResult.ok) {
      el.innerHTML = adminErrorState('Зарын өгөгдөл татахад алдаа гарлаа (' + (listingsResult.code || 'алдаа') + ').', `renderAdminOverview()`);
      return;
    }
    const listingsSnap = listingsResult.value;

    const usersResult = owner ? await adminSafeFetch(() => db.collection('users').get()) : null;
    const reportsResult = await adminSafeFetch(() => db.collection('reports').where('status', '==', 'pending').get());
    const dupGroupsResult = await adminSafeFetch(() => adminFetchDuplicateGroups());

    const byStatus = {};
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    let newThisMonth = 0;
    listingsSnap.forEach(doc => {
      const d = doc.data();
      const st = d.status || 'active';
      byStatus[st] = (byStatus[st] || 0) + 1;
      const createdAt = d.createdAt?.toDate?.();
      if (createdAt && createdAt >= monthStart) newThisMonth++;
    });
    const pendingCount = byStatus.pending || 0;
    const reportedCount = reportsResult.ok
      ? { ok: true, value: new Set(reportsResult.value.docs.map(d => d.data().listingFsId).filter(Boolean)).size }
      : { ok: false };
    const dupGroupCount = dupGroupsResult.ok ? { ok: true, value: dupGroupsResult.value.length } : { ok: false };
    // Agent counts scoped to role:'user' specifically (admin/owner aren't "Agent" accounts
    // for CRM purposes even though they always pass isApprovedAgent()) — same single
    // users.get() fetch above, split into total/active/inactive.
    let totalAgentCount = { ok: false }, activeAgentCount = { ok: false }, inactiveAgentCount = { ok: false };
    if (usersResult && usersResult.ok) {
      const agentDocs = usersResult.value.docs.filter(d => (d.data().role || 'user') === 'user');
      const active = agentDocs.filter(d => d.data().agentActive === true).length;
      totalAgentCount = { ok: true, value: agentDocs.length };
      activeAgentCount = { ok: true, value: active };
      inactiveAgentCount = { ok: true, value: agentDocs.length - active };
    }

    const quickActions = [
      { label: 'Зар шалгах', onclick: `adminGoToListingsTab('pending')` },
      owner ? { label: 'Хэрэглэгч хайх', onclick: `adminGoToUsers(true)` } : null,
      owner ? { label: 'Admin эрх өгөх', onclick: `adminGoToUsers(true)` } : null,
      { label: 'Сурталчилгаа нэмэх', onclick: `renderAdminDashboard('ads'); setTimeout(()=>openAdForm(), 250);` }
    ].filter(Boolean);

    el.innerHTML = `
      <div class="admin-kpi-grid">
        ${adminKpiCard('Нийт зар', { ok: true, value: listingsSnap.size })}
        ${adminKpiCard('Идэвхтэй зар', { ok: true, value: byStatus.active || 0 })}
        ${adminKpiCard('Зарагдсан', { ok: true, value: byStatus.sold || 0 })}
        ${adminKpiCard('Түрээслэгдсэн', { ok: true, value: byStatus.rented || 0 })}
        ${adminKpiCard('Энэ сарын шинэ зар', { ok: true, value: newThisMonth })}
        ${adminKpiCard('Хүлээгдэж буй', { ok: true, value: pendingCount })}
        ${owner ? adminKpiCard('Нийт Agent', totalAgentCount) : ''}
        ${owner ? adminKpiCard('Идэвхтэй Agent', activeAgentCount) : ''}
        ${owner ? adminKpiCard('Идэвхгүй Agent', inactiveAgentCount) : ''}
        ${adminKpiCard('Report авсан', reportedCount)}
      </div>

      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head">Хурдан үйлдэл</div>
        <div class="admin-quick-actions">
          ${quickActions.map(a => `<button class="btn btn-ghost" onclick="${a.onclick}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>

      <div class="admin-two-col">
        <div class="admin-panel">
          <div class="admin-panel-head">Сүүлийн үйлдлүүд</div>
          <div id="adminRecentActions"><div class="admin-loading">Ачааллаж байна…</div></div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-head">Анхаарах зүйлс</div>
          <div>
            ${adminAttentionRow('Хүлээгдэж буй зар', { ok: true, value: pendingCount }, `adminGoToListingsTab('pending')`)}
            ${adminAttentionRow('Report авсан зар', reportedCount, `adminGoToListingsTab('flagged')`)}
            ${adminAttentionRow('Магадгүй давхардсан бүлэг', dupGroupCount, `adminGoToListingsTab('flagged')`)}
          </div>
        </div>
      </div>
    `;
    loadRecentActions(owner);
  }

  // Wraps any Firestore call into a uniform { ok, value } / { ok:false, code } result — the
  // one place that decides "this genuinely returned data" vs "this threw", so nothing
  // downstream has to guess from a bare try/catch whether a 0 is real.
  async function adminSafeFetch(fn) {
    try { return { ok: true, value: await fn() }; }
    catch(e) { console.error('adminSafeFetch failed:', e.code, e.message); return { ok: false, code: e.code }; }
  }

  function adminKpiCard(label, result) {
    if (!result.ok) {
      return `<div class="admin-kpi-card"><div class="v" style="font-size:12.5px;color:var(--danger);">Ачаалж чадсангүй</div><div class="l">${esc(label)}</div></div>`;
    }
    return `<div class="admin-kpi-card"><div class="v">${result.value}</div><div class="l">${esc(label)}</div></div>`;
  }

  function adminAttentionRow(label, result, onclick) {
    if (!result.ok) {
      return `
        <div class="admin-attention-row" style="cursor:default;">
          <span class="admin-attention-label">${esc(label)}</span>
          <span class="admin-attention-count" style="background:rgba(255,71,87,0.1);color:var(--danger);">Алдаа</span>
        </div>
      `;
    }
    return `
      <button type="button" class="admin-attention-row" onclick="${onclick}">
        <span class="admin-attention-label">${esc(label)}</span>
        <span class="admin-attention-count ${result.value > 0 ? 'has-items' : ''}">${result.value}</span>
      </button>
    `;
  }

  function adminGoToListingsTab(tab) {
    _adminListingsTab = tab;
    renderAdminDashboard('listings');
  }
  function adminGoToUsers(focusSearch) {
    renderAdminDashboard('users');
    if (focusSearch) setTimeout(() => document.getElementById('adminUserSearch')?.focus(), 350);
  }

  // where()+orderBy() on different fields needs a composite index this project hasn't
  // provisioned — the admin-scoped query below fetches by actorUid alone (single-field,
  // no index needed) and sorts client-side instead of adding an orderBy.
  async function loadRecentActions(owner) {
    const wrap = document.getElementById('adminRecentActions');
    if (!wrap) return;
    try {
      let docs;
      if (owner) {
        const snap = await db.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(8).get();
        docs = snap.docs;
      } else {
        const snap = await db.collection('adminAuditLogs').where('actorUid', '==', currentUser.uid).limit(30).get();
        docs = snap.docs
          .sort((a, b) => (b.data().timestamp?.toMillis?.() || 0) - (a.data().timestamp?.toMillis?.() || 0))
          .slice(0, 8);
      }
      if (!docs.length) { wrap.innerHTML = `<div class="admin-empty-inline">Одоогоор бүртгэгдсэн үйлдэл алга.</div>`; return; }
      wrap.innerHTML = docs.map(d => {
        const l = d.data();
        return `
          <div class="admin-recent-item">
            <span class="admin-recent-action">${esc(ADMIN_ACTION_LABELS[l.action] || l.action)} <span style="color:var(--ink-3);font-weight:500;">· ${esc(l.targetType || '')}</span></span>
            <span class="admin-recent-meta">${l.timestamp?.toDate ? l.timestamp.toDate().toLocaleDateString() : '—'}</span>
          </div>
        `;
      }).join('');
    } catch(e) {
      console.error('loadRecentActions failed:', e.code, e.message);
      wrap.innerHTML = adminErrorState('Үйлдлийн түүх татахад алдаа гарлаа.', `loadRecentActions(${owner})`);
    }
  }

  // ===== LISTINGS (Зарууд) — one unified table, tabbed =====
  const LISTINGS_TABS = [
    { id: 'all', label: 'Бүгд' },
    { id: 'pending', label: 'Хүлээгдэж буй' },
    { id: 'active', label: 'Нийтлэгдсэн' },
    { id: 'rejected', label: 'Татгалзсан' },
    { id: 'flagged', label: 'Report авсан' }
  ];
  let _adminListingsTab = 'pending';

  async function renderAdminListingsSection(tab) {
    if (tab) _adminListingsTab = tab;
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `
      <div class="admin-tabs">
        ${LISTINGS_TABS.map(t => `<button class="mytab ${_adminListingsTab === t.id ? 'active' : ''}" onclick="renderAdminListingsSection('${t.id}')">${esc(t.label)}</button>`).join('')}
      </div>
      <div id="adminListingsTableWrap"><div class="admin-loading">Ачааллаж байна…</div></div>
    `;
    await loadAndRenderListingsTab(_adminListingsTab);
  }

  async function loadAndRenderListingsTab(tab) {
    const wrap = document.getElementById('adminListingsTableWrap');
    if (!wrap) return;
    if (tab === 'flagged') {
      const rows = await buildFlaggedRows();
      renderListingsTableRows(wrap, rows, 'Одоогоор мэдээлэгдсэн, үнийн хэвийн бус эсвэл давхардсан зар олдсонгүй.', `renderAdminListingsSection('flagged')`);
      return;
    }
    const statusMap = { all: ['pending', 'active', 'rejected', 'expired', 'sold', 'rented'], pending: ['pending'], active: ['active'], rejected: ['rejected'] };
    const rawItems = await adminFetchListingsByStatus(statusMap[tab] || ['pending']);
    if (rawItems === null) {
      wrap.innerHTML = adminErrorState('Зарын жагсаалт татахад алдаа гарлаа.', `renderAdminListingsSection('${tab}')`);
      return;
    }
    const rows = rawItems.map(normalizeListingRow);
    renderListingsTableRows(wrap, rows, 'Энэ ангилалд зар алга байна.', `renderAdminListingsSection('${tab}')`);
  }

  function renderListingsTableRows(wrap, rows, emptyMsg) {
    if (!wrap) return;
    if (rows.length === 0) { wrap.innerHTML = adminEmptyState('Хоосон байна', emptyMsg); return; }
    wrap.innerHTML = `<div class="admin-list-table">${rows.map(adminListingRow).join('')}</div>`;
  }

  // Normalizes either shape this file ever deals with into one row shape: a raw Firestore
  // listing doc (fsId set by the caller, has sellerName/createdAt directly — see
  // adminFetchListingsByStatus/the duplicate scan below) or a local `listings` array entry
  // (has firestoreId/id, seller info lives in the separate sellerData lookup, date is
  // _createdAtMs — see data.js/auth.js).
  function normalizeListingRow(source) {
    const isLocalShape = !!source.firestoreId;
    const fsId = source.fsId || source.firestoreId;
    let sellerName, dateText;
    if (isLocalShape) {
      sellerName = (sellerData[source.id] && sellerData[source.id].name) || 'Тодорхойгүй';
      dateText = source._createdAtMs ? new Date(source._createdAtMs).toLocaleDateString() : '—';
    } else {
      sellerName = source.sellerName || 'Тодорхойгүй';
      dateText = source.createdAt?.toDate ? source.createdAt.toDate().toLocaleDateString() : (source.updatedAt?.toDate ? source.updatedAt.toDate().toLocaleDateString() : '—');
    }
    return {
      fsId,
      img: source.img || (source.images && source.images[0]) || '',
      title: source.title || '',
      sellerName, dateText,
      price: source.price || 0,
      status: source.status || 'active',
      reportCount: source.reportCount || 0,
      rejectionReason: source.rejectionReason || '',
      ownerId: source.ownerId || null,
      flagReasons: null, reportIds: null
    };
  }

  async function buildFlaggedRows() {
    const reportsByListing = await fetchPendingReportsGrouped();
    const anomalies = computePriceAnomalies();
    const flagged = {};

    Object.keys(reportsByListing).forEach(fsId => {
      const l = listings.find(x => x.firestoreId === fsId);
      if (!l) return;
      flagged[fsId] = flagged[fsId] || { source: l, reasons: [], reportIds: [] };
      flagged[fsId].reasons.push(...reportsByListing[fsId].reasons.map(r => 'Мэдээлэгдсэн: ' + r));
      flagged[fsId].reportIds = reportsByListing[fsId].reportIds;
    });
    anomalies.forEach(({ l, val }) => {
      if (!l.firestoreId) return;
      flagged[l.firestoreId] = flagged[l.firestoreId] || { source: l, reasons: [], reportIds: [] };
      flagged[l.firestoreId].reasons.push(`Зах зээлийн дундаж үнээс ${Math.abs(Math.round(val.diffPct * 100))}% хямд (${val.basisText})`);
    });
    try {
      const groups = await adminFetchDuplicateGroups();
      groups.forEach(group => group.forEach(d => {
        flagged[d.fsId] = flagged[d.fsId] || { source: d, reasons: [], reportIds: [] };
        flagged[d.fsId].reasons.push('Магадгүй давхардсан зар (ижил эзэмшигч/дүүрэг/талбай/үнэ)');
      }));
    } catch(e) { console.error('duplicate scan failed:', e.code, e.message); }

    return Object.values(flagged)
      .sort((a, b) => b.reasons.length - a.reasons.length)
      .map(({ source, reasons, reportIds }) => Object.assign(normalizeListingRow(source), { flagReasons: reasons, reportIds }));
  }

  // Same real signal isDuplicateListing() (my-listings.js) uses at submit time — same owner,
  // district, price, area — just run across every active/pending listing instead of one
  // user's own. Shared by the Зарууд "Report авсан" tab and the Нүүр "Анхаарах зүйлс" count.
  async function adminFetchDuplicateGroups() {
    const snap = await db.collection('listings').where('status', 'in', ['active', 'pending']).get();
    const groups = {};
    snap.docs.forEach(doc => {
      const d = Object.assign({ fsId: doc.id }, doc.data());
      if (!d.ownerId || !d.district || !d.price || !d.area) return;
      const key = [d.ownerId, d.district, d.price, d.area].join('|');
      (groups[key] = groups[key] || []).push(d);
    });
    return Object.values(groups).filter(g => g.length > 1);
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

  // Fetched straight from Firestore rather than the local `listings` array, since that array
  // only ever holds the current visitor's OWN listings plus whatever's publicly active — an
  // admin needs to see every user's listing in every status. Returns null (not []) on a real
  // fetch failure so the caller can tell "empty" apart from "couldn't load".
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
      return null;
    }
  }

  // The admin listings table is fetched straight from Firestore and only carries the real
  // document's own fields — never the client-only numeric `id` that openListing() keys off
  // (that id is assigned when a listing loads into the local `listings` array, see
  // data.js/auth.js). Resolve it by firestoreId here instead of threading a numeric id
  // through data that was never fetched that way.
  function adminOpenListingByFsId(fsId) {
    const l = listings.find(x => x.firestoreId === fsId);
    if (!l) { showToast('Энэ зар одоогоор жагсаалтад олдсонгүй'); return; }
    showPage('listings');
    setTimeout(() => openListing(l.id), 150);
  }

  const LISTING_STATUS_LABELS = { pending: 'Хүлээгдэж буй', active: 'Нийтлэгдсэн', rejected: 'Татгалзсан', expired: 'Хугацаа дууссан', sold: 'Зарагдсан', rented: 'Түрээслэгдсэн' };

  function adminListingRow(row) {
    const menuActions = [];
    if (row.flagReasons) menuActions.push({ label: 'Баталгаажуулах', onclick: `adminVerifyListing('${row.fsId}')` });
    if (row.status === 'pending') {
      menuActions.push({ label: 'Approve', onclick: `adminApproveListing('${row.fsId}')` });
      menuActions.push({ label: 'Reject', onclick: `adminRejectListing('${row.fsId}')`, danger: true });
      menuActions.push({ label: 'Устгах', onclick: `adminDeleteListing('${row.fsId}')`, danger: true });
    } else if (row.status === 'rejected') {
      menuActions.push({ label: 'Approve', onclick: `adminApproveListing('${row.fsId}')` });
      menuActions.push({ label: 'Устгах', onclick: `adminDeleteListing('${row.fsId}')`, danger: true });
    } else if (row.status === 'active') {
      menuActions.push({ label: 'Зарагдсан болгох', onclick: `adminMarkListingStatus('${row.fsId}', 'sold')` });
      menuActions.push({ label: 'Түрээслэгдсэн болгох', onclick: `adminMarkListingStatus('${row.fsId}', 'rented')` });
      menuActions.push({ label: 'Нуух', onclick: `adminArchiveListing('${row.fsId}')` });
      menuActions.push({ label: 'Устгах', onclick: `adminDeleteListing('${row.fsId}')`, danger: true });
      if (row.ownerId) menuActions.push({ label: 'Хэрэглэгч блоклох', onclick: `adminBlockUser('${row.ownerId}')`, danger: true });
    } else {
      menuActions.push({ label: 'Устгах', onclick: `adminDeleteListing('${row.fsId}')`, danger: true });
    }
    if (row.flagReasons && row.reportIds && row.reportIds.length) {
      menuActions.push({ label: 'Report хаах', onclick: `adminDismissReports('${row.fsId}', ${JSON.stringify(row.reportIds).replace(/"/g, '&quot;')})` });
    }
    return `
      <div class="admin-row">
        <img class="admin-row-img" src="${esc(row.img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(row.title)}</div>
          <div class="admin-row-meta">${esc(row.sellerName)} · ${fmtPrice(row.price)} · ${esc(row.dateText)}
            ${row.reportCount ? ` · <span style="color:var(--danger);font-weight:700;">${row.reportCount} report</span>` : ''}
          </div>
          <span class="admin-status-pill status-${row.status === 'active' ? 'active' : (row.status === 'pending' ? 'pending' : 'rejected')}">${esc(LISTING_STATUS_LABELS[row.status] || row.status)}</span>
          ${row.flagReasons ? `<div class="admin-row-flag" title="${esc(row.flagReasons.join('; '))}">⚠ ${row.flagReasons.length} шалтгаанаар анхаарал татаж байна</div>` : ''}
          ${row.status === 'rejected' && row.rejectionReason ? `<div class="admin-row-reject-reason">Шалтгаан: ${esc(row.rejectionReason)}</div>` : ''}
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost" onclick="adminOpenListingByFsId('${row.fsId}')">Харах</button>
          ${adminActionMenu(row.fsId, menuActions)}
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
      renderAdminListingsSection();
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
      renderAdminListingsSection();
    } catch(e) {
      console.error('adminDismissReports failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  async function adminApproveListing(fsId) {
    try {
      await db.collection('listings').doc(fsId).update({ status: 'active', listingVerified: true, rejectionReason: '' });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) { l.status = 'active'; l._inactive = false; l._expired = false; l.listingVerified = true; l.rejectionReason = ''; }
      logAdminAction('approve', 'listing', fsId, '');
      showToast('Зар батлагдлаа', 'success');
      renderAdminListingsSection();
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
      renderAdminListingsSection();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminRejectListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // "Нуух" files an active (or flagged) listing under Expired — same status a listing
  // reaches on its own after 30 days, just admin/owner-triggered. Never a hard delete.
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
      renderAdminListingsSection();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminArchiveListing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // Marks a listing sold/rented from the admin side (the owning agent can already do this
  // themselves via firestore.rules' owner self-update rule — this is the same status value,
  // just admin/owner-triggered). No rules change needed: the moderation update rule already
  // permits any status value within ['status','listingVerified','rejectionReason'].
  async function adminMarkListingStatus(fsId, status) {
    try {
      await db.collection('listings').doc(fsId).update({ status });
      const l = listings.find(x => x.firestoreId === fsId);
      if (l) { l.status = status; l._inactive = true; }
      logAdminAction(status === 'sold' ? 'mark_sold' : 'mark_rented', 'listing', fsId, '');
      showToast(status === 'sold' ? 'Зарагдсан болголоо' : 'Түрээслэгдсэн болголоо', 'success');
      renderAdminListingsSection();
      renderListings(getFilteredListings()); renderHomeListings();
    } catch(e) {
      console.error('adminMarkListingStatus failed:', e.code, e.message);
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
      renderAdminListingsSection();
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
      renderAdminUsersSection();
    } catch(e) {
      console.error('adminUnblockUser failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== AGENTS (closed brokerage system) =====
  // agentActive is the real, firestore.rules-enforced gate for "can this account create/edit/
  // delete listings" — see firestore.rules' isApprovedAgent() and js/permissions.js's client
  // mirror of the same check. These three mirror adminBlockUser/adminUnblockUser exactly.
  async function adminActivateAgent(uid) {
    if (!uid) return;
    try {
      await db.collection('users').doc(uid).set({ agentActive: true }, { merge: true });
      logAdminAction('activate_agent', 'user', uid, '');
      showToast('Agent идэвхжлээ', 'success');
      renderAdminUsersSection();
    } catch(e) {
      console.error('adminActivateAgent failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function adminDeactivateAgent(uid) {
    if (!uid) return;
    try {
      await db.collection('users').doc(uid).set({ agentActive: false }, { merge: true });
      logAdminAction('deactivate_agent', 'user', uid, '');
      showToast('Agent идэвхгүй боллоо', 'success');
      renderAdminUsersSection();
    } catch(e) {
      console.error('adminDeactivateAgent failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  // "Устгах" — there's no backend/Admin SDK here, so a real Firebase Auth account can't be
  // deleted from the client. Full revocation (agentActive off + blocked) is the closest
  // equivalent: the person can no longer sign in to do anything meaningful, but their
  // historical listings and audit-log entries are preserved rather than orphaned/erased.
  async function adminRevokeAgent(uid, name) {
    if (!uid) return;
    if (!confirm(`${name || 'Энэ агент'}-ийг бүрмөсөн цуцлах уу? Цаашид нэвтэрч зар нэмэх, засах боломжгүй болно.`)) return;
    try {
      await db.collection('users').doc(uid).set({ agentActive: false, blocked: true }, { merge: true });
      logAdminAction('revoke_agent', 'user', uid, name || '');
      showToast('Agent цуцлагдлаа', 'success');
      renderAdminUsersSection();
    } catch(e) {
      console.error('adminRevokeAgent failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // "Agent нэмэх" — works whether or not the person has ever signed in yet. If a users/{uid}
  // doc with this email already exists, activate it directly (same as the row action). If
  // not, pre-authorize the email via agentInvites/{email} — firestore.rules' users/{uid}
  // create rule checks this collection and lets that person's very first sign-in bootstrap
  // straight into agentActive:true (see js/auth.js checkAgentInvite()).
  function openAgentInviteModal() {
    const email = (prompt('Agent-ийн имэйл хаягийг оруулна уу:') || '').trim().toLowerCase();
    if (!email) return;
    submitAgentInvite(email);
  }
  async function submitAgentInvite(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Зөв имэйл хаяг оруулна уу'); return; }
    try {
      const existing = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!existing.empty) {
        await adminActivateAgent(existing.docs[0].id);
        return;
      }
      await db.collection('agentInvites').doc(email).set({
        email,
        invitedBy: currentUser.uid,
        invitedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      logAdminAction('invite_agent', 'agentInvite', email, '');
      showToast('Урилга бүртгэгдлээ. Тухайн хүн анх удаа нэвтрэх үедээ Agent болно.', 'success');
    } catch(e) {
      console.error('submitAgentInvite failed:', e.code, e.message);
      showToast('Урилга илгээхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== USERS (Хэрэглэгчид, owner only) =====
  let _adminUsersCache = null;
  let _adminUsersSearch = '';
  let _adminUsersRoleFilter = 'all';

  async function renderAdminUsersSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('users').get();
      _adminUsersCache = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
    } catch(e) {
      console.error('renderAdminUsersSection failed:', e.code, e.message);
      el.innerHTML = adminErrorState('Хэрэглэгчдийн жагсаалт татахад алдаа гарлаа.', `renderAdminUsersSection()`);
      return;
    }
    // Per-owner performance — one pass over the public+own-visible local array is not
    // exhaustive (admin needs every user's data), so this queries Firestore directly. One
    // read for the whole section; computeAgentStats() (js/utils.js) is the same function
    // js/dashboard.js uses for an agent's own view, so the two can never disagree.
    let listingsByOwner = {};
    try {
      const lsnap = await db.collection('listings').get();
      lsnap.forEach(doc => {
        const d = doc.data();
        if (!d.ownerId) return;
        (listingsByOwner[d.ownerId] = listingsByOwner[d.ownerId] || []).push({
          status: d.status || 'active', viewCount: d.viewCount || 0,
          createdAtMs: d.createdAt?.toMillis?.() || 0, title: d.title, img: d.img
        });
      });
    } catch(e) {}
    _adminUsersCache.forEach(u => { u._stats = computeAgentStats(listingsByOwner[u.uid] || []); });
    renderAdminUsersList();
  }

  function renderAdminUsersList() {
    const el = adminSectionEl();
    if (!el || !_adminUsersCache) return;
    const q = _adminUsersSearch.trim().toLowerCase();
    const items = _adminUsersCache.filter(u => {
      if (_adminUsersRoleFilter !== 'all' && (u.role || 'user') !== _adminUsersRoleFilter) return false;
      if (!q) return true;
      const name = ((u.lastName || '') + ' ' + (u.firstName || '')).toLowerCase();
      return name.includes(q) || (u.email || '').toLowerCase().includes(q);
    });
    const roleFilters = [{ id: 'all', label: 'Бүгд' }, { id: 'owner', label: 'Owner' }, { id: 'admin', label: 'Admin' }, { id: 'user', label: 'Agent' }];
    el.innerHTML = `
      <div class="admin-search-row" style="display:flex;gap:10px;max-width:520px;">
        <input type="text" class="form-input" id="adminUserSearch" placeholder="Нэр эсвэл email хайх" value="${esc(_adminUsersSearch)}" oninput="adminFilterUsers(this.value)" style="flex:1;" />
        <button class="btn btn-blue" style="white-space:nowrap;" onclick="openAgentInviteModal()">Agent нэмэх</button>
      </div>
      <div class="admin-tabs">
        ${roleFilters.map(r => `<button class="mytab ${_adminUsersRoleFilter === r.id ? 'active' : ''}" onclick="adminSetUsersRoleFilter('${r.id}')">${r.label}</button>`).join('')}
      </div>
      <div class="admin-list-table">
        ${items.length === 0 ? adminEmptyState('Хэрэглэгч олдсонгүй', 'Хайлтын нөхцлөө өөрчилж үзнэ үү.') : items.map(u => adminUserRow(u)).join('')}
      </div>
    `;
  }

  function adminFilterUsers(val) { _adminUsersSearch = val; renderAdminUsersList(); }
  function adminSetUsersRoleFilter(role) { _adminUsersRoleFilter = role; renderAdminUsersList(); }

  function adminUserRow(u) {
    const isSelf = currentUser && currentUser.uid === u.uid;
    const role = u.role || 'user';
    const name = ((u.lastName || '') + ' ' + (u.firstName || '')).trim() || 'Нэргүй';
    const created = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—';
    const statusPill = u.blocked ? '<span class="admin-status-pill status-rejected">Блоклогдсон</span>' : '<span class="admin-status-pill status-active">Идэвхтэй</span>';
    const agentActive = u.agentActive === true;
    const agentPill = role === 'user'
      ? (agentActive
          ? '<span class="admin-role-pill" style="background:rgba(0,200,120,.12);color:#0a8a52;">Active Agent</span>'
          : '<span class="admin-role-pill" style="background:rgba(0,0,0,.06);color:var(--ink-3);">Agent идэвхгүй</span>')
      : '';
    let primaryBtn = '';
    const menuActions = [];
    if (!isSelf && role !== 'owner') {
      const nameJs = name.replace(/'/g, "\\'");
      primaryBtn = role === 'admin'
        ? `<button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="confirmRevokeAdmin('${u.uid}', '${nameJs}')">Admin эрх цуцлах</button>`
        : `<button class="btn btn-blue" onclick="confirmGrantAdmin('${u.uid}', '${nameJs}')">Admin болгох</button>`;
      menuActions.push(u.blocked
        ? { label: 'Блок цуцлах', onclick: `adminUnblockUser('${u.uid}')` }
        : { label: 'Блоклох', onclick: `adminBlockUser('${u.uid}')`, danger: true });
      // Agent activate/deactivate/revoke only makes sense on a plain 'user' row — admin/owner
      // already always count as an approved agent (isApprovedAgent()), no flag needed.
      if (role === 'user') {
        menuActions.push(agentActive
          ? { label: 'Agent идэвхгүй болгох', onclick: `adminDeactivateAgent('${u.uid}')`, danger: true }
          : { label: 'Agent идэвхжүүлэх', onclick: `adminActivateAgent('${u.uid}')` });
        menuActions.push({ label: 'Agent устгах', onclick: `adminRevokeAgent('${u.uid}', '${nameJs}')`, danger: true });
      }
    }
    if (role === 'user') menuActions.push({ label: 'Дэлгэрэнгүй гүйцэтгэл', onclick: `openAgentPerformanceModal('${u.uid}')` });
    const stats = u._stats || { total: 0, active: 0, sold: 0, rented: 0 };
    const statsLine = role === 'user'
      ? `<div class="admin-row-meta">${stats.total} нийт · ${stats.active} идэвхтэй · ${stats.sold} зарагдсан · ${stats.rented} түрээслэгдсэн · Сүүлд идэвхтэй: ${fmtRelativeTime(u.lastActiveAt)}</div>`
      : '';
    return `
      <div class="admin-row">
        <div class="admin-user-avatar" style="overflow:hidden;">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc((u.firstName || u.email || '?')[0].toUpperCase())}</div>
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(name)} ${isSelf ? '<span style="color:var(--ink-3);font-weight:500;">(та)</span>' : ''}</div>
          <div class="admin-row-meta">${esc(u.email || '—')} · ${u.verifiedPhone ? '+976 ' + esc(u.verifiedPhone) : '—'} · ${esc(created)}</div>
          ${statsLine}
          <span class="admin-role-pill role-${role}">${roleLabel(role)}</span> ${agentPill} ${statusPill}
        </div>
        <div class="admin-row-actions">${primaryBtn}${adminActionMenu(u.uid, menuActions)}</div>
      </div>
    `;
  }

  // ===== AGENT PERFORMANCE DETAIL (Admin CRM — "Admin бол бүх Agent-ийн performance-ийг
  // харж чадна") — same computeAgentStats() output the row above shows compactly, plus
  // this-month/total-views/most-viewed, which don't fit the row without cluttering it. =====
  function openAgentPerformanceModal(uid) {
    const u = (_adminUsersCache || []).find(x => x.uid === uid);
    if (!u) return;
    const stats = u._stats || { total: 0, active: 0, pending: 0, sold: 0, rented: 0, rejected: 0, expired: 0, thisMonthNew: 0, totalViews: 0, mostViewed: null };
    const name = ((u.lastName || '') + ' ' + (u.firstName || '')).trim() || 'Нэргүй';
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, var(--primary), var(--primary-deep));display:grid;place-items:center;overflow:hidden;flex-shrink:0;font-size:20px;font-weight:700;color:#fff;">
            ${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc((u.firstName || u.email || '?')[0].toUpperCase())}
          </div>
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:16px;">${esc(name)}</div>
            <div style="font-size:12.5px;color:var(--ink-3);">${esc(u.email || '—')} · ${u.verifiedPhone ? '+976 ' + esc(u.verifiedPhone) : 'Утас баталгаажаагүй'}</div>
            <div style="font-size:12px;color:var(--ink-3);margin-top:2px;">Сүүлд идэвхтэй: ${fmtRelativeTime(u.lastActiveAt)}</div>
          </div>
        </div>
        <div class="admin-kpi-grid">
          ${adminKpiCard('Нийт зар', { ok: true, value: stats.total })}
          ${adminKpiCard('Идэвхтэй', { ok: true, value: stats.active })}
          ${adminKpiCard('Зарагдсан', { ok: true, value: stats.sold })}
          ${adminKpiCard('Түрээслэгдсэн', { ok: true, value: stats.rented })}
          ${adminKpiCard('Энэ сарын шинэ', { ok: true, value: stats.thisMonthNew })}
          ${adminKpiCard('Нийт үзэлт', { ok: true, value: stats.totalViews })}
        </div>
        ${stats.mostViewed ? `<div style="margin-top:14px;font-size:13px;color:var(--ink-3);">Хамгийн их үзсэн зар: <b style="color:var(--ink);">${esc(stats.mostViewed.title || '')}</b> — ${stats.mostViewed.viewCount} үзэлт</div>` : ''}
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
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
      renderAdminUsersSection();
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
      renderAdminUsersSection();
    } catch(e) {
      console.error('revokeAdminRole failed:', e.code, e.message);
      showToast('Эрх цуцлахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== NEW DEVELOPMENTS (Шинэ орон сууц) =====
  async function renderAdminProjectsSection() {
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('projects').get();
      const items = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
      if (items.length === 0) { el.innerHTML = adminEmptyState('Төсөл алга', 'Одоогоор нийтэлсэн барилгын төсөл алга байна.'); return; }
      el.innerHTML = `<div class="admin-list-table">${items.map(p => adminProjectRow(p)).join('')}</div>`;
    } catch(e) {
      console.error('renderAdminProjectsSection failed:', e.code, e.message);
      el.innerHTML = adminErrorState('Төслийн жагсаалт татахад алдаа гарлаа.', `renderAdminProjectsSection()`);
    }
  }

  function adminProjectRow(p) {
    const status = p.status || 'active';
    const img = (p.images && p.images[0]) || p.img || '';
    const menuActions = [
      status === 'active'
        ? { label: 'Нуух', onclick: `adminHideProject('${p.fsId}')`, danger: true }
        : { label: 'Дахин нийтлэх', onclick: `adminUnhideProject('${p.fsId}')` },
      { label: 'Устгах', onclick: `adminDeleteProject('${p.fsId}')`, danger: true }
    ];
    return `
      <div class="admin-row">
        <img class="admin-row-img" src="${esc(img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(p.projectName || '')}</div>
          <div class="admin-row-meta">${esc(p.company || 'Тодорхойгүй компани')} · ${esc(typeof ndDistrictLabel === 'function' ? ndDistrictLabel(p.district) : (p.district || ''))}</div>
          <span class="admin-status-pill status-${status === 'active' ? 'active' : 'rejected'}">${status === 'active' ? 'Идэвхтэй' : 'Нуугдсан'}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost" onclick="showPage('newdev'); setTimeout(()=>openProjectDetail('${p.fsId}'), 150)">Харах</button>
          ${adminActionMenu('proj-' + p.fsId, menuActions)}
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
      renderAdminProjectsSection();
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
      renderAdminProjectsSection();
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
      renderAdminProjectsSection();
    } catch(e) {
      console.error('adminDeleteProject failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== ADVERTISING (Сурталчилгаа) =====
  const AD_PLACEMENTS = {
    'home-banner': 'Homepage banner', 'listings': 'Listings хуудас',
    'search-results': 'Хайлтын үр дүн', 'featured': 'Featured listings'
  };
  const AD_TABS = [{ id: 'active', label: 'Идэвхтэй' }, { id: 'scheduled', label: 'Товлогдсон' }, { id: 'expired', label: 'Дууссан' }];
  let _adminAdsCache = null;
  let _adminAdsTab = 'active';

  async function renderAdminAdsSection(tab) {
    if (tab) _adminAdsTab = tab;
    const el = adminSectionEl();
    if (!el) return;
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    try {
      const snap = await db.collection('ads').orderBy('createdAt', 'desc').get();
      _adminAdsCache = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
    } catch(e) {
      try {
        const snap = await db.collection('ads').get();
        _adminAdsCache = snap.docs.map(d => Object.assign({ fsId: d.id }, d.data()));
      } catch(e2) {
        el.innerHTML = adminErrorState('Сурталчилгааны жагсаалт татахад алдаа гарлаа.', `renderAdminAdsSection()`);
        return;
      }
    }

    const buckets = { active: [], scheduled: [], expired: [] };
    _adminAdsCache.forEach(ad => {
      if (isAdCurrentlyActive(ad)) buckets.active.push(ad);
      else if (ad.active && ad.startDate && Date.now() < new Date(ad.startDate).getTime()) buckets.scheduled.push(ad);
      else buckets.expired.push(ad);
    });
    const emptyMsgs = { active: 'Одоогоор идэвхтэй сурталчилгаа алга.', scheduled: 'Товлогдсон сурталчилгаа алга.', expired: 'Дууссан сурталчилгаа алга.' };

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div class="admin-tabs" style="margin-bottom:0;">
          ${AD_TABS.map(t => `<button class="mytab ${_adminAdsTab === t.id ? 'active' : ''}" onclick="renderAdminAdsSection('${t.id}')">${t.label} (${buckets[t.id].length})</button>`).join('')}
        </div>
        <button class="btn btn-blue" onclick="openAdForm()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Сурталчилгаа нэмэх
        </button>
      </div>
      <div id="adFormWrap"></div>
      <div class="admin-list-table" id="adListWrap">
        ${buckets[_adminAdsTab].length === 0 ? adminEmptyState('Сурталчилгаа алга', emptyMsgs[_adminAdsTab]) : buckets[_adminAdsTab].map(adminAdRow).join('')}
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
    const menuActions = [
      { label: ad.active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх', onclick: `adminToggleAd('${ad.fsId}', ${!ad.active})` },
      { label: 'Устгах', onclick: `adminDeleteAd('${ad.fsId}')`, danger: true }
    ];
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
          ${adminActionMenu('ad-' + ad.fsId, menuActions)}
        </div>
      </div>
    `;
  }

  let _adEditingFsId = null;
  let _adAddState = null;

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
      renderAdminAdsSection();
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
      renderAdminAdsSection();
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
      renderAdminAdsSection();
      if (typeof renderSiteAds === 'function') renderSiteAds();
    } catch(e) {
      console.error('adminDeleteAd failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== SETTINGS (Тохиргоо) — detailed analytics + audit/history =====
  async function renderAdminSettingsSection() {
    const el = adminSectionEl();
    if (!el) return;
    const owner = isOwnerUser();
    el.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-head">Дэлгэрэнгүй тоон үзүүлэлт</div>
        <div id="adminSettingsAnalytics" style="padding:16px;"><div class="admin-loading">Ачааллаж байна…</div></div>
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head">${owner ? 'Үйлдлийн түүх' : 'Миний үйлдлийн түүх'}</div>
        <div id="adminSettingsAuditLog"><div class="admin-loading">Ачааллаж байна…</div></div>
      </div>
    `;
    loadSettingsAnalytics();
    loadSettingsAuditLog(owner);
  }

  async function loadSettingsAnalytics() {
    const wrap = document.getElementById('adminSettingsAnalytics');
    if (!wrap) return;
    let listingsSnap = null, projectsSnap = null, usersCount = null;
    try { listingsSnap = await db.collection('listings').get(); } catch(e) {}
    try { projectsSnap = await db.collection('projects').get(); } catch(e) {}
    try { if (isOwnerUser()) { const u = await db.collection('users').get(); usersCount = u.size; } } catch(e) {}

    if (!listingsSnap) { wrap.innerHTML = adminErrorState('Тоон үзүүлэлт татахад алдаа гарлаа.', 'loadSettingsAnalytics()'); return; }

    let totalViews = 0, totalFavorites = 0, totalContacts = 0;
    const byCat = {};
    listingsSnap.forEach(doc => {
      const d = doc.data();
      totalViews += d.viewCount || 0;
      totalFavorites += d.favoriteCount || 0;
      totalContacts += d.contactCount || 0;
      const cat = d.category || 'apartment';
      byCat[cat] = (byCat[cat] || 0) + 1;
    });
    let projectViews = 0, projectContacts = 0;
    if (projectsSnap) projectsSnap.forEach(doc => { const d = doc.data(); projectViews += d.viewCount || 0; projectContacts += d.contactCount || 0; });
    const catLabels = { apartment: 'Орон сууц', house: 'Хаус', land: 'Газар', office: 'Оффис', rent: 'Түрээс' };

    wrap.innerHTML = `
      <div class="admin-stat-grid">
        ${usersCount != null ? `<div class="admin-stat-card"><div class="v">${usersCount}</div><div class="l">Хэрэглэгч</div></div>` : ''}
        <div class="admin-stat-card"><div class="v">${listingsSnap.size}</div><div class="l">Зар</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalViews)}</div><div class="l">Зарын үзэлт</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalFavorites)}</div><div class="l">Хадгалагдсан</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(totalContacts)}</div><div class="l">Холбогдсон (зар)</div></div>
        <div class="admin-stat-card"><div class="v">${projectsSnap ? projectsSnap.size : '—'}</div><div class="l">Шинэ орон сууцны төсөл</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(projectViews)}</div><div class="l">Төслийн үзэлт</div></div>
        <div class="admin-stat-card"><div class="v">${fmt(projectContacts)}</div><div class="l">Холбогдсон (төсөл)</div></div>
      </div>
      ${Object.keys(byCat).length ? `
      <div style="margin-top:16px;">
        <div style="font-size:12px;font-weight:700;color:var(--ink-3);margin-bottom:8px;">Ангилалаар</div>
        ${Object.keys(byCat).map(c => `
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--line);">
            <span>${esc(catLabels[c] || c)}</span><strong>${byCat[c]}</strong>
          </div>
        `).join('')}
      </div>` : ''}
      <div style="margin-top:16px;font-size:12.5px;color:var(--ink-3);line-height:1.6;">
        <strong>Compare ашиглалт:</strong> одоогоор хэмжиж хадгалдаг backend алга — Compare зөвхөн session дотор, browser санах ойд л ажилладаг тул бодит тоо гаргах боломжгүй.
      </div>
    `;
  }

  async function loadSettingsAuditLog(owner) {
    const wrap = document.getElementById('adminSettingsAuditLog');
    if (!wrap) return;
    try {
      let docs;
      if (owner) {
        const snap = await db.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(200).get();
        docs = snap.docs;
      } else {
        const snap = await db.collection('adminAuditLogs').where('actorUid', '==', currentUser.uid).limit(200).get();
        docs = snap.docs.sort((a, b) => (b.data().timestamp?.toMillis?.() || 0) - (a.data().timestamp?.toMillis?.() || 0));
      }
      if (!docs.length) { wrap.innerHTML = adminEmptyState('Түүх алга', 'Одоогоор бүртгэгдсэн үйлдэл алга байна.'); return; }
      wrap.innerHTML = `<div class="admin-list-table">${docs.map(d => {
        const l = d.data();
        return `
          <div class="admin-row" style="align-items:flex-start;">
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(ADMIN_ACTION_LABELS[l.action] || l.action)} <span style="color:var(--ink-3);font-weight:500;">· ${esc(l.targetType)} ${esc(l.targetId)}</span></div>
              <div class="admin-row-meta">${esc(l.actorEmail)} (${esc(roleLabel(l.actorRole))}) · ${l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : '—'}</div>
              ${l.reason ? `<div style="font-size:12px;color:var(--ink-2);margin-top:4px;">Шалтгаан: ${esc(l.reason)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}</div>`;
    } catch(e) {
      console.error('loadSettingsAuditLog failed:', e.code, e.message);
      wrap.innerHTML = adminErrorState('Үйлдлийн түүх татахад алдаа гарлаа.', `loadSettingsAuditLog(${owner})`);
    }
  }
