  // ===== CRM: SALES PIPELINE (clients / viewings / deals) =====
  // Three Firestore collections, all scoped by an assigned-agent field
  // (clients.assignedAgentId, viewings.agentId, deals.agentId) — see firestore.rules for the
  // real enforcement. Every render function here is parameterized by `scopeUid`: an agent's
  // own uid (js/dashboard.js's "Харилцагчид" page) or `null` for admin/owner (js/admin.js's
  // CRM section) = everything. This keeps one implementation for both surfaces.
  //
  // Firestore query rule (not just a style choice): an agent's queries against these three
  // collections MUST include an explicit .where(field,'==',uid) — the security rules reject
  // an unscoped query outright rather than silently filtering it, so crmLoad*() always
  // applies the scope at the query level, never by filtering client-side after a full fetch.

  const CRM_STAGES = [
    { id: 'new', label: 'Шинэ харилцагч' },
    { id: 'contacted', label: 'Холбогдсон' },
    { id: 'viewing', label: 'Үзлэг товлосон' },
    { id: 'negotiation', label: 'Хэлэлцээр' },
    { id: 'contract', label: 'Гэрээ' },
    { id: 'closed_sold', label: 'Зарагдсан' },
    { id: 'closed_rented', label: 'Түрээслэгдсэн' }
  ];
  const CRM_STAGE_LABEL = Object.fromEntries(CRM_STAGES.map(s => [s.id, s.label]));
  const CRM_CLOSED_STAGES = ['closed_sold', 'closed_rented'];

  const CRM_VIEWING_STATUS_LABEL = { scheduled: 'Товлосон', done: 'Хийгдсэн', cancelled: 'Цуцлагдсан' };
  const CRM_DEAL_STATUS_LABEL = { negotiating: 'Хэлэлцэж байгаа', sold: 'Зарагдсан', rented: 'Түрээслэгдсэн', cancelled: 'Цуцлагдсан' };

  let _crmScopeUid = undefined; // undefined = never loaded yet; null = admin (all); uid = agent
  let _crmClients = [];
  let _crmViewings = [];
  let _crmDeals = [];
  let _crmTab = 'pipeline';
  let _crmClientsSearch = '';
  let _crmClientsStageFilter = 'all';
  let _crmClientsAgentFilter = 'all';

  function crmFollowUpBucket(ms) {
    if (!ms) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const day = new Date(ms); day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((day - now) / 86400000);
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'upcoming';
  }
  function crmMsFromTs(ts) {
    return ts?.toMillis?.() ?? (ts instanceof Date ? ts.getTime() : (typeof ts === 'number' ? ts : 0));
  }

  // ===== DATA LOADING =====
  async function crmLoadClients(scopeUid) {
    let q = db.collection('clients');
    if (scopeUid) q = q.where('assignedAgentId', '==', scopeUid);
    const snap = await q.get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  async function crmLoadViewings(scopeUid) {
    let q = db.collection('viewings');
    if (scopeUid) q = q.where('agentId', '==', scopeUid);
    const snap = await q.get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  async function crmLoadDeals(scopeUid) {
    let q = db.collection('deals');
    if (scopeUid) q = q.where('agentId', '==', scopeUid);
    const snap = await q.get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  async function crmLoadAll(scopeUid) {
    try {
      [_crmClients, _crmViewings, _crmDeals] = await Promise.all([
        crmLoadClients(scopeUid), crmLoadViewings(scopeUid), crmLoadDeals(scopeUid)
      ]);
      _crmScopeUid = scopeUid;
    } catch(e) {
      console.error('CRM load failed:', e.code, e.message);
      showToast('CRM өгөгдөл татахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
      _crmClients = []; _crmViewings = []; _crmDeals = [];
    }
  }
  async function crmRefresh(scopeUid) { await crmLoadAll(scopeUid); }

  function crmClientById(id) { return _crmClients.find(c => c.id === id); }

  // ===== KPIs (shared by admin overview and per-agent performance) =====
  function computeCrmKpis(clients, deals) {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();
    const sold = deals.filter(d => d.status === 'sold').length;
    const rented = deals.filter(d => d.status === 'rented').length;
    const dealsThisMonth = deals.filter(d => {
      const ms = crmMsFromTs(d.contractDate);
      return ms && ms >= monthStartMs && (d.status === 'sold' || d.status === 'rented');
    }).length;
    const byAgent = {};
    deals.forEach(d => {
      if (!d.agentId || (d.status !== 'sold' && d.status !== 'rented')) return;
      byAgent[d.agentId] = (byAgent[d.agentId] || 0) + 1;
    });
    return {
      totalClients: clients.length,
      newLeads: clients.filter(c => c.stage === 'new').length,
      viewingScheduled: clients.filter(c => c.stage === 'viewing').length,
      inNegotiation: clients.filter(c => c.stage === 'negotiation').length,
      dealsThisMonth, sold, rented,
      conversionRate: clients.length > 0 ? Math.round((sold + rented) / clients.length * 100) : 0,
      byAgent
    };
  }

  // ===== FOLLOW-UP + UPCOMING-VIEWING WIDGETS (shared by dashboard.js and the admin CRM tab) =====
  function renderCrmFollowUpWidgets(el, scopeUid) {
    if (!el) return;
    const clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients;
    const viewings = scopeUid ? _crmViewings.filter(v => v.agentId === scopeUid) : _crmViewings;
    const today = clients.filter(c => c.nextFollowUpAt && crmFollowUpBucket(crmMsFromTs(c.nextFollowUpAt)) === 'today' && !CRM_CLOSED_STAGES.includes(c.stage));
    const overdue = clients.filter(c => c.nextFollowUpAt && crmFollowUpBucket(crmMsFromTs(c.nextFollowUpAt)) === 'overdue' && !CRM_CLOSED_STAGES.includes(c.stage));
    const now = Date.now();
    const upcomingViewings = viewings.filter(v => v.status === 'scheduled' && crmMsFromTs(v.scheduledAt) >= now)
      .sort((a, b) => crmMsFromTs(a.scheduledAt) - crmMsFromTs(b.scheduledAt)).slice(0, 5);

    const followRow = (c) => `
      <div class="crm-follow-row" onclick="openClientDetailModal('${c.id}')">
        <div>
          <div class="crm-follow-name">${esc(c.name || 'Нэргүй')}</div>
          <div class="crm-follow-note">${esc(c.followUpNote || '')}</div>
        </div>
        <span class="admin-status-pill status-${crmFollowUpBucket(crmMsFromTs(c.nextFollowUpAt))}">${new Date(crmMsFromTs(c.nextFollowUpAt)).toLocaleDateString('mn-MN')}</span>
      </div>`;
    const viewingRow = (v) => `
      <div class="crm-follow-row" onclick="openClientDetailModal('${v.clientId}')">
        <div>
          <div class="crm-follow-name">${esc(v.clientName || '—')} — ${esc(v.listingTitle || '')}</div>
        </div>
        <span class="admin-status-pill status-scheduled">${new Date(crmMsFromTs(v.scheduledAt)).toLocaleDateString('mn-MN')}</span>
      </div>`;

    el.innerHTML = `
      <div class="crm-followup-grid">
        <div class="admin-panel">
          <div class="admin-panel-head">Хугацаа хэтэрсэн follow-up ${overdue.length ? `<span class="crm-count-badge danger">${overdue.length}</span>` : ''}</div>
          <div style="padding:6px 0;">${overdue.length ? overdue.map(followRow).join('') : '<div class="crm-empty-row">Алга</div>'}</div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-head">Өнөөдрийн follow-up ${today.length ? `<span class="crm-count-badge">${today.length}</span>` : ''}</div>
          <div style="padding:6px 0;">${today.length ? today.map(followRow).join('') : '<div class="crm-empty-row">Алга</div>'}</div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-head">Удахгүй хийх үзлэг ${upcomingViewings.length ? `<span class="crm-count-badge">${upcomingViewings.length}</span>` : ''}</div>
          <div style="padding:6px 0;">${upcomingViewings.length ? upcomingViewings.map(viewingRow).join('') : '<div class="crm-empty-row">Алга</div>'}</div>
        </div>
      </div>
    `;
  }

  // ===== KANBAN =====
  function crmStageSelect(client, disabled) {
    return `
      <select class="form-select crm-stage-select" ${disabled ? 'disabled' : ''} onclick="event.stopPropagation()" onchange="crmChangeClientStage('${client.id}', this.value)">
        ${CRM_STAGES.map(s => `<option value="${s.id}" ${client.stage === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    `;
  }
  function crmAgentName(uid) {
    const u = (typeof _adminUsersCache !== 'undefined' && _adminUsersCache) ? _adminUsersCache.find(x => x.uid === uid) : null;
    return u ? ((u.lastName || '') + ' ' + (u.firstName || '')).trim() : '';
  }
  function crmClientCard(c, showAgent) {
    const bucket = c.nextFollowUpAt ? crmFollowUpBucket(crmMsFromTs(c.nextFollowUpAt)) : null;
    return `
      <div class="crm-kanban-card" onclick="openClientDetailModal('${c.id}')">
        <div class="crm-kanban-card-name">${esc(c.name || 'Нэргүй')}</div>
        <div class="crm-kanban-card-meta">${esc(c.phone || '—')}</div>
        ${c.budget ? `<div class="crm-kanban-card-meta">${fmt(c.budget)}₮ · ${c.dealType === 'rent' ? 'Түрээс' : 'Худалдан авалт'}</div>` : ''}
        ${showAgent ? `<div class="crm-kanban-card-meta">${esc(crmAgentName(c.assignedAgentId) || 'Agent тодорхойгүй')}</div>` : ''}
        ${bucket ? `<span class="admin-status-pill status-${bucket}" style="margin-top:6px;display:inline-block;">${bucket === 'overdue' ? 'Хэтэрсэн' : (bucket === 'today' ? 'Өнөөдөр' : 'Follow-up')}</span>` : ''}
        ${crmStageSelect(c, false)}
      </div>
    `;
  }
  function renderCrmKanban(el, scopeUid) {
    if (!el) return;
    const clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients;
    el.innerHTML = `
      <div class="crm-kanban">
        ${CRM_STAGES.map(stage => {
          const col = clients.filter(c => c.stage === stage.id);
          return `
            <div class="crm-kanban-col">
              <div class="crm-kanban-col-head">${stage.label} <span class="crm-count-badge">${col.length}</span></div>
              <div class="crm-kanban-col-body">
                ${col.length ? col.map(c => crmClientCard(c, !scopeUid)).join('') : '<div class="crm-empty-row">Хоосон</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  async function crmChangeClientStage(clientId, newStage) {
    try {
      await db.collection('clients').doc(clientId).update({ stage: newStage, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const c = crmClientById(clientId);
      if (c) c.stage = newStage;
      if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) logAdminAction('crm_stage_change', 'client', clientId, newStage);
      showToast('Шат шинэчлэгдлээ', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmChangeClientStage failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== CLIENTS LIST (table) =====
  function renderCrmClientsList(el, scopeUid) {
    if (!el) return;
    const q = _crmClientsSearch.trim().toLowerCase();
    let clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients.slice();
    if (_crmClientsStageFilter !== 'all') clients = clients.filter(c => c.stage === _crmClientsStageFilter);
    if (!scopeUid && _crmClientsAgentFilter !== 'all') clients = clients.filter(c => c.assignedAgentId === _crmClientsAgentFilter);
    if (q) clients = clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));
    clients.sort((a, b) => crmMsFromTs(b.updatedAt || b.createdAt) - crmMsFromTs(a.updatedAt || a.createdAt));

    const agentOptions = !scopeUid && typeof _adminUsersCache !== 'undefined' && _adminUsersCache
      ? _adminUsersCache.filter(u => (u.role || 'user') === 'user')
      : [];

    el.innerHTML = `
      <div class="admin-search-row" style="display:flex;gap:10px;max-width:640px;flex-wrap:wrap;">
        <input type="text" class="form-input" placeholder="Нэр, утас, и-мэйл хайх" value="${esc(_crmClientsSearch)}" oninput="crmFilterClients(this.value)" style="flex:1;min-width:180px;" />
        <select class="form-select" style="width:auto;" onchange="crmSetClientsStageFilter(this.value)">
          <option value="all">Бүх шат</option>
          ${CRM_STAGES.map(s => `<option value="${s.id}" ${_crmClientsStageFilter === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        ${!scopeUid ? `
        <select class="form-select" style="width:auto;" onchange="crmSetClientsAgentFilter(this.value)">
          <option value="all">Бүх Agent</option>
          ${agentOptions.map(u => `<option value="${u.uid}" ${_crmClientsAgentFilter === u.uid ? 'selected' : ''}>${esc(((u.lastName || '') + ' ' + (u.firstName || '')).trim())}</option>`).join('')}
        </select>` : ''}
      </div>
      <div class="admin-list-table" style="margin-top:16px;">
        ${clients.length === 0 ? adminEmptyState('Харилцагч олдсонгүй', 'Хайлт/шүүлтүүрээ өөрчилж үзнэ үү.') : clients.map(c => crmClientRow(c, !scopeUid)).join('')}
      </div>
    `;
  }
  function crmClientRow(c, showAgent) {
    const bucket = c.nextFollowUpAt ? crmFollowUpBucket(crmMsFromTs(c.nextFollowUpAt)) : null;
    const menuActions = [
      { label: 'Дэлгэрэнгүй', onclick: `openClientDetailModal('${c.id}')` },
      { label: 'Үзлэг товлох', onclick: `openScheduleViewingModal('${c.id}')` },
      { label: 'Гэрээ/Хэлэлцээр нээх', onclick: `openDealModal(null, '${c.id}')` }
    ];
    if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) {
      menuActions.push({ label: 'Agent солих', onclick: `openReassignClientModal('${c.id}')` });
      menuActions.push({ label: 'Устгах', onclick: `crmDeleteClient('${c.id}')`, danger: true });
    }
    return `
      <div class="admin-row">
        <div class="admin-user-avatar">${esc((c.name || '?')[0].toUpperCase())}</div>
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(c.name || 'Нэргүй')}</div>
          <div class="admin-row-meta">${esc(c.phone || '—')} · ${esc(c.email || '—')} ${showAgent ? '· ' + esc(crmAgentName(c.assignedAgentId) || 'Agent тодорхойгүй') : ''}</div>
          <span class="admin-status-pill status-${c.stage}">${esc(CRM_STAGE_LABEL[c.stage] || c.stage)}</span>
          ${bucket ? `<span class="admin-status-pill status-${bucket}">${bucket === 'overdue' ? 'Follow-up хэтэрсэн' : (bucket === 'today' ? 'Өнөөдөр follow-up' : 'Follow-up товлосон')}</span>` : ''}
        </div>
        <div class="admin-row-actions">${adminActionMenu('client-' + c.id, menuActions)}</div>
      </div>
    `;
  }
  function crmFilterClients(v) { _crmClientsSearch = v; renderCrmClientsList(document.getElementById(_crmScopeUid === null ? 'adminSectionContent' : 'crmContent'), _crmScopeUid); }
  function crmSetClientsStageFilter(v) { _crmClientsStageFilter = v; crmRerenderCurrentView(); }
  function crmSetClientsAgentFilter(v) { _crmClientsAgentFilter = v; crmRerenderCurrentView(); }

  async function crmDeleteClient(id) {
    if (!confirm('Энэ харилцагчийг бүрмөсөн устгах уу?')) return;
    try {
      await db.collection('clients').doc(id).delete();
      _crmClients = _crmClients.filter(c => c.id !== id);
      if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) logAdminAction('crm_delete_client', 'client', id, '');
      showToast('Харилцагч устгагдлаа', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmDeleteClient failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== CLIENT CREATE/EDIT FORM =====
  function crmActiveListingOptions() {
    return (typeof listings !== 'undefined' ? listings : []).filter(l => (l.status || 'active') === 'active');
  }
  function openClientFormModal(clientId) {
    const c = clientId ? crmClientById(clientId) : null;
    const isOwnerOrAdmin = typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser();
    const agentOptions = isOwnerOrAdmin && typeof _adminUsersCache !== 'undefined' && _adminUsersCache
      ? _adminUsersCache.filter(u => (u.role || 'user') === 'user')
      : [];
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">${c ? 'Харилцагч засах' : 'Шинэ харилцагч'}</span>
        <div class="al-title" style="margin-bottom:20px;">${c ? esc(c.name) : 'Харилцагч нэмэх'}</div>
        <div class="form-grid-2">
          <div><label class="form-label">Нэр</label><input class="form-input" id="crmCName" value="${esc(c?.name || '')}" /></div>
          <div><label class="form-label">Утас</label><input class="form-input" id="crmCPhone" value="${esc(c?.phone || '')}" /></div>
        </div>
        <div class="form-row"><label class="form-label">И-мэйл</label><input class="form-input" id="crmCEmail" value="${esc(c?.email || '')}" /></div>
        <div class="form-row">
          <label class="form-label">Сонирхож буй зар</label>
          <select class="form-select" id="crmCListing">
            <option value="">— Сонгоогүй —</option>
            ${crmActiveListingOptions().map(l => `<option value="${l.firestoreId || ''}" ${c?.interestedListingId === l.firestoreId ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid-2">
          <div>
            <label class="form-label">Худалдаж авах / Түрээслэх</label>
            <select class="form-select" id="crmCDealType">
              <option value="buy" ${(c?.dealType || 'buy') === 'buy' ? 'selected' : ''}>Худалдаж авах</option>
              <option value="rent" ${c?.dealType === 'rent' ? 'selected' : ''}>Түрээслэх</option>
            </select>
          </div>
          <div><label class="form-label">Төсөв (₮)</label><input class="form-input" type="number" id="crmCBudget" value="${c?.budget || ''}" /></div>
        </div>
        <div class="form-row"><label class="form-label">Байршлын сонирхол</label><input class="form-input" id="crmCLocation" value="${esc(c?.locationInterest || '')}" /></div>
        ${isOwnerOrAdmin ? `
        <div class="form-row">
          <label class="form-label">Хариуцах Agent</label>
          <select class="form-select" id="crmCAgent">
            ${agentOptions.map(u => `<option value="${u.uid}" ${(c ? c.assignedAgentId === u.uid : u.uid === currentUser.uid) ? 'selected' : ''}>${esc(((u.lastName || '') + ' ' + (u.firstName || '')).trim())}</option>`).join('')}
          </select>
        </div>` : ''}
        <button class="btn btn-blue btn-lg" style="width:100%;justify-content:center;margin-top:8px;" onclick="crmSaveClient(${c ? `'${c.id}'` : 'null'})">Хадгалах</button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  async function crmSaveClient(clientId) {
    const name = document.getElementById('crmCName').value.trim();
    if (!name) { showToast('Нэрээ оруулна уу'); return; }
    const listingSel = document.getElementById('crmCListing');
    const listing = crmActiveListingOptions().find(l => l.firestoreId === listingSel.value);
    const isOwnerOrAdmin = typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser();
    const agentSel = document.getElementById('crmCAgent');
    const payload = {
      name,
      phone: document.getElementById('crmCPhone').value.trim(),
      email: document.getElementById('crmCEmail').value.trim(),
      interestedListingId: listingSel.value || null,
      interestedListingTitle: listing ? listing.title : '',
      dealType: document.getElementById('crmCDealType').value,
      budget: Number(document.getElementById('crmCBudget').value) || 0,
      locationInterest: document.getElementById('crmCLocation').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (clientId) {
        if (isOwnerOrAdmin && agentSel) payload.assignedAgentId = agentSel.value;
        await db.collection('clients').doc(clientId).update(payload);
        Object.assign(crmClientById(clientId) || {}, payload);
        if (isOwnerOrAdmin) logAdminAction('crm_edit_client', 'client', clientId, '');
      } else {
        payload.assignedAgentId = isOwnerOrAdmin && agentSel ? agentSel.value : currentUser.uid;
        payload.stage = 'new';
        payload.notes = [];
        payload.nextFollowUpAt = null;
        payload.followUpNote = '';
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('clients').add(payload);
        _crmClients.push(Object.assign({ id: ref.id }, payload));
        if (isOwnerOrAdmin) logAdminAction('crm_add_client', 'client', ref.id, '');
      }
      showToast('Хадгалагдлаа', 'success');
      closeModal();
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmSaveClient failed:', e.code, e.message);
      showToast('Хадгалахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  function openReassignClientModal(clientId) {
    const c = crmClientById(clientId);
    if (!c || typeof _adminUsersCache === 'undefined' || !_adminUsersCache) return;
    const agents = _adminUsersCache.filter(u => (u.role || 'user') === 'user');
    const names = agents.map((u, i) => `${i + 1}. ${((u.lastName || '') + ' ' + (u.firstName || '')).trim()}`).join('\n');
    const pick = prompt(`Шинэ Agent сонгоно уу (дугаар бичнэ үү):\n${names}`);
    const idx = Number(pick) - 1;
    if (!agents[idx]) return;
    crmReassignClient(clientId, agents[idx].uid);
  }
  async function crmReassignClient(clientId, newAgentUid) {
    try {
      await db.collection('clients').doc(clientId).update({ assignedAgentId: newAgentUid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const c = crmClientById(clientId);
      if (c) c.assignedAgentId = newAgentUid;
      logAdminAction('crm_reassign_client', 'client', clientId, newAgentUid);
      showToast('Agent солигдлоо', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmReassignClient failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== CLIENT DETAIL MODAL =====
  function openClientDetailModal(clientId) {
    const c = crmClientById(clientId);
    if (!c) return;
    const viewings = _crmViewings.filter(v => v.clientId === clientId).sort((a, b) => crmMsFromTs(b.scheduledAt) - crmMsFromTs(a.scheduledAt));
    const deals = _crmDeals.filter(d => d.clientId === clientId);
    const notes = (c.notes || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;max-height:80vh;overflow-y:auto;">
        <span class="al-eyebrow">Харилцагч</span>
        <div class="al-title" style="margin-bottom:6px;">${esc(c.name || 'Нэргүй')}</div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:16px;">${esc(c.phone || '—')} · ${esc(c.email || '—')}</div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          <span class="admin-status-pill status-${c.stage}">${esc(CRM_STAGE_LABEL[c.stage] || c.stage)}</span>
          <span class="admin-role-pill role-user">${c.dealType === 'rent' ? 'Түрээслэх' : 'Худалдаж авах'}</span>
          ${c.budget ? `<span class="admin-role-pill role-user">${fmt(c.budget)}₮</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:6px;">Сонирхож буй зар: <b style="color:var(--ink);">${esc(c.interestedListingTitle || '—')}</b></div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:16px;">Байршил: ${esc(c.locationInterest || '—')}</div>

        <div class="form-row">
          <label class="form-label">Pipeline шат</label>
          ${crmStageSelect(c, false)}
        </div>

        <div class="form-grid-2">
          <div><label class="form-label">Дараагийн холбоо барих огноо</label><input class="form-input" type="date" id="crmFollowDate" value="${c.nextFollowUpAt ? new Date(crmMsFromTs(c.nextFollowUpAt)).toISOString().slice(0, 10) : ''}" /></div>
          <div><label class="form-label">Follow-up тэмдэглэл</label><input class="form-input" id="crmFollowNote" value="${esc(c.followUpNote || '')}" /></div>
        </div>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;border:1.5px solid var(--line-2);margin-bottom:20px;" onclick="crmSaveFollowUp('${c.id}')">Follow-up хадгалах</button>

        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button class="btn btn-blue" style="flex:1;justify-content:center;" onclick="openScheduleViewingModal('${c.id}')">Үзлэг товлох</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;border:1.5px solid var(--line-2);" onclick="openDealModal(null, '${c.id}')">Гэрээ нээх</button>
        </div>

        ${viewings.length ? `
        <div class="step-section-title" style="margin-bottom:8px;">Үзлэгүүд</div>
        <div class="admin-list-table" style="margin-bottom:20px;">
          ${viewings.map(v => `
            <div class="admin-row">
              <div class="admin-row-body">
                <div class="admin-row-title">${esc(v.listingTitle || '—')}</div>
                <div class="admin-row-meta">${new Date(crmMsFromTs(v.scheduledAt)).toLocaleString('mn-MN')}</div>
                ${v.notesAfter ? `<div class="admin-row-meta">${esc(v.notesAfter)}</div>` : ''}
                <span class="admin-status-pill status-${v.status}">${CRM_VIEWING_STATUS_LABEL[v.status] || v.status}</span>
              </div>
              ${v.status === 'scheduled' ? `<div class="admin-row-actions">${adminActionMenu('viewing-' + v.id, [
                { label: 'Хийгдсэн болгох', onclick: `crmUpdateViewingStatus('${v.id}', 'done')` },
                { label: 'Цуцлах', onclick: `crmUpdateViewingStatus('${v.id}', 'cancelled')`, danger: true }
              ])}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${deals.length ? `
        <div class="step-section-title" style="margin-bottom:8px;">Хэлэлцээр/Гэрээ</div>
        <div class="admin-list-table" style="margin-bottom:20px;">
          ${deals.map(d => `
            <div class="admin-row" onclick="openDealModal('${d.id}', '${c.id}')" style="cursor:pointer;">
              <div class="admin-row-body">
                <div class="admin-row-title">${esc(d.listingTitle || '—')}</div>
                <div class="admin-row-meta">Санал: ${fmtPrice ? fmtPrice(d.offeredPrice) : d.offeredPrice} ${d.finalPrice ? '· Эцсийн: ' + (fmtPrice ? fmtPrice(d.finalPrice) : d.finalPrice) : ''}</div>
                <span class="admin-status-pill status-${d.status}">${CRM_DEAL_STATUS_LABEL[d.status] || d.status}</span>
              </div>
            </div>
          `).join('')}
        </div>` : ''}

        <div class="step-section-title" style="margin-bottom:8px;">Тэмдэглэл</div>
        <textarea class="form-input" id="crmNoteInput" placeholder="Шинэ тэмдэглэл..." style="min-height:60px;margin-bottom:8px;"></textarea>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;border:1.5px solid var(--line-2);margin-bottom:16px;" onclick="crmAddNote('${c.id}')">Тэмдэглэл нэмэх</button>
        <div>
          ${notes.length ? notes.map(n => `
            <div style="padding:10px 0;border-top:1px solid var(--line);font-size:13px;">
              <div>${esc(n.text)}</div>
              <div style="color:var(--ink-3);font-size:11.5px;margin-top:4px;">${esc(n.authorName || '')} · ${fmtRelativeTime(n.createdAt)}</div>
            </div>
          `).join('') : '<div class="crm-empty-row">Тэмдэглэл алга</div>'}
        </div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  async function crmAddNote(clientId) {
    const text = document.getElementById('crmNoteInput').value.trim();
    if (!text) return;
    const entry = { text, authorUid: currentUser.uid, authorName: currentUser.name || currentUser.email || 'Agent', createdAt: Date.now() };
    try {
      await db.collection('clients').doc(clientId).update({
        notes: firebase.firestore.FieldValue.arrayUnion(entry),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const c = crmClientById(clientId);
      if (c) { c.notes = c.notes || []; c.notes.push(entry); }
      showToast('Тэмдэглэл нэмэгдлээ', 'success');
      openClientDetailModal(clientId);
    } catch(e) {
      console.error('crmAddNote failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function crmSaveFollowUp(clientId) {
    const dateVal = document.getElementById('crmFollowDate').value;
    const note = document.getElementById('crmFollowNote').value.trim();
    const ts = dateVal ? firebase.firestore.Timestamp.fromDate(new Date(dateVal + 'T09:00:00')) : null;
    try {
      await db.collection('clients').doc(clientId).update({ nextFollowUpAt: ts, followUpNote: note, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const c = crmClientById(clientId);
      if (c) { c.nextFollowUpAt = ts; c.followUpNote = note; }
      showToast('Follow-up хадгалагдлаа', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmSaveFollowUp failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== VIEWINGS =====
  function renderCrmViewingsList(el, scopeUid) {
    if (!el) return;
    const viewings = (scopeUid ? _crmViewings.filter(v => v.agentId === scopeUid) : _crmViewings.slice());
    const now = Date.now();
    const groups = [
      { label: 'Хугацаа хэтэрсэн', items: viewings.filter(v => v.status === 'scheduled' && crmMsFromTs(v.scheduledAt) < now) },
      { label: 'Өнөөдөр', items: viewings.filter(v => v.status === 'scheduled' && crmFollowUpBucket(crmMsFromTs(v.scheduledAt)) === 'today') },
      { label: 'Удахгүй', items: viewings.filter(v => v.status === 'scheduled' && crmMsFromTs(v.scheduledAt) >= now && crmFollowUpBucket(crmMsFromTs(v.scheduledAt)) !== 'today') },
      { label: 'Хийгдсэн / Цуцлагдсан', items: viewings.filter(v => v.status !== 'scheduled') }
    ];
    el.innerHTML = groups.map(g => `
      <div class="admin-panel" style="margin-bottom:16px;">
        <div class="admin-panel-head">${g.label} <span class="crm-count-badge">${g.items.length}</span></div>
        <div class="admin-list-table" style="padding:12px;">
          ${g.items.length === 0 ? '<div class="crm-empty-row">Алга</div>' : g.items
            .sort((a, b) => crmMsFromTs(a.scheduledAt) - crmMsFromTs(b.scheduledAt))
            .map(v => `
            <div class="admin-row">
              <div class="admin-row-body">
                <div class="admin-row-title">${esc(v.clientName || '—')} — ${esc(v.listingTitle || '')}</div>
                <div class="admin-row-meta">${new Date(crmMsFromTs(v.scheduledAt)).toLocaleString('mn-MN')} ${!scopeUid ? '· ' + esc(crmAgentName(v.agentId) || '') : ''}</div>
                <span class="admin-status-pill status-${v.status}">${CRM_VIEWING_STATUS_LABEL[v.status] || v.status}</span>
              </div>
              <div class="admin-row-actions">${adminActionMenu('vw-' + v.id, [
                { label: 'Харилцагч харах', onclick: `openClientDetailModal('${v.clientId}')` },
                v.status === 'scheduled' ? { label: 'Хийгдсэн болгох', onclick: `crmUpdateViewingStatus('${v.id}', 'done')` } : null,
                v.status === 'scheduled' ? { label: 'Цуцлах', onclick: `crmUpdateViewingStatus('${v.id}', 'cancelled')`, danger: true } : null
              ])}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
  function openScheduleViewingModal(clientId) {
    const c = crmClientById(clientId);
    if (!c) return;
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">${esc(c.name)}</span>
        <div class="al-title" style="margin-bottom:20px;">Үзлэг товлох</div>
        <div class="form-row">
          <label class="form-label">Listing</label>
          <select class="form-select" id="crmVwListing">
            ${crmActiveListingOptions().map(l => `<option value="${l.firestoreId || ''}" ${c.interestedListingId === l.firestoreId ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid-2">
          <div><label class="form-label">Огноо</label><input class="form-input" type="date" id="crmVwDate" /></div>
          <div><label class="form-label">Цаг</label><input class="form-input" type="time" id="crmVwTime" value="10:00" /></div>
        </div>
        <button class="btn btn-blue btn-lg" style="width:100%;justify-content:center;margin-top:8px;" onclick="crmSaveViewing('${clientId}')">Товлох</button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  async function crmSaveViewing(clientId) {
    const c = crmClientById(clientId);
    const listingSel = document.getElementById('crmVwListing');
    const dateVal = document.getElementById('crmVwDate').value;
    const timeVal = document.getElementById('crmVwTime').value || '10:00';
    if (!listingSel.value || !dateVal) { showToast('Listing болон огноогоо сонгоно уу'); return; }
    const listing = crmActiveListingOptions().find(l => l.firestoreId === listingSel.value);
    const payload = {
      clientId, listingId: listingSel.value, agentId: c.assignedAgentId,
      scheduledAt: firebase.firestore.Timestamp.fromDate(new Date(dateVal + 'T' + timeVal + ':00')),
      status: 'scheduled', notesAfter: '',
      clientName: c.name, listingTitle: listing ? listing.title : '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      const ref = await db.collection('viewings').add(payload);
      _crmViewings.push(Object.assign({ id: ref.id }, payload, { scheduledAt: { toMillis: () => new Date(dateVal + 'T' + timeVal + ':00').getTime() } }));
      // Scheduling a viewing is real forward progress — advance the client's stage to
      // 'viewing' unless they're already further along (never regress a client backward).
      const stageOrder = CRM_STAGES.map(s => s.id);
      if (c && stageOrder.indexOf(c.stage) < stageOrder.indexOf('viewing')) {
        await db.collection('clients').doc(clientId).update({ stage: 'viewing', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        c.stage = 'viewing';
      }
      showToast('Үзлэг товлогдлоо', 'success');
      closeModal();
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmSaveViewing failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function crmUpdateViewingStatus(viewingId, status) {
    let notesAfter = '';
    if (status === 'done') notesAfter = prompt('Үзлэгийн дараах тэмдэглэл (заавал биш):') || '';
    try {
      const payload = { status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (status === 'done') payload.notesAfter = notesAfter;
      await db.collection('viewings').doc(viewingId).update(payload);
      const v = _crmViewings.find(x => x.id === viewingId);
      if (v) Object.assign(v, payload);
      showToast('Шинэчлэгдлээ', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmUpdateViewingStatus failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== DEALS =====
  function renderCrmDealsList(el, scopeUid) {
    if (!el) return;
    const deals = (scopeUid ? _crmDeals.filter(d => d.agentId === scopeUid) : _crmDeals.slice())
      .sort((a, b) => crmMsFromTs(b.updatedAt || b.createdAt) - crmMsFromTs(a.updatedAt || a.createdAt));
    el.innerHTML = `
      <div class="admin-list-table">
        ${deals.length === 0 ? adminEmptyState('Хэлэлцээр алга', 'Харилцагчийн дэлгэрэнгүйгээс "Гэрээ нээх" дарж эхлүүлнэ үү.') : deals.map(d => `
          <div class="admin-row" onclick="openDealModal('${d.id}', '${d.clientId}')" style="cursor:pointer;">
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(d.listingTitle || '—')} — ${esc(d.clientName || '')}</div>
              <div class="admin-row-meta">Санал: ${fmt(d.offeredPrice || 0)}₮ ${d.finalPrice ? '· Эцсийн: ' + fmt(d.finalPrice) + '₮' : ''} ${!scopeUid ? '· ' + esc(crmAgentName(d.agentId) || '') : ''}</div>
              <span class="admin-status-pill status-${d.status}">${CRM_DEAL_STATUS_LABEL[d.status] || d.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  function openDealModal(dealId, clientId) {
    const d = dealId ? _crmDeals.find(x => x.id === dealId) : null;
    const c = crmClientById(clientId);
    if (!c) return;
    const listingOptions = crmActiveListingOptions();
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">${esc(c.name)}</span>
        <div class="al-title" style="margin-bottom:20px;">${d ? 'Хэлэлцээр' : 'Шинэ хэлэлцээр'}</div>
        <div class="form-row">
          <label class="form-label">Listing</label>
          <select class="form-select" id="crmDlListing" ${d ? 'disabled' : ''}>
            ${listingOptions.map(l => `<option value="${l.firestoreId || ''}" ${(d ? d.listingId === l.firestoreId : c.interestedListingId === l.firestoreId) ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid-2">
          <div><label class="form-label">Санал болгосон үнэ (₮)</label><input class="form-input" type="number" id="crmDlOffered" value="${d?.offeredPrice || ''}" /></div>
          <div><label class="form-label">Эцсийн үнэ (₮)</label><input class="form-input" type="number" id="crmDlFinal" value="${d?.finalPrice || ''}" /></div>
        </div>
        <div class="form-grid-2">
          <div><label class="form-label">Гэрээний огноо</label><input class="form-input" type="date" id="crmDlDate" value="${d?.contractDate ? new Date(crmMsFromTs(d.contractDate)).toISOString().slice(0, 10) : ''}" /></div>
          <div><label class="form-label">Шимтгэл / Commission (₮)</label><input class="form-input" type="number" id="crmDlCommission" value="${d?.commissionAmount || ''}" /></div>
        </div>
        <div class="form-row"><label class="form-label">Тэмдэглэл</label><textarea class="form-input" id="crmDlNotes" style="min-height:60px;">${esc(d?.notes || '')}</textarea></div>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;border:1.5px solid var(--line-2);margin-bottom:16px;" onclick="crmSaveDeal(${d ? `'${d.id}'` : 'null'}, '${clientId}')">Хадгалах</button>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-blue" style="flex:1;justify-content:center;" onclick="crmCloseDeal(${d ? `'${d.id}'` : 'null'}, '${clientId}', 'sold')">✓ Зарагдсан гэж хаах</button>
          <button class="btn btn-blue" style="flex:1;justify-content:center;" onclick="crmCloseDeal(${d ? `'${d.id}'` : 'null'}, '${clientId}', 'rented')">✓ Түрээслэгдсэн гэж хаах</button>
        </div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function crmReadDealForm() {
    return {
      offeredPrice: Number(document.getElementById('crmDlOffered').value) || 0,
      finalPrice: Number(document.getElementById('crmDlFinal').value) || 0,
      contractDate: document.getElementById('crmDlDate').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('crmDlDate').value + 'T00:00:00')) : null,
      commissionAmount: Number(document.getElementById('crmDlCommission').value) || 0,
      notes: document.getElementById('crmDlNotes').value.trim()
    };
  }
  async function crmSaveDeal(dealId, clientId) {
    const c = crmClientById(clientId);
    const form = crmReadDealForm();
    try {
      if (dealId) {
        await db.collection('deals').doc(dealId).update(Object.assign({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, form));
        Object.assign(_crmDeals.find(x => x.id === dealId) || {}, form);
      } else {
        const listingSel = document.getElementById('crmDlListing');
        const listing = crmActiveListingOptions().find(l => l.firestoreId === listingSel.value);
        const payload = Object.assign({
          listingId: listingSel.value, clientId, agentId: c.assignedAgentId, status: 'negotiating',
          listingTitle: listing ? listing.title : '', clientName: c.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, form);
        const ref = await db.collection('deals').add(payload);
        _crmDeals.push(Object.assign({ id: ref.id }, payload));
        // Opening a real deal is forward progress — same non-regressing advance as scheduling a viewing.
        const stageOrder = CRM_STAGES.map(s => s.id);
        if (c && stageOrder.indexOf(c.stage) < stageOrder.indexOf('negotiation')) {
          await db.collection('clients').doc(clientId).update({ stage: 'negotiation', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          c.stage = 'negotiation';
        }
      }
      showToast('Хадгалагдлаа', 'success');
      closeModal();
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmSaveDeal failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  // Closing a deal never cascades automatically (no backend) — this makes the SAME two
  // writes a human would make by hand: the deal doc, and the listing's status via the exact
  // {status}-only shape js/my-listings.js markSoldRented() / js/admin.js
  // adminMarkListingStatus() already use — no new write shape, no rules change needed.
  async function crmCloseDeal(dealId, clientId, kind) {
    const c = crmClientById(clientId);
    const form = crmReadDealForm();
    if (!form.contractDate) form.contractDate = firebase.firestore.Timestamp.fromDate(new Date());
    form.finalPrice = form.finalPrice || form.offeredPrice;
    try {
      let listingId, ref;
      if (dealId) {
        ref = db.collection('deals').doc(dealId);
        const existing = _crmDeals.find(x => x.id === dealId);
        listingId = existing?.listingId;
        await ref.update(Object.assign({ status: kind, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, form));
        Object.assign(existing || {}, form, { status: kind });
      } else {
        const listingSel = document.getElementById('crmDlListing');
        listingId = listingSel.value;
        const listing = crmActiveListingOptions().find(l => l.firestoreId === listingId);
        const payload = Object.assign({
          listingId, clientId, agentId: c.assignedAgentId, status: kind,
          listingTitle: listing ? listing.title : '', clientName: c.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, form);
        const added = await db.collection('deals').add(payload);
        _crmDeals.push(Object.assign({ id: added.id }, payload));
      }
      if (listingId) {
        await db.collection('listings').doc(listingId).update({ status: kind });
        const l = (typeof listings !== 'undefined' ? listings : []).find(x => x.firestoreId === listingId);
        if (l) { l.status = kind; l._inactive = true; }
        if (typeof renderListings === 'function' && typeof getFilteredListings === 'function') renderListings(getFilteredListings());
        if (typeof renderHomeListings === 'function') renderHomeListings();
      }
      const closedStage = kind === 'sold' ? 'closed_sold' : 'closed_rented';
      await db.collection('clients').doc(clientId).update({ stage: closedStage, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (c) c.stage = closedStage;
      if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) logAdminAction('crm_close_deal', 'deal', dealId || listingId, kind);
      showToast(kind === 'sold' ? 'Зарагдсан гэж хаагдлаа' : 'Түрээслэгдсэн гэж хаагдлаа', 'success');
      closeModal();
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmCloseDeal failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== PAGE MOUNTS =====
  // Agent's own CRM page (#agent-crm, index.html) — always scoped to currentUser.uid.
  async function renderAgentCrmPage(tab) {
    if (!currentUser) return;
    const el = document.getElementById('crmContent');
    if (!el) return;
    if (tab) _crmTab = tab;
    ['pipeline', 'clients', 'viewings', 'deals'].forEach(t => {
      const btn = document.getElementById('crmTab-' + t);
      if (btn) btn.classList.toggle('active', t === _crmTab);
    });
    if (_crmScopeUid !== currentUser.uid) {
      el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
      await crmLoadAll(currentUser.uid);
    }
    crmRenderTab(el, currentUser.uid);
  }
  // Admin CRM section (js/admin.js ADMIN_NAV 'crm') — scopeUid null = everything.
  async function renderAdminCrmSection(tab) {
    const el = document.getElementById('adminSectionContent');
    if (!el) return;
    if (tab) _crmTab = tab;
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    // Agent names/filters need the same _adminUsersCache the Agents section builds — fetch
    // it here too if the admin lands on CRM first, so this section is self-sufficient. This
    // populates the exact same global cache, so a later visit to Agents doesn't re-fetch.
    if (typeof _adminUsersCache === 'undefined' || !_adminUsersCache) {
      try {
        const usnap = await db.collection('users').get();
        _adminUsersCache = usnap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
      } catch(e) { console.error('CRM users prefetch failed:', e.code, e.message); }
    }
    if (_crmScopeUid !== null) await crmLoadAll(null);
    const kpis = computeCrmKpis(_crmClients, _crmDeals);
    el.innerHTML = `
      <div class="admin-kpi-grid" style="margin-bottom:16px;">
        ${adminKpiCard('Нийт харилцагч', { ok: true, value: kpis.totalClients })}
        ${adminKpiCard('Шинэ lead', { ok: true, value: kpis.newLeads })}
        ${adminKpiCard('Үзлэг товлосон', { ok: true, value: kpis.viewingScheduled })}
        ${adminKpiCard('Хэлэлцээр дээр', { ok: true, value: kpis.inNegotiation })}
        ${adminKpiCard('Энэ сарын гэрээ', { ok: true, value: kpis.dealsThisMonth })}
        ${adminKpiCard('Зарагдсан', { ok: true, value: kpis.sold })}
        ${adminKpiCard('Түрээслэгдсэн', { ok: true, value: kpis.rented })}
        ${adminKpiCard('Conversion rate', { ok: true, value: kpis.conversionRate + '%' })}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="mytab ${_crmTab === 'pipeline' ? 'active' : ''}" onclick="renderAdminCrmSection('pipeline')">Pipeline</button>
        <button class="mytab ${_crmTab === 'clients' ? 'active' : ''}" onclick="renderAdminCrmSection('clients')">Харилцагчид</button>
        <button class="mytab ${_crmTab === 'viewings' ? 'active' : ''}" onclick="renderAdminCrmSection('viewings')">Үзлэгүүд</button>
        <button class="mytab ${_crmTab === 'deals' ? 'active' : ''}" onclick="renderAdminCrmSection('deals')">Хэлэлцээр/Гэрээ</button>
        <button class="mytab ${_crmTab === 'followups' ? 'active' : ''}" onclick="renderAdminCrmSection('followups')">Follow-up</button>
        <button class="mytab ${_crmTab === 'byagent' ? 'active' : ''}" onclick="renderAdminCrmSection('byagent')">Agent-аар</button>
      </div>
      <div id="crmAdminBody"></div>
    `;
    crmRenderTab(document.getElementById('crmAdminBody'), null);
  }
  function crmRenderTab(el, scopeUid) {
    if (!el) return;
    if (_crmTab === 'pipeline') renderCrmKanban(el, scopeUid);
    else if (_crmTab === 'clients') renderCrmClientsList(el, scopeUid);
    else if (_crmTab === 'viewings') renderCrmViewingsList(el, scopeUid);
    else if (_crmTab === 'deals') renderCrmDealsList(el, scopeUid);
    else if (_crmTab === 'followups') renderCrmFollowUpWidgets(el, scopeUid);
    else if (_crmTab === 'byagent') renderCrmByAgentTable(el);
    else renderCrmKanban(el, scopeUid);
  }
  function renderCrmByAgentTable(el) {
    if (!el || typeof _adminUsersCache === 'undefined' || !_adminUsersCache) { if (el) el.innerHTML = adminEmptyState('Ачаалж чадсангүй', 'Эхлээд Agent-ууд хэсгийг нэг удаа нээнэ үү.'); return; }
    const agents = _adminUsersCache.filter(u => (u.role || 'user') === 'user');
    el.innerHTML = `
      <div class="admin-list-table">
        ${agents.map(u => {
          const clients = _crmClients.filter(c => c.assignedAgentId === u.uid);
          const deals = _crmDeals.filter(d => d.agentId === u.uid);
          const k = computeCrmKpis(clients, deals);
          return `
            <div class="admin-row">
              <div class="admin-user-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc((u.firstName || '?')[0].toUpperCase())}</div>
              <div class="admin-row-body">
                <div class="admin-row-title">${esc(((u.lastName || '') + ' ' + (u.firstName || '')).trim())}</div>
                <div class="admin-row-meta">${k.totalClients} харилцагч · ${k.sold} зарагдсан · ${k.rented} түрээслэгдсэн · Conversion ${k.conversionRate}%</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  function crmRerenderCurrentView() {
    if (_crmScopeUid === null) { renderAdminCrmSection(); }
    else if (_crmScopeUid) { const el = document.getElementById('crmContent'); if (el) crmRenderTab(el, _crmScopeUid); }
  }
