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

  const CRM_LEAD_SOURCES = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'website', label: 'Website' },
    { id: 'phone', label: 'Утас' },
    { id: 'referral', label: 'Танилцуулга' },
    { id: 'walkin', label: 'Биечлэн ирсэн' },
    { id: 'other', label: 'Бусад' }
  ];
  const CRM_LEAD_SOURCE_LABEL = Object.fromEntries(CRM_LEAD_SOURCES.map(s => [s.id, s.label]));

  const CRM_CONTRACT_STATUS_LABEL = { draft: 'Ноорог', signed: 'Гарын үсэг зурсан', cancelled: 'Цуцлагдсан' };

  const CRM_ACTIVITY_LABEL = {
    client_created: 'Харилцагч үүсгэсэн',
    agent_assigned: 'Agent оноогдсон',
    stage_changed: 'Pipeline шат өөрчлөгдсөн',
    followup_done: 'Follow-up хийсэн',
    followup_scheduled: 'Дараагийн follow-up товлосон',
    viewing_scheduled: 'Үзлэг товлосон',
    viewing_done: 'Үзлэг хийгдсэн',
    viewing_cancelled: 'Үзлэг цуцлагдсан',
    deal_created: 'Хэлэлцээр нээсэн',
    deal_status_changed: 'Хэлэлцээрийн төлөв өөрчлөгдсөн',
    contract_added: 'Гэрээ/баримт бичиг нэмсэн',
    deal_closed_sold: 'Зарагдсан гэж хаасан',
    deal_closed_rented: 'Түрээслэгдсэн гэж хаасан'
  };

  let _crmScopeUid = undefined; // undefined = never loaded yet; null = admin (all); uid = agent
  let _crmClients = [];
  let _crmViewings = [];
  let _crmDeals = [];
  let _crmTab = 'pipeline';
  let _crmClientsSearch = '';
  let _crmClientsStageFilter = 'all';
  let _crmClientsAgentFilter = 'all';
  // Whichever monthly-report picker last rendered (dashboard, CRM-page tab, or admin
  // section) — the export buttons read this rather than re-deriving "which container
  // triggered me", since a click on an export button carries no container context itself.
  let _crmLastReportYear = null, _crmLastReportMonth = null;

  // Deal considered "stuck" in negotiation past this many days since it was opened —
  // a plain constant (not a UI setting) so it's trivial to tune later without new UI.
  const CRM_NEGOTIATION_STALE_DAYS = 14;

  // Five-way date bucketing shared by follow-ups AND viewings, so "today"/"tomorrow"/
  // "this week" can never mean something subtly different between the two features.
  function crmDateBucket(ms) {
    if (!ms) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const day = new Date(ms); day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((day - now) / 86400000);
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays <= 7) return 'week';
    return 'later';
  }
  function crmMsFromTs(ts) {
    return ts?.toMillis?.() ?? (ts instanceof Date ? ts.getTime() : (typeof ts === 'number' ? ts : 0));
  }

  // The one place that turns a deal's commission fields into real numbers. Old deals only
  // ever had a flat commissionAmount (no commissionType/commissionRate/agentCommissionRate)
  // — with no commissionType set, this falls straight back to that original number, so
  // nothing already saved changes. New deals default agentCommissionRate to 100 (the agent
  // keeps it all unless someone explicitly sets a company split) — the same behavior a flat
  // commissionAmount always implied, just made explicit.
  function computeDealCommission(deal) {
    const finalPrice = deal.finalPrice || deal.offeredPrice || 0;
    let commissionAmount;
    if (deal.commissionType === 'percent') {
      commissionAmount = finalPrice * ((deal.commissionRate || 0) / 100);
    } else {
      // 'fixed', or no commissionType at all (backward-compat: old deals) — the flat
      // amount that was actually entered, unchanged.
      commissionAmount = deal.commissionAmount || 0;
    }
    const agentRate = deal.agentCommissionRate != null ? deal.agentCommissionRate : 100;
    const agentCommissionAmount = commissionAmount * (agentRate / 100);
    const companyCommissionAmount = commissionAmount - agentCommissionAmount;
    return { commissionAmount, agentCommissionAmount, companyCommissionAmount };
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

  // ===== CLIENT ACTIVITY TIMELINE (append-only, see firestore.rules for the real gate) =====
  // Fire-and-forget — same idiom as js/auth.js's lastActiveAt write: a logging failure must
  // never block or surface an error on the primary action it's attached to.
  function crmLogActivity(clientId, type, description) {
    if (!currentUser || !clientId) return;
    db.collection('clientActivities').add({
      clientId, type, description: description || '',
      actorUid: currentUser.uid, actorName: currentUser.name || currentUser.email || 'Хэрэглэгч',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error('crmLogActivity failed:', e.code, e.message));
  }
  async function crmLoadActivities(clientId) {
    try {
      const snap = await db.collection('clientActivities').where('clientId', '==', clientId).orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    } catch(e) {
      console.error('crmLoadActivities failed:', e.code, e.message);
      return [];
    }
  }

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

  // ===== LEAD SOURCE ANALYTICS =====
  // Deals aren't tied to a source directly — "which source produced a won deal" is derived
  // by joining a deal back to its client's leadSource (clients already carry that field).
  function computeLeadSourceStats(clients, deals) {
    const dealsByClient = {};
    deals.forEach(d => {
      if (d.status !== 'sold' && d.status !== 'rented') return;
      dealsByClient[d.clientId] = (dealsByClient[d.clientId] || 0) + 1;
    });
    return CRM_LEAD_SOURCES.map(s => {
      const leadsFromSource = clients.filter(c => (c.leadSource || 'other') === s.id);
      const dealsFromSource = leadsFromSource.reduce((sum, c) => sum + (dealsByClient[c.id] || 0), 0);
      return {
        id: s.id, label: s.label,
        leads: leadsFromSource.length,
        deals: dealsFromSource,
        conversionRate: leadsFromSource.length > 0 ? Math.round(dealsFromSource / leadsFromSource.length * 100) : 0
      };
    });
  }
  function renderCrmLeadSourceReport(el, scopeUid) {
    if (!el) return;
    const clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients;
    const deals = scopeUid ? _crmDeals.filter(d => d.agentId === scopeUid) : _crmDeals;
    const stats = computeLeadSourceStats(clients, deals);
    el.innerHTML = `
      <div class="admin-list-table">
        ${stats.map(s => `
          <div class="admin-row">
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(s.label)}</div>
              <div class="admin-row-meta">${s.leads} lead · ${s.deals} deal · Conversion ${s.conversionRate}%</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ===== REMINDER BOARD (Хугацаа хэтэрсэн / Өнөөдөр / Маргааш / Дууссан) =====
  // Shared by the Agent dashboard (#dashCrmFollowUp) and the Admin CRM "Reminder" tab —
  // same function, same signature as before this feature, so every existing call site
  // (dashboard.js, crmRenderTab) gets the richer board for free with no wiring change.
  function crmFollowUpRow(c) {
    const bucket = crmDateBucket(crmMsFromTs(c.nextFollowUpAt));
    return `
      <div class="crm-reminder-row">
        <div class="crm-reminder-main" onclick="openClientDetailModal('${c.id}')">
          <div class="crm-follow-name">${esc(c.name || 'Нэргүй')}</div>
          <div class="crm-follow-note">${esc(c.phone || '—')} ${c.interestedListingTitle ? '· ' + esc(c.interestedListingTitle) : ''}</div>
          ${c.followUpNote ? `<div class="crm-follow-note">${esc(c.followUpNote)}</div>` : ''}
        </div>
        <div class="crm-reminder-side">
          <span class="admin-status-pill status-${bucket}">${new Date(crmMsFromTs(c.nextFollowUpAt)).toLocaleString('mn-MN', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;" onclick="crmMarkFollowUpDone('${c.id}')">Хийсэн</button>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;" onclick="crmSetNextFollowUp('${c.id}')">Дараагийн follow-up</button>
          </div>
        </div>
      </div>`;
  }
  function crmFollowUpDoneRow(c) {
    return `
      <div class="crm-reminder-row">
        <div class="crm-reminder-main" onclick="openClientDetailModal('${c.id}')">
          <div class="crm-follow-name">${esc(c.name || 'Нэргүй')}</div>
          <div class="crm-follow-note">${esc(c.phone || '—')} ${c.interestedListingTitle ? '· ' + esc(c.interestedListingTitle) : ''}</div>
        </div>
        <div class="crm-reminder-side">
          <span class="admin-status-pill status-done">${fmtRelativeTime(c.lastFollowUpDoneAt)}</span>
          <div style="margin-top:6px;">
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;" onclick="crmSetNextFollowUp('${c.id}')">Дараагийн follow-up</button>
          </div>
        </div>
      </div>`;
  }
  function renderCrmFollowUpWidgets(el, scopeUid) {
    if (!el) return;
    const clients = (scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients)
      .filter(c => !CRM_CLOSED_STAGES.includes(c.stage));
    const pending = clients.filter(c => c.nextFollowUpAt);
    const overdue = pending.filter(c => crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'overdue');
    const today = pending.filter(c => crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'today');
    const tomorrow = pending.filter(c => crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'tomorrow');
    const weekAgoMs = Date.now() - 7 * 86400000;
    const done = clients.filter(c => c.lastFollowUpDoneAt && crmMsFromTs(c.lastFollowUpDoneAt) >= weekAgoMs)
      .sort((a, b) => crmMsFromTs(b.lastFollowUpDoneAt) - crmMsFromTs(a.lastFollowUpDoneAt));

    const section = (label, items, rowFn, danger) => `
      <div class="admin-panel" style="margin-bottom:14px;">
        <div class="admin-panel-head">${label} ${items.length ? `<span class="crm-count-badge${danger ? ' danger' : ''}">${items.length}</span>` : ''}</div>
        <div>${items.length ? items.map(rowFn).join('') : '<div class="crm-empty-row">Алга</div>'}</div>
      </div>`;
    el.innerHTML = `
      <div class="crm-reminder-grid">
        <div>${section('Хугацаа хэтэрсэн', overdue, crmFollowUpRow, true)}</div>
        <div>${section('Өнөөдөр', today, crmFollowUpRow, false)}</div>
        <div>${section('Маргааш', tomorrow, crmFollowUpRow, false)}</div>
        <div>${section('Дууссан', done, crmFollowUpDoneRow, false)}</div>
      </div>
    `;
  }
  async function crmMarkFollowUpDone(clientId) {
    try {
      await db.collection('clients').doc(clientId).update({
        nextFollowUpAt: null,
        lastFollowUpDoneAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const c = crmClientById(clientId);
      if (c) { c.nextFollowUpAt = null; c.lastFollowUpDoneAt = Date.now(); }
      crmLogActivity(clientId, 'followup_done', '');
      showToast('Follow-up хийгдсэн гэж тэмдэглэгдлээ', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmMarkFollowUpDone failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  async function crmSetNextFollowUp(clientId) {
    const dateVal = prompt('Дараагийн follow-up огноо (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateVal) return;
    const d = new Date(dateVal + 'T09:00:00');
    if (isNaN(d.getTime())) { showToast('Огноо буруу форматтай байна'); return; }
    const note = prompt('Follow-up тэмдэглэл (заавал биш):', '') || '';
    try {
      const ts = firebase.firestore.Timestamp.fromDate(d);
      await db.collection('clients').doc(clientId).update({
        nextFollowUpAt: ts, followUpNote: note,
        lastFollowUpDoneAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const c = crmClientById(clientId);
      if (c) { c.nextFollowUpAt = ts; c.followUpNote = note; c.lastFollowUpDoneAt = Date.now(); }
      crmLogActivity(clientId, 'followup_scheduled', note ? d.toLocaleDateString('mn-MN') + ' — ' + note : d.toLocaleDateString('mn-MN'));
      showToast('Дараагийн follow-up товлогдлоо', 'success');
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmSetNextFollowUp failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== TODAY'S TASK BOARD ("Өнөөдрийн ажил") =====
  function crmTaskLine(label, count, onclick, danger) {
    return `
      <div class="crm-task-line" onclick="${onclick}">
        <span>${esc(label)}</span>
        <span class="crm-count-badge${danger && count > 0 ? ' danger' : ''}">${count}</span>
      </div>`;
  }
  function renderCrmTodayTasks(el, scopeUid) {
    if (!el) return;
    const clients = (scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients);
    const viewings = (scopeUid ? _crmViewings.filter(v => v.agentId === scopeUid) : _crmViewings);
    const deals = (scopeUid ? _crmDeals.filter(d => d.agentId === scopeUid) : _crmDeals);
    const activeClients = clients.filter(c => !CRM_CLOSED_STAGES.includes(c.stage));
    const todayFollowUps = activeClients.filter(c => c.nextFollowUpAt && crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'today').length;
    const overdueFollowUps = activeClients.filter(c => c.nextFollowUpAt && crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'overdue').length;
    const todayViewings = viewings.filter(v => v.status === 'scheduled' && crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'today').length;
    const weekViewings = viewings.filter(v => v.status === 'scheduled' && ['tomorrow', 'week'].includes(crmDateBucket(crmMsFromTs(v.scheduledAt)))).length;
    const inNegotiation = clients.filter(c => c.stage === 'negotiation').length;
    const dealsAwaitingContract = deals.filter(d => d.status === 'negotiating').length;
    const goCrm = (tab) => `showPage('agent-crm'); renderAgentCrmPage('${tab}');`;
    const goAdminCrm = (tab) => `renderAdminDashboard('crm'); setTimeout(()=>renderAdminCrmSection('${tab}'), 50);`;
    const nav = scopeUid ? goCrm : goAdminCrm;
    el.innerHTML = `
      <div class="crm-task-list">
        ${crmTaskLine('Өнөөдрийн follow-up', todayFollowUps, nav('reminder'), false)}
        ${crmTaskLine('Хугацаа хэтэрсэн follow-up', overdueFollowUps, nav('reminder'), true)}
        ${crmTaskLine('Өнөөдрийн үзлэг', todayViewings, nav('viewings'), false)}
        ${crmTaskLine('Удахгүй хийх үзлэг', weekViewings, nav('viewings'), false)}
        ${crmTaskLine('Хэлэлцээр дээр байгаа client', inNegotiation, nav('pipeline'), false)}
        ${crmTaskLine('Гэрээ хүлээгдэж байгаа deal', dealsAwaitingContract, nav('deals'), false)}
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
    const bucket = c.nextFollowUpAt ? crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) : null;
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
    const c0 = crmClientById(clientId);
    const oldStage = c0 ? c0.stage : null;
    try {
      await db.collection('clients').doc(clientId).update({ stage: newStage, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const c = crmClientById(clientId);
      if (c) c.stage = newStage;
      if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) logAdminAction('crm_stage_change', 'client', clientId, newStage);
      crmLogActivity(clientId, 'stage_changed', (CRM_STAGE_LABEL[oldStage] || oldStage || '—') + ' → ' + (CRM_STAGE_LABEL[newStage] || newStage));
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
    const bucket = c.nextFollowUpAt ? crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) : null;
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
        <div class="form-row">
          <label class="form-label">Lead source</label>
          <select class="form-select" id="crmCLeadSource">
            ${CRM_LEAD_SOURCES.map(s => `<option value="${s.id}" ${(c?.leadSource || 'other') === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
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
      leadSource: document.getElementById('crmCLeadSource').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (clientId) {
        const prevAgent = crmClientById(clientId)?.assignedAgentId;
        if (isOwnerOrAdmin && agentSel) payload.assignedAgentId = agentSel.value;
        await db.collection('clients').doc(clientId).update(payload);
        Object.assign(crmClientById(clientId) || {}, payload);
        if (isOwnerOrAdmin) logAdminAction('crm_edit_client', 'client', clientId, '');
        if (payload.assignedAgentId && payload.assignedAgentId !== prevAgent) crmLogActivity(clientId, 'agent_assigned', crmAgentName(payload.assignedAgentId));
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
        crmLogActivity(ref.id, 'client_created', CRM_LEAD_SOURCE_LABEL[payload.leadSource] || '');
        if (isOwnerOrAdmin && payload.assignedAgentId !== currentUser.uid) crmLogActivity(ref.id, 'agent_assigned', crmAgentName(payload.assignedAgentId));
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
      crmLogActivity(clientId, 'agent_assigned', crmAgentName(newAgentUid));
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
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:6px;">Байршил: ${esc(c.locationInterest || '—')}</div>
        <div style="font-size:13px;color:var(--ink-3);margin-bottom:16px;">Lead source: ${esc(CRM_LEAD_SOURCE_LABEL[c.leadSource] || '—')}</div>

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

        <div class="step-section-title" style="margin:16px 0 8px;">Түүх</div>
        <div id="crmActivityTimeline"><div class="crm-empty-row">Ачааллаж байна…</div></div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    crmLoadActivities(clientId).then(activities => {
      const el = document.getElementById('crmActivityTimeline');
      if (!el) return;
      el.innerHTML = activities.length === 0 ? '<div class="crm-empty-row">Түүх алга</div>' : `
        <div class="crm-timeline">
          ${activities.map(a => `
            <div class="crm-timeline-item">
              <div class="crm-timeline-dot"></div>
              <div class="crm-timeline-body">
                <div class="crm-timeline-label">${esc(CRM_ACTIVITY_LABEL[a.type] || a.type)}</div>
                ${a.description ? `<div class="crm-timeline-desc">${esc(a.description)}</div>` : ''}
                <div class="crm-timeline-meta">${esc(a.actorName || '')} · ${fmtRelativeTime(a.createdAt)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    });
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
    const scheduled = viewings.filter(v => v.status === 'scheduled');
    const groups = [
      { label: 'Хугацаа өнгөрсөн', items: scheduled.filter(v => crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'overdue') },
      { label: 'Өнөөдөр', items: scheduled.filter(v => crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'today') },
      { label: 'Маргааш', items: scheduled.filter(v => crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'tomorrow') },
      { label: 'Энэ 7 хоногт', items: scheduled.filter(v => crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'week') },
      { label: 'Хожим', items: scheduled.filter(v => crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'later') },
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
      crmLogActivity(clientId, 'viewing_scheduled', (listing ? listing.title : '') + ' — ' + new Date(dateVal + 'T' + timeVal + ':00').toLocaleString('mn-MN'));
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
      if (v) crmLogActivity(v.clientId, status === 'done' ? 'viewing_done' : 'viewing_cancelled', (v.listingTitle || '') + (notesAfter ? ' — ' + notesAfter : ''));
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
        ${deals.length === 0 ? adminEmptyState('Хэлэлцээр алга', 'Харилцагчийн дэлгэрэнгүйгээс "Гэрээ нээх" дарж эхлүүлнэ үү.') : deals.map(d => {
          const cm = computeDealCommission(d);
          return `
          <div class="admin-row" onclick="openDealModal('${d.id}', '${d.clientId}')" style="cursor:pointer;">
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(d.listingTitle || '—')} — ${esc(d.clientName || '')}</div>
              <div class="admin-row-meta">Санал: ${fmt(d.offeredPrice || 0)}₮ ${d.finalPrice ? '· Эцсийн: ' + fmt(d.finalPrice) + '₮' : ''} ${!scopeUid ? '· ' + esc(crmAgentName(d.agentId) || '') : ''}</div>
              ${cm.commissionAmount ? `<div class="admin-row-meta">Шимтгэл: ${fmt(Math.round(cm.commissionAmount))}₮ (Agent: ${fmt(Math.round(cm.agentCommissionAmount))}₮)</div>` : ''}
              <span class="admin-status-pill status-${d.status}">${CRM_DEAL_STATUS_LABEL[d.status] || d.status}</span>
            </div>
          </div>
        `;
        }).join('')}
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
        <div class="form-row"><label class="form-label">Гэрээний огноо</label><input class="form-input" type="date" id="crmDlDate" value="${d?.contractDate ? new Date(crmMsFromTs(d.contractDate)).toISOString().slice(0, 10) : ''}" /></div>

        <div class="step-section-title" style="margin:16px 0 8px;">Гэрээ / Contract</div>
        <div class="form-grid-2">
          <div><label class="form-label">Гэрээний дугаар</label><input class="form-input" id="crmDlContractNumber" value="${esc(d?.contractNumber || '')}" /></div>
          <div>
            <label class="form-label">Гэрээний төлөв</label>
            <select class="form-select" id="crmDlContractStatus">
              ${Object.keys(CRM_CONTRACT_STATUS_LABEL).map(k => `<option value="${k}" ${(d?.contractStatus || 'draft') === k ? 'selected' : ''}>${CRM_CONTRACT_STATUS_LABEL[k]}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row"><label class="form-label">Гэрээний тэмдэглэл</label><input class="form-input" id="crmDlContractNote" value="${esc(d?.contractNote || '')}" /></div>

        <div class="step-section-title" style="margin:16px 0 8px;">Баримт бичиг</div>
        ${d ? `
        <div id="crmDlDocsList">${crmDealDocumentsListHtml(d)}</div>
        <input type="file" id="crmDlFileInput" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display:none;" onchange="crmUploadDealDocument('${d.id}', this.files[0])" />
        <button class="btn btn-ghost" style="width:100%;justify-content:center;border:1.5px solid var(--line-2);margin-bottom:16px;" onclick="document.getElementById('crmDlFileInput').click()">Файл нэмэх (PDF/JPG/PNG/DOC/DOCX, 15MB хүртэл)</button>
        ` : `<div class="crm-empty-row">Эхлээд хэлэлцээрээ хадгалснаар баримт бичиг хавсаргах боломжтой болно.</div>`}

        <div class="step-section-title" style="margin:16px 0 8px;">Commission</div>
        <div class="form-row">
          <label class="form-label">Шимтгэлийн төрөл</label>
          <select class="form-select" id="crmDlCommissionType" onchange="crmToggleCommissionFields()">
            <option value="fixed" ${(d?.commissionType || 'fixed') === 'fixed' ? 'selected' : ''}>Тогтмол дүн (₮)</option>
            <option value="percent" ${d?.commissionType === 'percent' ? 'selected' : ''}>Эцсийн үнийн хувь (%)</option>
          </select>
        </div>
        <div class="form-grid-2">
          <div id="crmDlCommissionFixedWrap">
            <label class="form-label">Шимтгэлийн дүн (₮)</label>
            <input class="form-input" type="number" id="crmDlCommission" value="${d?.commissionAmount || ''}" oninput="crmUpdateCommissionPreview()" />
          </div>
          <div id="crmDlCommissionRateWrap" style="display:none;">
            <label class="form-label">Шимтгэлийн хувь (%)</label>
            <input class="form-input" type="number" id="crmDlCommissionRate" value="${d?.commissionRate || ''}" oninput="crmUpdateCommissionPreview()" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Agent-ийн хувь <span class="hint">— нийт шимтгэлээс хэдэн хувь нь Agent-д ногдох</span></label>
          <input class="form-input" type="number" id="crmDlAgentRate" value="${d?.agentCommissionRate != null ? d.agentCommissionRate : 100}" oninput="crmUpdateCommissionPreview()" />
        </div>
        <div id="crmDlCommissionPreview" class="crm-commission-preview"></div>

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
    crmToggleCommissionFields();
  }
  function crmToggleCommissionFields() {
    const type = document.getElementById('crmDlCommissionType')?.value;
    const fixedWrap = document.getElementById('crmDlCommissionFixedWrap');
    const rateWrap = document.getElementById('crmDlCommissionRateWrap');
    if (fixedWrap) fixedWrap.style.display = type === 'percent' ? 'none' : '';
    if (rateWrap) rateWrap.style.display = type === 'percent' ? '' : 'none';
    crmUpdateCommissionPreview();
  }
  // Live preview only — the authoritative computation (computeDealCommission) runs again,
  // identically, at save time against whatever's actually persisted.
  function crmUpdateCommissionPreview() {
    const el = document.getElementById('crmDlCommissionPreview');
    if (!el) return;
    const draft = {
      finalPrice: Number(document.getElementById('crmDlFinal')?.value) || Number(document.getElementById('crmDlOffered')?.value) || 0,
      commissionType: document.getElementById('crmDlCommissionType')?.value,
      commissionRate: Number(document.getElementById('crmDlCommissionRate')?.value) || 0,
      commissionAmount: Number(document.getElementById('crmDlCommission')?.value) || 0,
      agentCommissionRate: document.getElementById('crmDlAgentRate')?.value !== '' ? Number(document.getElementById('crmDlAgentRate').value) : 100
    };
    const c = computeDealCommission(draft);
    el.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3);padding:10px 0;">
        <div>Нийт шимтгэл: <b style="color:var(--ink);">${fmt(Math.round(c.commissionAmount))}₮</b></div>
        <div>Agent-д: <b style="color:var(--ink);">${fmt(Math.round(c.agentCommissionAmount))}₮</b></div>
        <div>Компанид: <b style="color:var(--ink);">${fmt(Math.round(c.companyCommissionAmount))}₮</b></div>
      </div>
    `;
  }
  // ===== DEAL DOCUMENTS (Firebase Storage: deal-documents/{agentId}/{dealId}/{fileName}) =====
  const CRM_DOC_ACCEPT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const CRM_DOC_MAX_BYTES = 15 * 1024 * 1024;
  function crmDealDocumentsListHtml(d) {
    const docs = d.documents || [];
    if (!docs.length) return '<div class="crm-empty-row">Баримт бичиг алга</div>';
    return docs.map(doc => `
      <div class="crm-doc-row">
        <div>
          <div class="crm-doc-name">${esc(doc.name)}</div>
          <div class="crm-doc-meta">${esc(doc.uploadedByName || '')} · ${fmtRelativeTime(doc.uploadedAt)} · ${((doc.size || 0) / 1024 / 1024).toFixed(1)}MB</div>
        </div>
        <a class="btn btn-ghost" style="padding:6px 12px;font-size:12px;" href="${esc(doc.url)}" target="_blank" rel="noopener">Татах</a>
      </div>
    `).join('');
  }
  async function crmUploadDealDocument(dealId, file) {
    if (!file) return;
    if (!CRM_DOC_ACCEPT_TYPES.includes(file.type)) { showToast('Зөвшөөрөгдөөгүй файлын төрөл (PDF/JPG/PNG/DOC/DOCX сонгоно уу)'); return; }
    if (file.size >= CRM_DOC_MAX_BYTES) { showToast('Файл 15MB-аас бага байх ёстой'); return; }
    const d = _crmDeals.find(x => x.id === dealId);
    if (!d) return;
    showToast('Файл хуулж байна…');
    let timedOut = false, timeoutId = null;
    try {
      const path = 'deal-documents/' + d.agentId + '/' + dealId + '/' + Date.now() + '-' + file.name;
      const uploadTask = storage.ref(path).put(file, { contentType: file.type });
      timeoutId = setTimeout(() => { timedOut = true; uploadTask.cancel(); }, 18000);
      await uploadTask;
      clearTimeout(timeoutId);
      const url = await uploadTask.snapshot.ref.getDownloadURL();
      const entry = {
        name: file.name, url, storagePath: path, type: file.type, size: file.size,
        uploadedBy: currentUser.uid, uploadedByName: currentUser.name || currentUser.email || 'Agent', uploadedAt: Date.now()
      };
      await db.collection('deals').doc(dealId).update({
        documents: firebase.firestore.FieldValue.arrayUnion(entry),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      d.documents = d.documents || []; d.documents.push(entry);
      crmLogActivity(d.clientId, 'contract_added', file.name);
      showToast('Файл хавсаргагдлаа', 'success');
      const listEl = document.getElementById('crmDlDocsList');
      if (listEl) listEl.innerHTML = crmDealDocumentsListHtml(d);
      const fileInput = document.getElementById('crmDlFileInput');
      if (fileInput) fileInput.value = '';
    } catch(e) {
      clearTimeout(timeoutId);
      console.error('crmUploadDealDocument failed:', e.code, e.message);
      showToast(timedOut ? 'Файл хуулах хугацаа хэтэрлээ' : 'Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
  function crmReadDealForm() {
    const draft = {
      offeredPrice: Number(document.getElementById('crmDlOffered').value) || 0,
      finalPrice: Number(document.getElementById('crmDlFinal').value) || 0,
      contractDate: document.getElementById('crmDlDate').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('crmDlDate').value + 'T00:00:00')) : null,
      contractNumber: document.getElementById('crmDlContractNumber').value.trim(),
      contractStatus: document.getElementById('crmDlContractStatus').value,
      contractNote: document.getElementById('crmDlContractNote').value.trim(),
      commissionType: document.getElementById('crmDlCommissionType').value,
      commissionRate: Number(document.getElementById('crmDlCommissionRate').value) || 0,
      commissionAmount: Number(document.getElementById('crmDlCommission').value) || 0,
      agentCommissionRate: document.getElementById('crmDlAgentRate').value !== '' ? Number(document.getElementById('crmDlAgentRate').value) : 100,
      notes: document.getElementById('crmDlNotes').value.trim()
    };
    // Persist the derived split alongside the raw inputs, computed by the one function
    // (computeDealCommission) every read site also uses — so a saved deal's
    // agentCommissionAmount/companyCommissionAmount always match what was actually shown.
    const computed = computeDealCommission(draft);
    draft.commissionAmount = computed.commissionAmount;
    draft.agentCommissionAmount = computed.agentCommissionAmount;
    draft.companyCommissionAmount = computed.companyCommissionAmount;
    return draft;
  }
  async function crmSaveDeal(dealId, clientId) {
    const c = crmClientById(clientId);
    const form = crmReadDealForm();
    try {
      if (dealId) {
        // crmSaveDeal() only ever touches contract/commission/notes fields, never `status`
        // (that's crmCloseDeal()'s job, logged separately below) — nothing status-related
        // to log here.
        await db.collection('deals').doc(dealId).update(Object.assign({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, form));
        Object.assign(_crmDeals.find(x => x.id === dealId) || {}, form);
      } else {
        const listingSel = document.getElementById('crmDlListing');
        const listing = crmActiveListingOptions().find(l => l.firestoreId === listingSel.value);
        const payload = Object.assign({
          listingId: listingSel.value, clientId, agentId: c.assignedAgentId, status: 'negotiating',
          listingTitle: listing ? listing.title : '', clientName: c.name, documents: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, form);
        const ref = await db.collection('deals').add(payload);
        _crmDeals.push(Object.assign({ id: ref.id }, payload));
        crmLogActivity(clientId, 'deal_created', payload.listingTitle || '');
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
          listingTitle: listing ? listing.title : '', clientName: c.name, documents: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, form);
        const added = await db.collection('deals').add(payload);
        _crmDeals.push(Object.assign({ id: added.id }, payload));
        dealId = added.id;
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
      crmLogActivity(clientId, kind === 'sold' ? 'deal_closed_sold' : 'deal_closed_rented', '');
      showToast(kind === 'sold' ? 'Зарагдсан гэж хаагдлаа' : 'Түрээслэгдсэн гэж хаагдлаа', 'success');
      closeModal();
      crmRerenderCurrentView();
    } catch(e) {
      console.error('crmCloseDeal failed:', e.code, e.message);
      showToast('Алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ===== MONTHLY REPORT =====
  // One pure compute function, used identically by the Agent's own report, the Admin
  // aggregate report, and the Admin per-agent breakdown table — scope (which
  // clients/viewings/deals arrays get passed in) is the only thing that differs.
  function computeCrmMonthlyReport(clients, viewings, deals, year, month) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    const inMonth = (ms) => ms >= start && ms < end;
    const newClients = clients.filter(c => inMonth(crmMsFromTs(c.createdAt))).length;
    const followUpsDone = clients.filter(c => c.lastFollowUpDoneAt && inMonth(crmMsFromTs(c.lastFollowUpDoneAt))).length;
    const monthViewings = viewings.filter(v => inMonth(crmMsFromTs(v.scheduledAt))).length;
    const dealsOpened = deals.filter(d => inMonth(crmMsFromTs(d.createdAt))).length;
    const closedThisMonth = deals.filter(d => (d.status === 'sold' || d.status === 'rented') && d.contractDate && inMonth(crmMsFromTs(d.contractDate)));
    const sold = closedThisMonth.filter(d => d.status === 'sold').length;
    const rented = closedThisMonth.filter(d => d.status === 'rented').length;
    let totalDealValue = 0, totalCommission = 0, agentCommission = 0;
    closedThisMonth.forEach(d => {
      totalDealValue += d.finalPrice || d.offeredPrice || 0;
      const cm = computeDealCommission(d);
      totalCommission += cm.commissionAmount;
      agentCommission += cm.agentCommissionAmount;
    });
    return {
      newClients, followUpsDone, viewings: monthViewings, dealsOpened,
      contracts: closedThisMonth.length, sold, rented, totalDealValue, totalCommission, agentCommission,
      conversionRate: newClients > 0 ? Math.round((sold + rented) / newClients * 100) : 0
    };
  }
  // Keyed by the container element's own DOM id (not a fixed prefix) — the same monthly
  // report can be mounted in more than one place at once (the dashboard's #dashCrmMonthly
  // AND the CRM page's #crmContent when its "Сарын тайлан" tab is active both stay in the
  // DOM simultaneously, since showPage() only toggles a CSS class, never removes a
  // section) — a fixed id would collide between them and the wrong picker would respond.
  function crmMonthPickerHtml(containerId, year, month, onChangeCall) {
    return `<input class="form-input" type="month" id="${containerId}__month" value="${year}-${String(month + 1).padStart(2, '0')}" style="width:auto;" onchange="${onChangeCall}" />`;
  }
  function crmReadMonthPicker(containerId) {
    const val = document.getElementById(containerId + '__month')?.value;
    if (val) { const [y, m] = val.split('-').map(Number); return { year: y, month: m - 1 }; }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  function crmMonthlyKpiGrid(r) {
    return `
      <div class="admin-kpi-grid">
        ${adminKpiCard('Шинэ clients', { ok: true, value: r.newClients })}
        ${adminKpiCard('Follow-up хийсэн', { ok: true, value: r.followUpsDone })}
        ${adminKpiCard('Үзлэг', { ok: true, value: r.viewings })}
        ${adminKpiCard('Хэлэлцээр', { ok: true, value: r.dealsOpened })}
        ${adminKpiCard('Гэрээ', { ok: true, value: r.contracts })}
        ${adminKpiCard('Зарагдсан', { ok: true, value: r.sold })}
        ${adminKpiCard('Түрээслэгдсэн', { ok: true, value: r.rented })}
        ${adminKpiCard('Нийт deal үнэ', { ok: true, value: fmt(Math.round(r.totalDealValue)) + '₮' })}
        ${adminKpiCard('Нийт commission', { ok: true, value: fmt(Math.round(r.totalCommission)) + '₮' })}
        ${adminKpiCard('Agent commission', { ok: true, value: fmt(Math.round(r.agentCommission)) + '₮' })}
        ${adminKpiCard('Conversion rate', { ok: true, value: r.conversionRate + '%' })}
      </div>
    `;
  }
  function renderCrmMonthlyReport(el, scopeUid) {
    if (!el) return;
    const { year, month } = crmReadMonthPicker(el.id);
    _crmLastReportYear = year; _crmLastReportMonth = month;
    const clients = _crmClients.filter(c => c.assignedAgentId === scopeUid);
    const viewings = _crmViewings.filter(v => v.agentId === scopeUid);
    const deals = _crmDeals.filter(d => d.agentId === scopeUid);
    const r = computeCrmMonthlyReport(clients, viewings, deals, year, month);
    el.innerHTML = `
      <div style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        ${crmMonthPickerHtml(el.id, year, month, `renderCrmMonthlyReport(document.getElementById('${el.id}'), '${scopeUid}')`)}
        <button class="btn btn-ghost" style="border:1.5px solid var(--line-2);" onclick="crmExportReportExcel('${scopeUid}')">Excel export</button>
        <button class="btn btn-ghost" style="border:1.5px solid var(--line-2);" onclick="crmExportReportPdf('${scopeUid}')">PDF export</button>
      </div>
      ${crmMonthlyKpiGrid(r)}
    `;
  }
  function renderCrmAdminMonthlyReport(el) {
    if (!el) return;
    const { year, month } = crmReadMonthPicker(el.id);
    _crmLastReportYear = year; _crmLastReportMonth = month;
    const agents = (typeof _adminUsersCache !== 'undefined' && _adminUsersCache) ? _adminUsersCache.filter(u => (u.role || 'user') === 'user') : [];
    const overall = computeCrmMonthlyReport(_crmClients, _crmViewings, _crmDeals, year, month);
    el.innerHTML = `
      <div style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        ${crmMonthPickerHtml(el.id, year, month, `renderCrmAdminMonthlyReport(document.getElementById('${el.id}'))`)}
        <button class="btn btn-ghost" style="border:1.5px solid var(--line-2);" onclick="crmExportReportExcel(null)">Excel export</button>
        <button class="btn btn-ghost" style="border:1.5px solid var(--line-2);" onclick="crmExportReportPdf(null)">PDF export</button>
      </div>
      ${crmMonthlyKpiGrid(overall)}
      <div class="step-section-title" style="margin:20px 0 10px;">Agent бүрийн сарын тайлан</div>
      <div class="admin-list-table">
        ${agents.map(u => {
          const r = computeCrmMonthlyReport(
            _crmClients.filter(c => c.assignedAgentId === u.uid),
            _crmViewings.filter(v => v.agentId === u.uid),
            _crmDeals.filter(d => d.agentId === u.uid),
            year, month
          );
          return `
            <div class="admin-row">
              <div class="admin-user-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc((u.firstName || '?')[0].toUpperCase())}</div>
              <div class="admin-row-body">
                <div class="admin-row-title">${esc(((u.lastName || '') + ' ' + (u.firstName || '')).trim())}</div>
                <div class="admin-row-meta">Clients: ${r.newClients} · Viewings: ${r.viewings} · Deals: ${r.dealsOpened} · Sold: ${r.sold} · Rented: ${r.rented}</div>
                <div class="admin-row-meta">Deal үнэ: ${fmt(Math.round(r.totalDealValue))}₮ · Commission: ${fmt(Math.round(r.totalCommission))}₮ · Agent-д: ${fmt(Math.round(r.agentCommission))}₮ · Conversion: ${r.conversionRate}%</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ===== EXPORT (Excel via SheetJS, PDF via jsPDF+autotable — both loaded via CDN in
  // index.html, same pattern as the existing Leaflet include) =====
  // scopeUid: an agent's own uid (their export can only ever contain their own rows), or
  // null for admin/owner (aggregate + a "By Agent" sheet/table, reusing the exact same
  // per-agent loop the on-screen "Agent бүрийн сарын тайлан" table already uses).
  function crmExportScopedData(scopeUid) {
    const year = _crmLastReportYear != null ? _crmLastReportYear : new Date().getFullYear();
    const month = _crmLastReportMonth != null ? _crmLastReportMonth : new Date().getMonth();
    const clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients;
    const viewings = scopeUid ? _crmViewings.filter(v => v.agentId === scopeUid) : _crmViewings;
    const deals = scopeUid ? _crmDeals.filter(d => d.agentId === scopeUid) : _crmDeals;
    const report = computeCrmMonthlyReport(clients, viewings, deals, year, month);
    const leadSources = computeLeadSourceStats(clients, deals);
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 0);
    const rangeLabel = rangeStart.toLocaleDateString('mn-MN') + ' — ' + rangeEnd.toLocaleDateString('mn-MN');
    let byAgent = null;
    if (!scopeUid && typeof _adminUsersCache !== 'undefined' && _adminUsersCache) {
      byAgent = _adminUsersCache.filter(u => (u.role || 'user') === 'user').map(u => {
        const r = computeCrmMonthlyReport(
          _crmClients.filter(c => c.assignedAgentId === u.uid),
          _crmViewings.filter(v => v.agentId === u.uid),
          _crmDeals.filter(d => d.agentId === u.uid),
          year, month
        );
        return Object.assign({ agentName: ((u.lastName || '') + ' ' + (u.firstName || '')).trim() }, r);
      });
    }
    return { year, month, rangeLabel, clients, viewings, deals, report, leadSources, byAgent };
  }
  function crmExportReportExcel(scopeUid) {
    if (typeof XLSX === 'undefined') { showToast('Excel сан ачаалагдаагүй байна'); return; }
    scopeUid = scopeUid === 'null' ? null : scopeUid;
    const data = crmExportScopedData(scopeUid);
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['Тайлангийн хугацаа', data.rangeLabel],
      [],
      ['Шинэ clients', data.report.newClients],
      ['Follow-up хийсэн', data.report.followUpsDone],
      ['Үзлэг', data.report.viewings],
      ['Хэлэлцээр', data.report.dealsOpened],
      ['Гэрээ', data.report.contracts],
      ['Зарагдсан', data.report.sold],
      ['Түрээслэгдсэн', data.report.rented],
      ['Нийт deal үнэ (₮)', Math.round(data.report.totalDealValue)],
      ['Нийт commission (₮)', Math.round(data.report.totalCommission)],
      ['Agent commission (₮)', Math.round(data.report.agentCommission)],
      ['Company commission (₮)', Math.round(data.report.totalCommission - data.report.agentCommission)],
      ['Conversion rate (%)', data.report.conversionRate],
      [],
      ['Lead source', 'Leads', 'Deals', 'Conversion (%)'],
      ...data.leadSources.map(s => [s.label, s.leads, s.deals, s.conversionRate])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.clients.map(c => ({
      Нэр: c.name, Утас: c.phone, Имэйл: c.email, Stage: CRM_STAGE_LABEL[c.stage] || c.stage,
      'Lead source': CRM_LEAD_SOURCE_LABEL[c.leadSource] || '', Төсөв: c.budget || 0
    }))), 'Clients');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.viewings.map(v => ({
      Client: v.clientName, Listing: v.listingTitle, Огноо: v.scheduledAt ? new Date(crmMsFromTs(v.scheduledAt)).toLocaleString('mn-MN') : '', Status: CRM_VIEWING_STATUS_LABEL[v.status] || v.status
    }))), 'Viewings');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.deals.map(d => {
      const cm = computeDealCommission(d);
      return {
        Listing: d.listingTitle, Client: d.clientName, Status: CRM_DEAL_STATUS_LABEL[d.status] || d.status,
        'Санал (₮)': d.offeredPrice || 0, 'Эцсийн (₮)': d.finalPrice || 0,
        'Commission (₮)': Math.round(cm.commissionAmount), 'Agent commission (₮)': Math.round(cm.agentCommissionAmount),
        'Company commission (₮)': Math.round(cm.companyCommissionAmount)
      };
    })), 'Deals');

    if (data.byAgent) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byAgent.map(r => ({
        Agent: r.agentName, Clients: r.newClients, Viewings: r.viewings, Deals: r.dealsOpened,
        Sold: r.sold, Rented: r.rented, 'Deal үнэ (₮)': Math.round(r.totalDealValue),
        'Commission (₮)': Math.round(r.totalCommission), 'Agent commission (₮)': Math.round(r.agentCommission),
        'Conversion (%)': r.conversionRate
      }))), 'By Agent');
    }

    XLSX.writeFile(wb, `tp-property-crm-report-${data.year}-${String(data.month + 1).padStart(2, '0')}.xlsx`);
  }
  function crmExportReportPdf(scopeUid) {
    if (typeof window.jspdf === 'undefined') { showToast('PDF сан ачаалагдаагүй байна'); return; }
    scopeUid = scopeUid === 'null' ? null : scopeUid;
    const data = crmExportScopedData(scopeUid);
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(14);
    doc.text('TP Property CRM — Monthly Report', 14, 16);
    doc.setFontSize(10);
    doc.text(data.rangeLabel, 14, 23);

    doc.autoTable({
      startY: 28,
      head: [['Metric', 'Value']],
      body: [
        ['Шинэ clients', data.report.newClients],
        ['Follow-up хийсэн', data.report.followUpsDone],
        ['Үзлэг', data.report.viewings],
        ['Хэлэлцээр', data.report.dealsOpened],
        ['Гэрээ', data.report.contracts],
        ['Зарагдсан', data.report.sold],
        ['Түрээслэгдсэн', data.report.rented],
        ['Нийт deal үнэ (₮)', fmt(Math.round(data.report.totalDealValue))],
        ['Нийт commission (₮)', fmt(Math.round(data.report.totalCommission))],
        ['Agent commission (₮)', fmt(Math.round(data.report.agentCommission))],
        ['Company commission (₮)', fmt(Math.round(data.report.totalCommission - data.report.agentCommission))],
        ['Conversion rate (%)', data.report.conversionRate]
      ]
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Lead source', 'Leads', 'Deals', 'Conversion %']],
      body: data.leadSources.map(s => [s.label, s.leads, s.deals, s.conversionRate])
    });

    const dealRows = data.deals.map(d => {
      const cm = computeDealCommission(d);
      return [d.listingTitle || '', d.clientName || '', CRM_DEAL_STATUS_LABEL[d.status] || d.status, fmt(d.finalPrice || d.offeredPrice || 0), fmt(Math.round(cm.commissionAmount))];
    });
    if (dealRows.length) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [['Listing', 'Client', 'Status', 'Үнэ', 'Commission']], body: dealRows });
    }

    if (data.byAgent) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Agent', 'Clients', 'Viewings', 'Deals', 'Sold', 'Rented', 'Commission', 'Agent commission', 'Conversion %']],
        body: data.byAgent.map(r => [r.agentName, r.newClients, r.viewings, r.dealsOpened, r.sold, r.rented, fmt(Math.round(r.totalCommission)), fmt(Math.round(r.agentCommission)), r.conversionRate])
      });
    }

    doc.save(`tp-property-crm-report-${data.year}-${String(data.month + 1).padStart(2, '0')}.pdf`);
  }

  // ===== QUICK ALERTS =====
  function computeCrmAlerts(clients, viewings, deals) {
    // Day-granularity everywhere (crmDateBucket), matching the Reminder board and Viewings
    // list exactly — a follow-up/viewing due later *today* must never show as "overdue" here
    // while the same item shows as "Өнөөдөр" there; a raw `< Date.now()` comparison would
    // flip something due today to "overdue" the moment any time at all has passed since it
    // was due, which is both wrong and inconsistent with the rest of the CRM.
    const staleMs = Date.now() - CRM_NEGOTIATION_STALE_DAYS * 86400000;
    return {
      overdueFollowUps: clients.filter(c => c.nextFollowUpAt && crmDateBucket(crmMsFromTs(c.nextFollowUpAt)) === 'overdue' && !CRM_CLOSED_STAGES.includes(c.stage)),
      overdueViewings: viewings.filter(v => v.status === 'scheduled' && crmDateBucket(crmMsFromTs(v.scheduledAt)) === 'overdue'),
      staleNegotiations: clients.filter(c => c.stage === 'negotiation' && crmMsFromTs(c.updatedAt || c.createdAt) < staleMs),
      overdueContracts: deals.filter(d => d.status === 'negotiating' && d.contractDate && crmDateBucket(crmMsFromTs(d.contractDate)) === 'overdue')
    };
  }
  function renderCrmAlerts(el, scopeUid) {
    if (!el) return;
    const clients = scopeUid ? _crmClients.filter(c => c.assignedAgentId === scopeUid) : _crmClients;
    const viewings = scopeUid ? _crmViewings.filter(v => v.agentId === scopeUid) : _crmViewings;
    const deals = scopeUid ? _crmDeals.filter(d => d.agentId === scopeUid) : _crmDeals;
    const a = computeCrmAlerts(clients, viewings, deals);
    const rows = [
      { label: 'Хугацаа хэтэрсэн follow-up', count: a.overdueFollowUps.length, onclick: `renderAgentCrmPage('reminder')` },
      { label: 'Хугацаа хэтэрсэн үзлэг', count: a.overdueViewings.length, onclick: `renderAgentCrmPage('viewings')` },
      { label: `Хэлэлцээр дээр ${CRM_NEGOTIATION_STALE_DAYS}+ хоног удаж байгаа`, count: a.staleNegotiations.length, onclick: `renderAgentCrmPage('pipeline')` },
      { label: 'Гэрээний огноо өнгөрсөн ч хаагдаагүй deal', count: a.overdueContracts.length, onclick: `renderAgentCrmPage('deals')` }
    ];
    const total = rows.reduce((s, r) => s + r.count, 0);
    if (total === 0) { el.innerHTML = `<div class="crm-empty-row">Анхаарах зүйл алга</div>`; return; }
    el.innerHTML = rows.filter(r => r.count > 0).map(r => `
      <div class="crm-alert-card" onclick="${scopeUid ? r.onclick : `renderAdminDashboard('crm'); setTimeout(()=>${r.onclick.replace('renderAgentCrmPage', 'renderAdminCrmSection')}, 50);`}">
        <span>${esc(r.label)}</span>
        <span class="crm-count-badge danger">${r.count}</span>
      </div>
    `).join('');
  }

  // ===== PAGE MOUNTS =====
  // Agent's own CRM page (#agent-crm, index.html) — always scoped to currentUser.uid.
  async function renderAgentCrmPage(tab) {
    if (!currentUser) return;
    const el = document.getElementById('crmContent');
    if (!el) return;
    if (tab) _crmTab = tab;
    ['pipeline', 'clients', 'viewings', 'deals', 'reminder', 'today', 'monthly', 'leadsource'].forEach(t => {
      const btn = document.getElementById('crmTab-' + t);
      if (btn) btn.classList.toggle('active', t === _crmTab);
    });
    if (_crmScopeUid !== currentUser.uid) {
      el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
      await crmLoadAll(currentUser.uid);
    }
    const alertsEl = document.getElementById('crmAgentAlerts');
    if (alertsEl) renderCrmAlerts(alertsEl, currentUser.uid);
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
      <div id="crmAdminAlerts" style="margin-bottom:16px;"></div>
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
      <div class="admin-tabs">
        <button class="mytab ${_crmTab === 'pipeline' ? 'active' : ''}" onclick="renderAdminCrmSection('pipeline')">Pipeline</button>
        <button class="mytab ${_crmTab === 'clients' ? 'active' : ''}" onclick="renderAdminCrmSection('clients')">Харилцагчид</button>
        <button class="mytab ${_crmTab === 'viewings' ? 'active' : ''}" onclick="renderAdminCrmSection('viewings')">Үзлэгүүд</button>
        <button class="mytab ${_crmTab === 'deals' ? 'active' : ''}" onclick="renderAdminCrmSection('deals')">Хэлэлцээр/Гэрээ</button>
        <button class="mytab ${_crmTab === 'reminder' ? 'active' : ''}" onclick="renderAdminCrmSection('reminder')">Reminder</button>
        <button class="mytab ${_crmTab === 'today' ? 'active' : ''}" onclick="renderAdminCrmSection('today')">Өнөөдрийн ажил</button>
        <button class="mytab ${_crmTab === 'monthly' ? 'active' : ''}" onclick="renderAdminCrmSection('monthly')">Сарын тайлан</button>
        <button class="mytab ${_crmTab === 'leadsource' ? 'active' : ''}" onclick="renderAdminCrmSection('leadsource')">Lead Source</button>
        <button class="mytab ${_crmTab === 'byagent' ? 'active' : ''}" onclick="renderAdminCrmSection('byagent')">Agent-аар</button>
      </div>
      <div id="crmAdminBody"></div>
    `;
    renderCrmAlerts(document.getElementById('crmAdminAlerts'), null);
    crmRenderTab(document.getElementById('crmAdminBody'), null);
  }
  function crmRenderTab(el, scopeUid) {
    if (!el) return;
    if (_crmTab === 'pipeline') renderCrmKanban(el, scopeUid);
    else if (_crmTab === 'clients') renderCrmClientsList(el, scopeUid);
    else if (_crmTab === 'viewings') renderCrmViewingsList(el, scopeUid);
    else if (_crmTab === 'deals') renderCrmDealsList(el, scopeUid);
    else if (_crmTab === 'reminder') renderCrmFollowUpWidgets(el, scopeUid);
    else if (_crmTab === 'today') renderCrmTodayTasks(el, scopeUid);
    else if (_crmTab === 'monthly') { if (scopeUid) renderCrmMonthlyReport(el, scopeUid); else renderCrmAdminMonthlyReport(el); }
    else if (_crmTab === 'leadsource') renderCrmLeadSourceReport(el, scopeUid);
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
