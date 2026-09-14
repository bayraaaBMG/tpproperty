  // ===== CMS — Хуудас удирдлага (Page Management) =====
  // A lightweight, structured, safe CMS layered on top of the existing site. It controls
  // CONTENT (text/media), VISIBILITY and ORDER of a small set of marketing sections plus a
  // shared organization profile — never business logic. Property search, listing cards,
  // favorites, compare and auth stay as native app components; the CMS never touches them.
  //
  // Data model (see firestore.rules):
  //   siteSettings/organization          — one shared org profile (public read, admin write)
  //   sitePages/{pageId}                 — admin working copy: { draft, versions[], meta } (admin only)
  //   sitePagesPublic/{pageId}           — published snapshot the public site reads (public read, admin write)
  //
  // A page's content is an ordered array of structured blocks:
  //   { id, type, order, visible, content: {...} }
  // No block ever carries raw HTML/script — every field is a plain string or validated URL,
  // escaped at render time (esc / cmsSafeUrl). This is deliberate: the project had real
  // stored-XSS incidents, so the CMS accepts structured fields only.

  // ---- Managed pages (only ones that actually exist in TP Property) ----
  const CMS_PAGES = [
    { id: 'home', title: 'Нүүр хуудас', editable: true },
    { id: 'about', title: 'Бидний тухай', editable: false },
    { id: 'services', title: 'Үйлчилгээ', editable: false },
    { id: 'newdev', title: 'Шинэ орон сууц', editable: false },
    { id: 'contact', title: 'Холбоо барих', editable: false }
  ];

  // ---- Block-type catalogue (labels + which fields each type exposes) ----
  // `system: true`  -> content editable, but the block itself can't be hidden or removed
  //                    (its underlying feature must always render).
  // `togglable: true` -> supports show/hide + up/down ordering.
  const CMS_BLOCK_TYPES = {
    hero:      { label: 'Гарчиг (Hero)', system: true, fields: ['title', 'subtitle'] },
    banks:     { label: 'Хамтрагч банк, санхүү', togglable: true, fields: [] },
    features:  { label: 'Онцлох давуу тал', togglable: true, fields: [] }
  };

  // ---- Default (fallback) content — the CURRENT hardcoded site copy ----
  // If no CMS document exists yet, this is exactly what the site already shows, so nothing
  // ever disappears after deploy. Seeding writes this into Firestore as the initial draft.
  function cmsDefaultHomeSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Зөв байр, зөв боломжийг TP Property-ээс хай',
          subtitle: 'Орон сууц, түрээс, газар, оффисын зарыг нэг дороос.' } },
      { id: 'banks', type: 'banks', order: 2, visible: true, content: {} },
      { id: 'features', type: 'features', order: 3, visible: true, content: {} }
    ];
  }
  function cmsDefaultOrganization() {
    return {
      name: 'TP Property',
      description: 'Үл хөдлөх хөрөнгийн худалдаа, түрээс, зуучлалын мэргэжлийн үйлчилгээ.',
      phone: '',
      email: '',
      address: '',
      workingHours: '',
      facebook: 'https://www.facebook.com/TPprivatepropertyLLC',
      instagram: '',
      logoUrl: ''
    };
  }

  // ---- Safe-URL validator (shared with the pattern used in new-developments.js) ----
  // http(s) only. Rejects javascript:, data:, and anything malformed — returns '' so a
  // bad value renders as no-link rather than an injection vector.
  function cmsSafeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(String(url).trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      return u.href;
    } catch (e) { return ''; }
  }

  // ===================================================================================
  //  PUBLIC SIDE — read the published snapshot and apply it to the live page
  // ===================================================================================

  let _cmsPublicCache = {};        // pageId -> sections[]   (published)
  let _cmsOrgCache = null;         // organization profile   (published)
  let _cmsPreviewOverride = null;  // { pageId, sections }    (admin preview only, in-memory)

  // Read a published page's sections. Falls back to the hardcoded defaults on any miss
  // (no doc, permission error, offline) so the site never renders blank.
  async function cmsLoadPublishedPage(pageId) {
    if (_cmsPreviewOverride && _cmsPreviewOverride.pageId === pageId) return _cmsPreviewOverride.sections;
    if (_cmsPublicCache[pageId]) return _cmsPublicCache[pageId];
    let sections = pageId === 'home' ? cmsDefaultHomeSections() : [];
    try {
      const snap = await db.collection('sitePagesPublic').doc(pageId).get();
      if (snap.exists && Array.isArray(snap.data().sections) && snap.data().sections.length) {
        sections = snap.data().sections;
      }
    } catch (e) {
      // permission-denied here means the CMS rules aren't deployed yet — expected during
      // the code-deploy -> rules-deploy gap. Fall back silently; log anything else.
      if (e.code !== 'permission-denied') console.error('cmsLoadPublishedPage failed:', e.code, e.message);
    }
    _cmsPublicCache[pageId] = sections;
    return sections;
  }

  async function cmsLoadOrganization() {
    if (_cmsOrgCache) return _cmsOrgCache;
    let org = cmsDefaultOrganization();
    try {
      const snap = await db.collection('siteSettings').doc('organization').get();
      if (snap.exists) org = Object.assign(org, snap.data());
    } catch (e) {
      if (e.code !== 'permission-denied') console.error('cmsLoadOrganization failed:', e.code, e.message);
    }
    _cmsOrgCache = org;
    return org;
  }

  // Apply a home page's sections to the DOM: hero text, plus visibility + order of the
  // togglable marketing sections (#banks, #features). Every value is set with textContent
  // (never innerHTML), so admin copy can never inject markup. Missing nodes are skipped.
  function cmsApplyHomeSections(sections) {
    const bySection = {};
    (sections || []).forEach(s => { bySection[s.id] = s; });

    // hero text
    const hero = bySection.hero;
    if (hero && hero.content) {
      const titleEl = document.querySelector('.hero-compact-title');
      const subEl = document.querySelector('.hero-compact-sub');
      // The title carries a <em>TP Property</em> emphasis. To keep that styling without
      // allowing markup, we split on the fixed brand token and rebuild with real elements.
      if (titleEl && typeof hero.content.title === 'string') cmsRenderBrandTitle(titleEl, hero.content.title);
      if (subEl && typeof hero.content.subtitle === 'string') subEl.textContent = hero.content.subtitle;
    }

    // togglable sections: visibility + order (reorder the real <section> nodes among
    // themselves, leaving the functional sections between them untouched)
    const togglable = (sections || []).filter(s => CMS_BLOCK_TYPES[s.type] && CMS_BLOCK_TYPES[s.type].togglable)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const nodeMap = { banks: document.getElementById('banks'), features: document.getElementById('features') };
    togglable.forEach(s => {
      const node = nodeMap[s.id];
      if (node) node.hidden = (s.visible === false);
    });
    // apply relative order: if banks should come after features, move it
    const ordered = togglable.map(s => nodeMap[s.id]).filter(Boolean);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i - 1].compareDocumentPosition(ordered[i]) & Node.DOCUMENT_POSITION_PRECEDING) {
        // ordered[i] currently precedes ordered[i-1] in the DOM -> move it after
        ordered[i - 1].parentNode.insertBefore(ordered[i], ordered[i - 1].nextSibling);
      }
    }
  }

  // Rebuild a hero title with the brand word wrapped in <em>, from plain text, using DOM
  // nodes only (no innerHTML). If the brand token isn't present the whole string is shown
  // as plain text — still safe.
  function cmsRenderBrandTitle(el, text) {
    const BRAND = 'TP Property';
    el.textContent = '';
    const idx = text.indexOf(BRAND);
    if (idx === -1) { el.textContent = text; return; }
    el.appendChild(document.createTextNode(text.slice(0, idx)));
    const em = document.createElement('em');
    em.textContent = BRAND;
    el.appendChild(em);
    el.appendChild(document.createTextNode(text.slice(idx + BRAND.length)));
  }

  // Apply the organization profile to the footer (description + social links). Only ever
  // overrides text/hrefs that already exist — never restructures the footer. Safe URLs only.
  function cmsApplyOrganization(org) {
    if (!org) return;
    const desc = document.querySelector('.footer-desc');
    if (desc && org.description) desc.textContent = org.description;
    const fb = document.querySelector('.footer a[aria-label="Facebook"]');
    if (fb) { const u = cmsSafeUrl(org.facebook); if (u) fb.setAttribute('href', u); }
  }

  // Public entry point — called once after initial load, and whenever a preview is applied.
  async function applySiteCms() {
    try {
      const [homeSections, org] = await Promise.all([cmsLoadPublishedPage('home'), cmsLoadOrganization()]);
      cmsApplyHomeSections(homeSections);
      cmsApplyOrganization(org);
    } catch (e) {
      console.error('applySiteCms failed:', e.code, e.message);
    }
  }

  // ===================================================================================
  //  ADMIN SIDE — the "Хуудас удирдлага" module
  // ===================================================================================

  let _cmsAdminPage = null;     // pageId currently being edited
  let _cmsDraft = null;         // working draft sections for the open page
  let _cmsOrgDraft = null;      // working org profile

  function cmsRequireEditor() {
    if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) return true;
    showToast('Танд энэ хэсгийг засах эрх байхгүй');
    return false;
  }

  async function renderAdminCmsSection() {
    const el = adminSectionEl();
    if (!el) return;
    if (!cmsRequireEditor()) { el.innerHTML = adminErrorState('Хандах эрхгүй.', ''); return; }
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;

    // load org + page metadata (draft docs) in parallel
    let org = cmsDefaultOrganization();
    const pageMeta = {};
    try {
      const [orgSnap, ...pageSnaps] = await Promise.all([
        db.collection('siteSettings').doc('organization').get(),
        ...CMS_PAGES.map(p => db.collection('sitePages').doc(p.id).get())
      ]);
      if (orgSnap.exists) org = Object.assign(org, orgSnap.data());
      pageSnaps.forEach((snap, i) => { pageMeta[CMS_PAGES[i].id] = snap.exists ? snap.data() : null; });
    } catch (e) {
      el.innerHTML = adminErrorState('CMS мэдээлэл татахад алдаа гарлаа.', 'renderAdminCmsSection()');
      return;
    }
    _cmsOrgDraft = Object.assign(cmsDefaultOrganization(), org);

    el.innerHTML = `
      <div class="cms-wrap">
        <div class="admin-panel" style="margin-bottom:16px;">
          <div class="admin-panel-head">Байгууллагын мэдээлэл</div>
          <div id="cmsOrgEditor">${cmsOrgEditorHtml(_cmsOrgDraft)}</div>
        </div>

        <div class="admin-panel">
          <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <span>Вэбсайтын хуудсууд</span>
            ${pageMeta['home'] ? '' : `<button class="btn btn-ghost btn-sm" onclick="cmsSeedFromCurrentContent()">Анхны агуулга үүсгэх</button>`}
          </div>
          <div class="admin-list-table" id="cmsPageList">
            ${CMS_PAGES.map(pg => cmsPageRowHtml(pg, pageMeta[pg.id])).join('')}
          </div>
        </div>

        <div id="cmsEditorWrap"></div>
      </div>
    `;
  }

  function cmsStatusPill(meta) {
    const published = meta && meta.status === 'published';
    return `<span class="admin-status-pill status-${published ? 'active' : 'pending'}">${published ? 'Нийтэлсэн' : 'Ноорог'}</span>`;
  }

  function cmsPageRowHtml(pg, meta) {
    const updated = meta && meta.updatedAt?.toDate ? meta.updatedAt.toDate().toLocaleDateString() : '—';
    const actions = pg.editable
      ? `<button class="btn btn-blue btn-sm" onclick="cmsOpenPageEditor('${pg.id}')">Засах</button>
         <button class="btn btn-ghost btn-sm" onclick="cmsPreviewPage('${pg.id}')">Урьдчилан харах</button>`
      : `<span style="font-size:12px;color:var(--ink-3);">Удахгүй</span>`;
    return `
      <div class="admin-row">
        <div class="admin-row-body">
          <div class="admin-row-title">${esc(pg.title)} ${cmsStatusPill(meta)}</div>
          <div class="admin-row-meta">Сүүлд шинэчилсэн: ${esc(updated)}</div>
        </div>
        <div class="admin-row-actions">${actions}</div>
      </div>
    `;
  }

  // ---- Organization editor ----
  function cmsOrgField(label, key, val, type) {
    const t = type || 'text';
    return `
      <div class="cms-field">
        <label class="cms-label">${esc(label)}</label>
        <input class="form-input" type="${t}" id="cmsOrg-${key}" value="${esc(val || '')}" />
      </div>`;
  }
  function cmsOrgEditorHtml(org) {
    return `
      <div class="cms-grid">
        ${cmsOrgField('Нэр', 'name', org.name)}
        ${cmsOrgField('Утас', 'phone', org.phone)}
        ${cmsOrgField('И-мэйл', 'email', org.email, 'email')}
        ${cmsOrgField('Хаяг', 'address', org.address)}
        ${cmsOrgField('Ажлын цаг', 'workingHours', org.workingHours)}
        ${cmsOrgField('Facebook', 'facebook', org.facebook, 'url')}
        ${cmsOrgField('Instagram', 'instagram', org.instagram, 'url')}
      </div>
      <div class="cms-field" style="margin-top:10px;">
        <label class="cms-label">Тайлбар</label>
        <textarea class="form-input" id="cmsOrg-description" rows="2">${esc(org.description || '')}</textarea>
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-blue" onclick="cmsSaveOrganization()">Хадгалах</button>
      </div>`;
  }

  function cmsReadOrgForm() {
    const g = k => (document.getElementById('cmsOrg-' + k) || {}).value || '';
    return {
      name: g('name').trim(), phone: g('phone').trim(), email: g('email').trim(),
      address: g('address').trim(), workingHours: g('workingHours').trim(),
      facebook: cmsSafeUrl(g('facebook')), instagram: cmsSafeUrl(g('instagram')),
      description: g('description').trim(),
      logoUrl: (_cmsOrgDraft && _cmsOrgDraft.logoUrl) || ''
    };
  }

  async function cmsSaveOrganization() {
    if (!cmsRequireEditor()) return;
    // reject any social link that isn't a clean http(s) URL (empty is fine)
    const fbRaw = (document.getElementById('cmsOrg-facebook') || {}).value || '';
    const igRaw = (document.getElementById('cmsOrg-instagram') || {}).value || '';
    if (fbRaw.trim() && !cmsSafeUrl(fbRaw)) { showToast('Facebook холбоос буруу байна (http/https)'); return; }
    if (igRaw.trim() && !cmsSafeUrl(igRaw)) { showToast('Instagram холбоос буруу байна (http/https)'); return; }
    const org = cmsReadOrgForm();
    try {
      await db.collection('siteSettings').doc('organization').set(Object.assign(org, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      }), { merge: true });
      _cmsOrgDraft = org; _cmsOrgCache = null; // force public re-read next time
      logAdminAction('cms_org_edit', 'siteSettings', 'organization', '');
      showToast('Байгууллагын мэдээлэл хадгалагдлаа', 'success');
    } catch (e) {
      console.error('cmsSaveOrganization failed:', e.code, e.message);
      showToast('Хадгалахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ---- Page editor (draft → preview → publish) ----
  async function cmsOpenPageEditor(pageId) {
    if (!cmsRequireEditor()) return;
    const pg = CMS_PAGES.find(p => p.id === pageId);
    if (!pg || !pg.editable) return;
    _cmsAdminPage = pageId;
    let draft = pageId === 'home' ? cmsDefaultHomeSections() : [];
    try {
      const snap = await db.collection('sitePages').doc(pageId).get();
      if (snap.exists && snap.data().draft && Array.isArray(snap.data().draft.sections)) {
        draft = snap.data().draft.sections;
      }
    } catch (e) {
      console.error('cmsOpenPageEditor load failed:', e.code, e.message);
    }
    _cmsDraft = draft.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    cmsRenderEditor();
    const wrap = document.getElementById('cmsEditorWrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cmsRenderEditor() {
    const wrap = document.getElementById('cmsEditorWrap');
    if (!wrap || !_cmsDraft) return;
    const pg = CMS_PAGES.find(p => p.id === _cmsAdminPage);
    wrap.innerHTML = `
      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>${esc(pg ? pg.title : '')} — хэсгүүд</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" onclick="cmsPreviewCurrentDraft()">Урьдчилан харах</button>
            <button class="btn btn-ghost btn-sm" onclick="cmsSaveDraft()">Ноорог хадгалах</button>
            <button class="btn btn-blue btn-sm" onclick="cmsPublish()">Нийтлэх</button>
          </div>
        </div>
        <div id="cmsBlocks">${_cmsDraft.map((b, i) => cmsBlockHtml(b, i)).join('')}</div>
      </div>`;
  }

  function cmsBlockHtml(block, i) {
    const meta = CMS_BLOCK_TYPES[block.type] || { label: block.type, fields: [] };
    const canHide = !meta.system && meta.togglable;
    const fields = (meta.fields || []).map(f => cmsBlockField(block, f)).join('');
    return `
      <div class="cms-block ${block.visible === false ? 'cms-block-hidden' : ''}">
        <div class="cms-block-head">
          <div class="cms-block-title">${esc(meta.label)}${block.visible === false ? ' <span style="font-size:11px;color:var(--ink-3);">(нуусан)</span>' : ''}</div>
          <div class="cms-block-controls">
            <button class="cms-ctrl" title="Дээш" onclick="cmsMoveBlock(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="cms-ctrl" title="Доош" onclick="cmsMoveBlock(${i}, 1)" ${i === _cmsDraft.length - 1 ? 'disabled' : ''}>↓</button>
            ${canHide ? `<button class="cms-ctrl" title="${block.visible === false ? 'Харагдуулах' : 'Нуух'}" onclick="cmsToggleBlock(${i})">${block.visible === false ? '🚫' : '👁'}</button>` : ''}
          </div>
        </div>
        ${fields ? `<div class="cms-block-body">${fields}</div>` : `<div class="cms-block-body"><span style="font-size:12px;color:var(--ink-3);">Энэ хэсэг зөвхөн харагдац/эрэмбээр удирдагдана.</span></div>`}
      </div>`;
  }

  function cmsBlockField(block, field) {
    const labels = { title: 'Гарчиг', subtitle: 'Дэд гарчиг', body: 'Текст', buttonText: 'Товчны нэр', buttonUrl: 'Товчны холбоос' };
    const val = (block.content && block.content[field]) || '';
    const isLong = field === 'body' || field === 'subtitle';
    const id = `cmsField-${block.id}-${field}`;
    return `
      <div class="cms-field">
        <label class="cms-label">${esc(labels[field] || field)}</label>
        ${isLong
          ? `<textarea class="form-input" id="${id}" rows="2" oninput="cmsUpdateField('${block.id}','${field}', this.value)">${esc(val)}</textarea>`
          : `<input class="form-input" type="text" id="${id}" value="${esc(val)}" oninput="cmsUpdateField('${block.id}','${field}', this.value)" />`}
      </div>`;
  }

  function cmsUpdateField(blockId, field, value) {
    const b = _cmsDraft.find(x => x.id === blockId);
    if (!b) return;
    b.content = b.content || {};
    b.content[field] = value;
  }

  function cmsMoveBlock(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= _cmsDraft.length) return;
    const tmp = _cmsDraft[i]; _cmsDraft[i] = _cmsDraft[j]; _cmsDraft[j] = tmp;
    _cmsDraft.forEach((b, idx) => { b.order = idx + 1; });
    cmsRenderEditor();
  }

  function cmsToggleBlock(i) {
    const b = _cmsDraft[i];
    const meta = CMS_BLOCK_TYPES[b.type] || {};
    if (meta.system || !meta.togglable) return;
    b.visible = b.visible === false;
    cmsRenderEditor();
  }

  // Normalise the draft before any write: re-index order, coerce visible to boolean, and
  // strip every field down to a plain trimmed string (defence in depth against markup).
  function cmsNormaliseDraft(sections) {
    return sections.map((b, idx) => ({
      id: String(b.id),
      type: String(b.type),
      order: idx + 1,
      visible: b.visible !== false,
      content: cmsCleanContent(b.content)
    }));
  }
  function cmsCleanContent(content) {
    const out = {};
    Object.keys(content || {}).forEach(k => {
      const v = content[k];
      if (typeof v === 'string') out[k] = v.slice(0, 4000);        // plain text, capped
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    });
    // any *Url field must be a clean http(s) URL or dropped
    Object.keys(out).forEach(k => { if (/url$/i.test(k) && typeof out[k] === 'string') out[k] = cmsSafeUrl(out[k]); });
    return out;
  }

  async function cmsSaveDraft() {
    if (!cmsRequireEditor() || !_cmsAdminPage) return;
    const sections = cmsNormaliseDraft(_cmsDraft);
    try {
      await db.collection('sitePages').doc(_cmsAdminPage).set({
        title: (CMS_PAGES.find(p => p.id === _cmsAdminPage) || {}).title || _cmsAdminPage,
        slug: _cmsAdminPage,
        status: 'draft',
        draft: { sections },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      }, { merge: true });
      logAdminAction('cms_draft_save', 'sitePages', _cmsAdminPage, '');
      showToast('Ноорог хадгалагдлаа', 'success');
    } catch (e) {
      console.error('cmsSaveDraft failed:', e.code, e.message);
      showToast('Хадгалахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // Preview: apply the current in-editor draft to the live page for THIS admin only
  // (in-memory override, nothing written), then jump to the page.
  function cmsPreviewCurrentDraft() {
    if (!_cmsAdminPage) return;
    _cmsPreviewOverride = { pageId: _cmsAdminPage, sections: cmsNormaliseDraft(_cmsDraft) };
    _cmsPublicCache[_cmsAdminPage] = null;
    showToast('Урьдчилан харах горим — зөвхөн танд харагдана');
    if (_cmsAdminPage === 'home') { showPage('home'); setTimeout(applySiteCms, 60); }
  }

  // Preview the currently PUBLISHED page (from the row action) — clears any override.
  async function cmsPreviewPage(pageId) {
    _cmsPreviewOverride = null;
    _cmsPublicCache[pageId] = null;
    if (pageId === 'home') { showPage('home'); setTimeout(applySiteCms, 60); }
  }

  async function cmsPublish() {
    if (!cmsRequireEditor() || !_cmsAdminPage) return;
    if (!confirm('Энэ хуудсыг нийтлэх үү? Нийтэлсэн агуулга сайтад шууд харагдана.')) return;
    const sections = cmsNormaliseDraft(_cmsDraft);
    const pageId = _cmsAdminPage;
    try {
      // snapshot the previous published version for restore/history (cap the array at 10)
      let versions = [];
      try {
        const prev = await db.collection('sitePages').doc(pageId).get();
        if (prev.exists && Array.isArray(prev.data().versions)) versions = prev.data().versions;
      } catch (e) {}
      const nowIso = new Date().toISOString();
      versions = versions.concat([{ publishedAt: nowIso, publishedBy: currentUser.uid, sections }]).slice(-10);

      const batch = db.batch();
      batch.set(db.collection('sitePagesPublic').doc(pageId), {
        sections,
        publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        publishedBy: currentUser.uid
      });
      batch.set(db.collection('sitePages').doc(pageId), {
        title: (CMS_PAGES.find(p => p.id === pageId) || {}).title || pageId,
        slug: pageId,
        status: 'published',
        draft: { sections },
        versions,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      }, { merge: true });
      await batch.commit();

      _cmsPreviewOverride = null; _cmsPublicCache[pageId] = null;
      logAdminAction('cms_publish', 'sitePages', pageId, '');
      showToast('Хуудас нийтлэгдлээ', 'success');
      if (pageId === 'home') setTimeout(applySiteCms, 60);
      renderAdminCmsSection();
    } catch (e) {
      console.error('cmsPublish failed:', e.code, e.message);
      showToast('Нийтлэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }

  // ---- CMS image upload to Firebase Storage (cms-media/...) ----
  // Validated client-side (image MIME, <12MB) and again by storage.rules server-side.
  // Returns the download URL; never stores base64 in Firestore.
  async function cmsUploadImage(file) {
    if (!cmsRequireEditor()) return null;
    if (!file || !/^image\//.test(file.type)) { showToast('Зөвхөн зураг оруулна уу'); return null; }
    if (file.size > 12 * 1024 * 1024) { showToast('Зургийн хэмжээ 12MB-аас бага байх ёстой'); return null; }
    try {
      const path = 'cms-media/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ref = firebase.storage().ref().child(path);
      const snap = await ref.put(file);
      return await snap.ref.getDownloadURL();
    } catch (e) {
      console.error('cmsUploadImage failed:', e.code, e.message);
      showToast('Зураг оруулахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
      return null;
    }
  }

  // ---- One-time seeding: create the CMS docs from the CURRENT hardcoded content ----
  // Idempotent: skips a doc that already exists. Run manually by an admin from the module.
  async function cmsSeedFromCurrentContent() {
    if (!cmsRequireEditor()) return;
    try {
      const orgSnap = await db.collection('siteSettings').doc('organization').get();
      if (!orgSnap.exists) {
        await db.collection('siteSettings').doc('organization').set(Object.assign(cmsDefaultOrganization(), {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid
        }));
      }
      const homeSnap = await db.collection('sitePages').doc('home').get();
      if (!homeSnap.exists) {
        const sections = cmsDefaultHomeSections();
        const batch = db.batch();
        batch.set(db.collection('sitePages').doc('home'), {
          title: 'Нүүр хуудас', slug: 'home', status: 'published',
          draft: { sections }, versions: [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid
        });
        batch.set(db.collection('sitePagesPublic').doc('home'), {
          sections, publishedAt: firebase.firestore.FieldValue.serverTimestamp(), publishedBy: currentUser.uid
        });
        await batch.commit();
      }
      showToast('CMS анхны агуулга үүсгэгдлээ', 'success');
      renderAdminCmsSection();
    } catch (e) {
      console.error('cmsSeedFromCurrentContent failed:', e.code, e.message);
      showToast('Анхны агуулга үүсгэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
    }
  }
