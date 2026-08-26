  // ===== NEW DEVELOPMENTS (Шинэ орон сууц) =====
  // Separate marketplace section for construction companies to list whole projects
  // (as opposed to js/my-listings.js, which is one unit/property at a time).
  // Firestore collection: projects/{id} — see firestore.rules for the owner-scoped rules.
  let projects = [];
  let editingProjectId = null;

  const NEWDEV_DISTRICT_LABELS = {
    'khan-uul': 'Хан-Уул', 'sukhbaatar': 'Сүхбаатар', 'chingeltei': 'Чингэлтэй',
    'bayanzurkh': 'Баянзүрх', 'bayangol': 'Баянгол', 'songinokhairkhan': 'Сонгинохайрхан',
    'nalaikh': 'Налайх', 'bagakhangai': 'Багахангай', 'baganuur': 'Багануур'
  };
  const NEWDEV_UNIT_TYPE_LABELS = {
    studio: 'Студи', '1': '1 өрөө', '2': '2 өрөө', '3': '3 өрөө', '4+': '4+ өрөө',
    duplex: 'Дуплекс', penthouse: 'Пентхаус'
  };
  // Explicit display order — plain Object.keys() would sort the numeric-looking keys
  // ('1','2','3') ahead of 'studio' regardless of insertion order (JS integer-key rule).
  const NEWDEV_UNIT_TYPE_ORDER = ['studio', '1', '2', '3', '4+', 'duplex', 'penthouse'];

  function ndDistrictLabel(code) { return NEWDEV_DISTRICT_LABELS[code] || code || 'Тодорхойгүй'; }
  function ndUnitTypesText(arr) { return (arr || []).map(t => NEWDEV_UNIT_TYPE_LABELS[t] || t).join(', '); }

  // ===== LOAD (public, no auth required — same pattern as loadPublicListings) =====
  async function loadProjects() {
    // Unlike Listings/Rent (which always have synchronous demo data to show instantly),
    // New Developments has no fallback — the grid is genuinely empty until this resolves,
    // so it's worth a real skeleton here instead of a blank grid.
    const gridEl = document.getElementById('newdevGrid');
    if (gridEl) gridEl.innerHTML = skeletonCards(6);
    try {
      const snap = await db.collection('projects').where('status', '==', 'active').get();
      projects = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } catch(e) {
      projects = [];
    }
    // Render either way — a failed fetch (e.g. rules not yet published for this
    // collection) should still show the empty state instead of leaving the grid
    // as the raw "Rendered by JS" placeholder comment forever.
    populateNewdevFilterOptions();
    renderProjectsGrid();
  }

  // ===== FILTER SIDEBAR — completion date and developer are free-text fields on the
  // real Firestore schema (no structured year/enum), so their dropdown options are built
  // from the distinct values actually present in `projects` rather than any fixed/fake list. =====
  const ndActiveUnitTypes = [];
  let newdevSort = 'default';

  function populateNewdevFilterOptions() {
    const districtSel = document.getElementById('ndDistrict');
    if (districtSel) {
      districtSel.innerHTML = '<option value="all">Бүх дүүрэг</option>' +
        Object.keys(NEWDEV_DISTRICT_LABELS).map(k => `<option value="${k}">${NEWDEV_DISTRICT_LABELS[k]}</option>`).join('');
    }
    const completionSel = document.getElementById('ndCompletion');
    if (completionSel) {
      const values = [...new Set(projects.map(p => p.completionDate).filter(Boolean))].sort();
      completionSel.innerHTML = '<option value="all">Бүгд</option>' +
        values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    }
    const devSel = document.getElementById('ndDeveloper');
    if (devSel) {
      const values = [...new Set(projects.map(p => p.company).filter(Boolean))].sort();
      devSel.innerHTML = '<option value="all">Бүгд</option>' +
        values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    }
    const toggleWrap = document.getElementById('ndUnitTypeToggles');
    if (toggleWrap) {
      toggleWrap.innerHTML = NEWDEV_UNIT_TYPE_ORDER.map(t => `
        <button type="button" class="filter-toggle" data-ndunittype="${t}">${NEWDEV_UNIT_TYPE_LABELS[t]}</button>
      `).join('');
      toggleWrap.querySelectorAll('.filter-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.ndunittype;
          btn.classList.toggle('active');
          const i = ndActiveUnitTypes.indexOf(t);
          if (btn.classList.contains('active')) { if (i === -1) ndActiveUnitTypes.push(t); }
          else if (i > -1) ndActiveUnitTypes.splice(i, 1);
          applyNewdevFilters();
        });
      });
    }
  }

  function getFilteredProjects() {
    let results = projects.slice();
    const q = (document.getElementById('ndSearch')?.value || '').trim().toLowerCase();
    if (q) {
      results = results.filter(p => {
        const haystack = [p.projectName, p.company, ndDistrictLabel(p.district), p.address, p.completionDate].join(' ').toLowerCase();
        return q.split(/\s+/).every(word => haystack.includes(word));
      });
    }
    const district = document.getElementById('ndDistrict')?.value || 'all';
    if (district !== 'all') results = results.filter(p => p.district === district);
    const priceMin = parseFloat(document.getElementById('ndPriceMin')?.value) || 0;
    const priceMax = parseFloat(document.getElementById('ndPriceMax')?.value) || Infinity;
    if (priceMin || priceMax !== Infinity) results = results.filter(p => (p.pricePerSqm || 0) >= priceMin && (p.pricePerSqm || 0) <= priceMax);
    const completion = document.getElementById('ndCompletion')?.value || 'all';
    if (completion !== 'all') results = results.filter(p => p.completionDate === completion);
    const developer = document.getElementById('ndDeveloper')?.value || 'all';
    if (developer !== 'all') results = results.filter(p => p.company === developer);
    if (ndActiveUnitTypes.length) results = results.filter(p => Array.isArray(p.unitTypes) && ndActiveUnitTypes.some(t => p.unitTypes.includes(t)));

    if (newdevSort === 'price-asc') results.sort((a, b) => (a.pricePerSqm || 0) - (b.pricePerSqm || 0));
    else if (newdevSort === 'price-desc') results.sort((a, b) => (b.pricePerSqm || 0) - (a.pricePerSqm || 0));

    return results;
  }

  function newdevActiveFilterCount() {
    let n = 0;
    if ((document.getElementById('ndDistrict')?.value || 'all') !== 'all') n++;
    if (document.getElementById('ndPriceMin')?.value) n++;
    if (document.getElementById('ndPriceMax')?.value) n++;
    if ((document.getElementById('ndCompletion')?.value || 'all') !== 'all') n++;
    if ((document.getElementById('ndDeveloper')?.value || 'all') !== 'all') n++;
    n += ndActiveUnitTypes.length;
    return n;
  }

  function renderNewdevActiveTags() {
    const wrap = document.getElementById('newdevActiveFilterTags');
    if (!wrap) return;
    const tags = [];
    const districtVal = document.getElementById('ndDistrict')?.value;
    if (districtVal && districtVal !== 'all') tags.push({ label: ndDistrictLabel(districtVal), clear: () => { document.getElementById('ndDistrict').value = 'all'; } });
    const q = document.getElementById('ndSearch')?.value;
    if (q) tags.push({ label: '"' + q + '"', clear: () => { document.getElementById('ndSearch').value = ''; } });
    const priceMin = document.getElementById('ndPriceMin')?.value;
    if (priceMin) tags.push({ label: priceMin + '+сая ₮/м²', clear: () => { document.getElementById('ndPriceMin').value = ''; } });
    const priceMax = document.getElementById('ndPriceMax')?.value;
    if (priceMax) tags.push({ label: '≤' + priceMax + 'сая ₮/м²', clear: () => { document.getElementById('ndPriceMax').value = ''; } });
    const completionVal = document.getElementById('ndCompletion')?.value;
    if (completionVal && completionVal !== 'all') tags.push({ label: completionVal, clear: () => { document.getElementById('ndCompletion').value = 'all'; } });
    const devVal = document.getElementById('ndDeveloper')?.value;
    if (devVal && devVal !== 'all') tags.push({ label: devVal, clear: () => { document.getElementById('ndDeveloper').value = 'all'; } });
    ndActiveUnitTypes.slice().forEach(t => tags.push({
      label: NEWDEV_UNIT_TYPE_LABELS[t] || t,
      clear: () => {
        const i = ndActiveUnitTypes.indexOf(t);
        if (i > -1) ndActiveUnitTypes.splice(i, 1);
        document.querySelectorAll('#ndUnitTypeToggles .filter-toggle').forEach(el => el.classList.toggle('active', ndActiveUnitTypes.includes(el.dataset.ndunittype)));
      }
    }));
    if (tags.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = tags.map((t, i) => `
      <span class="active-filter-chip" onclick="newdevClearTag(${i})">
        ${esc(t.label)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </span>
    `).join('') + `<button type="button" class="active-filter-clear-all" onclick="resetNewdevFilters()">Бүгдийг арилгах</button>`;
    window._newdevTagClears = tags.map(t => t.clear);
  }
  function newdevClearTag(i) {
    const fn = window._newdevTagClears && window._newdevTagClears[i];
    if (fn) fn();
    applyNewdevFilters();
  }

  function applyNewdevFilters() {
    renderProjectsGrid();
  }

  function resetNewdevFilters() {
    ['ndSearch', 'ndPriceMin', 'ndPriceMax'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['ndDistrict', 'ndCompletion', 'ndDeveloper'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
    ndActiveUnitTypes.length = 0;
    document.querySelectorAll('#ndUnitTypeToggles .filter-toggle').forEach(el => el.classList.remove('active'));
    newdevSort = 'default';
    const sortEl = document.getElementById('newdevSortSelect'); if (sortEl) sortEl.value = 'default';
    applyNewdevFilters();
  }

  function setNewdevSorting(val) {
    newdevSort = val;
    applyNewdevFilters();
  }

  function openNewdevFilterSheet() {
    document.getElementById('newdevSidebar')?.classList.add('open');
    document.getElementById('newdevSidebarOverlay')?.classList.add('open');
  }
  function closeNewdevFilterSheet() {
    document.getElementById('newdevSidebar')?.classList.remove('open');
    document.getElementById('newdevSidebarOverlay')?.classList.remove('open');
  }

  function renderProjectsGrid() {
    const el = document.getElementById('newdevGrid');
    if (!el) return;
    const items = getFilteredProjects();
    const countEl = document.getElementById('newdevFilterCount');
    if (countEl) countEl.textContent = items.length;
    const mfCount = document.getElementById('newdevMobileFilterCount');
    if (mfCount) {
      const n = newdevActiveFilterCount();
      mfCount.textContent = n > 0 ? ` (${n})` : '';
    }
    if (projects.length === 0) {
      el.innerHTML = buyerEmptyState({
        icon: BUYER_EMPTY_ICON_BUILDING,
        title: 'Одоогоор нийтэлсэн төсөл алга',
        sub: 'Барилгын компани мөн үү? Эхний төслөө нийтлээрэй.'
      });
      return;
    }
    if (items.length === 0) {
      el.innerHTML = buyerEmptyState({
        icon: BUYER_EMPTY_ICON_SEARCH,
        title: 'Тохирох төсөл олдсонгүй',
        sub: 'Шүүлтүүрийн нөхцлийг өөрчлөх эсвэл цэвэрлэж дахин оролдоно уу.',
        resetLabel: 'Шүүлтүүр цэвэрлэх',
        resetOnclick: 'resetNewdevFilters()'
      });
      return;
    }
    el.innerHTML = items.map(projectCard).join('');
    renderNewdevActiveTags();
  }

  function projectCard(p) {
    const cover = (p.images && p.images[0]) || p.img || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80';
    const priceText = p.pricePerSqm ? fmtPrice(p.pricePerSqm) : 'Үнэ асууна уу';
    return `
      <div class="newdev-card" onclick="openProjectDetail('${p.id}')">
        <div class="newdev-img">
          <img src="${esc(cover)}" alt="${esc(p.projectName)}" loading="lazy" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
          ${p.completionDate ? `<span class="newdev-badge">${esc(p.completionDate)}</span>` : ''}
          ${p.unitsRemaining != null && p.unitsRemaining !== '' ? `<span class="newdev-units-badge">${esc(String(p.unitsRemaining))} байр үлдсэн</span>` : ''}
        </div>
        <div class="newdev-body">
          <div class="newdev-company">${esc(p.company)}</div>
          <div class="newdev-title">${esc(p.projectName)}</div>
          <div class="newdev-loc">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${esc(ndDistrictLabel(p.district))}${p.address ? ' · ' + esc(p.address) : ''}
          </div>
          <div class="newdev-price-row">
            <div class="newdev-price">${priceText}</div>
            <div class="newdev-price-unit">1м²</div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== DETAIL MODAL =====
  function openProjectDetail(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    const images = (p.images && p.images.length) ? p.images : [p.img || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'];
    mcImages = images; mcIdx = 0;
    const isOwner = !!(currentUser && p.ownerId === currentUser.uid);
    const tour3dEmbed = p.tour3d && videoEmbedUrl(p.tour3d);
    const tourEmbed = p.tourUrl && safeEmbedUrl(p.tourUrl);

    document.getElementById('modalContent').className = 'modal';
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      ${isOwner ? `
      <button class="modal-share-btn" onclick="event.stopPropagation(); editProject('${p.id}')" title="Засах">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      ` : ''}

      <div class="mc-wrap">
        <div class="mc-main">
          <img id="mcMainImg" src="${esc(images[0])}" alt="${esc(p.projectName)}" style="transition:opacity 0.22s;" />
          <span class="mc-counter" id="mcCounter">1 / ${images.length}</span>
          ${images.length > 1 ? `
          <button class="mc-nav prev" onclick="mcPrev()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="mc-nav next" onclick="mcNext()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>` : ''}
        </div>
        ${images.length > 1 ? `
        <div class="mc-thumbs">
          ${images.map((img, i) => `<img class="mc-thumb ${i===0?'active':''}" src="${esc(img)}" onclick="mcGoto(${i})" alt="" />`).join('')}
        </div>` : ''}
      </div>

      <div class="modal-body">
        <div class="newdev-company" style="margin-bottom:4px;">${esc(p.company)}</div>
        <h2 class="modal-title">${esc(p.projectName)}</h2>
        <div class="modal-loc">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(ndDistrictLabel(p.district))}${p.address ? ' · ' + esc(p.address) : ''}
        </div>

        <div class="modal-price-row">
          <div>
            <div class="modal-price">${p.pricePerSqm ? fmtPrice(p.pricePerSqm) : 'Үнэ асууна уу'}</div>
            <div style="font-size:13px; color:var(--ink-3); margin-top:4px;">1м² үнэ</div>
          </div>
          ${p.completionDate ? `
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <span class="price-tag">${esc(p.completionDate)}</span>
          </div>
          ` : ''}
        </div>

        <div class="modal-info-grid">
          <div class="info-card">
            <div class="info-card-label">Байрны төрөл</div>
            <div class="info-card-value" style="font-size:13px;">${p.unitTypes && p.unitTypes.length ? esc(ndUnitTypesText(p.unitTypes)) : '—'}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">Үлдэгдэл байр</div>
            <div class="info-card-value">${p.unitsRemaining != null && p.unitsRemaining !== '' ? esc(String(p.unitsRemaining)) : '—'}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">Ашиглалтад орох хугацаа</div>
            <div class="info-card-value" style="font-size:13px;">${p.completionDate ? esc(p.completionDate) : '—'}</div>
          </div>
        </div>

        ${tour3dEmbed ? `
        <div class="modal-section">
          <h4>3D танилцуулга</h4>
          <div style="border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:#0A1628;">
            <iframe width="100%" height="100%" src="${esc(tour3dEmbed)}" title="3D танилцуулга" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        </div>
        ` : ''}

        ${tourEmbed ? `
        <div class="modal-section">
          <h4>360° тойрох</h4>
          <div style="border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:#0A1628;">
            <iframe width="100%" height="100%" src="${esc(tourEmbed)}" title="360° тойрох" frameborder="0" allow="xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        </div>
        ` : ''}

        ${p.sitePlan ? `
        <div class="modal-section">
          <h4>Давхарын төлөвлөгөө</h4>
          <img src="${esc(p.sitePlan)}" alt="Давхарын төлөвлөгөө" style="width:100%; border-radius:14px; border:1px solid var(--line); display:block;" />
        </div>
        ` : ''}

        ${p.floorPlans && p.floorPlans.length ? `
        <div class="modal-section">
          <h4>Floor plan</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px;">
            ${p.floorPlans.map(fp => `<img src="${esc(fp)}" alt="Floor plan" style="width:100%; border-radius:10px; border:1px solid var(--line); display:block; cursor:zoom-in;" onclick="window.open('${esc(fp)}','_blank')" />`).join('')}
          </div>
        </div>
        ` : ''}

        ${p.paymentTerms ? `
        <div class="modal-section">
          <h4>Төлбөрийн нөхцөл</h4>
          <div class="prof-info-row" style="border:none;padding:0;">
            <div style="font-size:14px;color:var(--ink-2);line-height:1.6;white-space:pre-line;">${esc(p.paymentTerms)}</div>
          </div>
        </div>
        ` : ''}

        ${p.mortgage ? `
        <div class="modal-section">
          <h4>Ипотек</h4>
          <div style="font-size:14px;color:var(--ink-2);line-height:1.6;white-space:pre-line;">${esc(p.mortgage)}</div>
        </div>
        ` : ''}

        <div class="modal-section">
          <div class="seller-card">
            <div class="seller-av">${esc((p.company || 'К')[0])}</div>
            <div class="seller-info">
              <div class="seller-name">${esc(p.company)}</div>
              <div class="seller-meta">${esc(p.contactName || 'Борлуулалтын алба')}</div>
            </div>
            <button class="btn btn-ghost" onclick="revealProjectPhone('${p.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
              Залгах
            </button>
          </div>
          <div id="contactBox_${p.id}"></div>
        </div>

        ${isOwner ? `
        <div class="modal-section">
          <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger);width:100%;justify-content:center;" onclick="deleteProject('${p.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
            Төслийг устгах
          </button>
        </div>
        ` : ''}
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';

    p.viewCount = (p.viewCount || 0) + 1;
    db.collection('projects').doc(p.id).update({ viewCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
  }

  function revealProjectPhone(id) {
    const box = document.getElementById('contactBox_' + id);
    const p = projects.find(x => x.id === id);
    // Looked up here rather than passed in as a raw parameter — see revealPhone() in
    // listing-detail.js for why embedding user-entered text into an inline onclick(...)
    // call is unsafe even when HTML-escaped.
    const phone = p ? (p.phone || '') : '';
    if (!box || !phone) return;
    if (p) {
      p.contactCount = (p.contactCount || 0) + 1;
      db.collection('projects').doc(id).update({ contactCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
    }
    box.innerHTML = `
      <div style="text-align:center;padding-top:14px;">
        <div style="font-size:22px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--ink);letter-spacing:2px;margin-bottom:16px;">${esc(phone)}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="tel:${phone.replace(/\D/g,'')}" class="btn btn-blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.39 2 2 0 0 1 3.22 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18l-.08-1.08z"/></svg>
            Залгах
          </a>
          <button class="btn btn-primary" id="copyProjectPhoneBtn_${id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Хуулах
          </button>
        </div>
      </div>
    `;
    const copyBtn = document.getElementById('copyProjectPhoneBtn_' + id);
    if (copyBtn) copyBtn.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(phone).then(() => showToast('Дугаар хуулагдлаа', 'success'));
    });
  }

  function deleteProject(id) {
    if (!confirm('Энэ төслийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
    db.collection('projects').doc(id).delete().then(() => {
      projects = projects.filter(x => x.id !== id);
      renderProjectsGrid();
      closeModal();
      showToast('Төсөл устгагдлаа', 'success');
    }).catch(() => showToast('Устгахад алдаа гарлаа'));
  }

  // ===== ADD / EDIT PROJECT WIZARD =====
  function defaultAddProjectState() {
    return {
      step: 1,
      company: '', projectName: '', district: '', khoroo: '', address: '', completionDate: '',
      pricePerSqm: '', unitTypes: [], unitsRemaining: '',
      paymentTerms: '', mortgage: '',
      images: [], sitePlan: null, floorPlans: [],
      tour3d: '', tourUrl: '',
      phone: '', contactName: ''
    };
  }
  let addProjectState = defaultAddProjectState();

  function openAddProject() {
    if (!currentUser) { showToast('Төсөл нэмэхийн тулд нэвтэрнэ үү'); openAuth(); return; }
    editingProjectId = null;
    addProjectState = defaultAddProjectState();
    addProjectState.company = currentUser.companyName || '';
    addProjectState.contactName = currentUser.name ? (currentUser.name + (currentUser.lastName ? ' ' + currentUser.lastName : '')) : '';
    document.getElementById('modalContent').className = 'modal';
    document.getElementById('modalContent').innerHTML = renderAddProject();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(attachAddProjectHandlers, 50);
  }

  function editProject(id) {
    const p = projects.find(x => x.id === id);
    if (!p || !currentUser || p.ownerId !== currentUser.uid) return;
    editingProjectId = id;
    addProjectState = Object.assign(defaultAddProjectState(), {
      company: p.company || '', projectName: p.projectName || '', district: p.district || '',
      khoroo: p.khoroo || '', address: p.address || '', completionDate: p.completionDate || '',
      pricePerSqm: p.pricePerSqm || '', unitTypes: (p.unitTypes || []).slice(), unitsRemaining: p.unitsRemaining ?? '',
      paymentTerms: p.paymentTerms || '', mortgage: p.mortgage || '',
      images: (p.images || []).slice(), sitePlan: p.sitePlan || null, floorPlans: (p.floorPlans || []).slice(),
      tour3d: p.tour3d || '', tourUrl: p.tourUrl || '',
      phone: p.phone || '', contactName: p.contactName || ''
    });
    document.getElementById('modalContent').className = 'modal';
    document.getElementById('modalContent').innerHTML = renderAddProject();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(attachAddProjectHandlers, 50);
  }

  function confirmCloseAddProject() {
    if (addProjectState.step === 1 || addProjectState.step === 4) {
      closeModal();
      addProjectState = defaultAddProjectState();
      editingProjectId = null;
      return;
    }
    if (confirm('Төсөл нэмэх процессоос гарвал оруулсан мэдээлэл устгагдана. Үргэлжлүүлэх үү?')) {
      closeModal();
      addProjectState = defaultAddProjectState();
      editingProjectId = null;
    }
  }

  function renderAddProject() {
    return `
      <button class="modal-close" onclick="confirmCloseAddProject()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="add-listing">
        <div class="al-header">
          <span class="al-eyebrow">${editingProjectId ? 'Төсөл засах' : 'Шинэ төсөл нийтлэх'}</span>
          <div class="al-title">${editingProjectId ? 'Төслийн мэдээллээ шинэчлээрэй' : 'Барилгын төслөө TP Property дээр нийтлээрэй'}</div>
          <div class="al-sub">Компани, байршил, үнэ, төлөвлөгөө, холбоо барих мэдээллийг бөглөнө үү.</div>
        </div>

        <div class="stepper">
          ${[
            { n: 1, name: 'Байгууллага' },
            { n: 2, name: 'Дэлгэрэнгүй' },
            { n: 3, name: 'Зураг & Холбоо' }
          ].map(s => `
            <div class="step ${addProjectState.step === s.n ? 'active' : ''} ${addProjectState.step > s.n ? 'done' : ''}">
              <div class="step-num">${addProjectState.step > s.n ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : s.n}</div>
              <span class="step-name">${s.name}</span>
            </div>
          `).join('')}
        </div>

        ${renderProjectStep1()}
        ${renderProjectStep2()}
        ${renderProjectStep3()}
        ${renderProjectSuccess()}
      </div>
    `;
  }

  function renderProjectStep1() {
    const active = addProjectState.step === 1;
    const s = addProjectState;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="1">
        <div class="step-section-title">Барилгын компани, төсөл, байршил</div>

        <div class="form-row">
          <label class="form-label" for="npCompany">Компанийн нэр<span class="req">*</span></label>
          <input type="text" class="form-input" id="npCompany" placeholder="Жнь: Related Properties ХХК" maxlength="100" value="${esc(s.company)}" />
        </div>

        <div class="form-row">
          <label class="form-label" for="npProjectName">Төслийн нэр<span class="req">*</span></label>
          <input type="text" class="form-input" id="npProjectName" placeholder="Жнь: Central Tower" maxlength="100" value="${esc(s.projectName)}" />
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label class="form-label" for="npDistrict">Дүүрэг<span class="req">*</span></label>
            <select class="form-select" id="npDistrict">
              <option value="">Сонгох</option>
              ${Object.keys(NEWDEV_DISTRICT_LABELS).map(k => `<option value="${k}" ${s.district === k ? 'selected' : ''}>${NEWDEV_DISTRICT_LABELS[k]}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" for="npKhoroo">Хороо <span class="hint">— заавал биш</span></label>
            <input type="number" class="form-input" id="npKhoroo" placeholder="Жнь: 11" min="1" max="50" value="${esc(s.khoroo)}" />
          </div>
        </div>

        <div class="form-row">
          <label class="form-label" for="npAddress">Дэлгэрэнгүй хаяг</label>
          <input type="text" class="form-input" id="npAddress" placeholder="Жнь: Зайсан, Дулаанбаатар гудамж" maxlength="150" value="${esc(s.address)}" />
        </div>

        <div class="form-row">
          <label class="form-label" for="npCompletionDate">Ашиглалтад орох хугацаа<span class="req">*</span></label>
          <input type="text" class="form-input" id="npCompletionDate" placeholder="Жнь: 2026 оны IV улирал" maxlength="60" value="${esc(s.completionDate)}" />
        </div>

        <div class="step-nav">
          <button class="btn btn-blue btn-lg" style="width:100%;" onclick="nextProjectStep(1)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderProjectStep2() {
    const active = addProjectState.step === 2;
    const s = addProjectState;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="2">
        <div class="step-section-title">Yнэ, байрны төрөл, нөхцөл</div>

        <div class="form-grid-2">
          <div class="form-row">
            <label class="form-label" for="npPricePerSqm">1м² үнэ (сая ₮)<span class="req">*</span></label>
            <input type="number" class="form-input" id="npPricePerSqm" placeholder="Жнь: 4.5" min="0" step="0.1" value="${esc(s.pricePerSqm)}" />
          </div>
          <div class="form-row">
            <label class="form-label" for="npUnitsRemaining">Yлдэгдэл байр <span class="hint">— заавал биш</span></label>
            <input type="number" class="form-input" id="npUnitsRemaining" placeholder="Жнь: 24" min="0" value="${esc(s.unitsRemaining)}" />
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Байрны төрөл <span class="hint">— олныг сонгож болно</span></label>
          <div class="toggle-grid">
            ${NEWDEV_UNIT_TYPE_ORDER.map(k => `
              <div class="toggle-row" data-unittype="${k}">
                <span>${NEWDEV_UNIT_TYPE_LABELS[k]}</span>
                <div class="toggle-switch"></div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-row">
          <label class="form-label" for="npPaymentTerms">Төлбөрийн нөхцөл <span class="hint">— заавал биш</span></label>
          <textarea class="form-textarea" id="npPaymentTerms" rows="3" placeholder="Жнь: 30% урьдчилгаа, үлдэгдлийг ашиглалтад орох хүртэл шат дараатай төлнө" maxlength="800">${esc(s.paymentTerms)}</textarea>
        </div>

        <div class="form-row">
          <label class="form-label" for="npMortgage">Ипотек <span class="hint">— заавал биш</span></label>
          <textarea class="form-textarea" id="npMortgage" rows="3" placeholder="Жнь: ХХБ, Голомт банктай хамтран 30 хүртэлх жилийн хугацаатай ипотек" maxlength="800">${esc(s.mortgage)}</textarea>
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevProjectStep(2)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextProjectStep(2)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderProjectStep3() {
    const active = addProjectState.step === 3;
    const s = addProjectState;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="3">
        <div class="step-section-title">Зураг, төлөвлөгөө & медиа</div>
        <div class="step-section-sub">Барилгын дүрслэл/фасад зургаа оруулна уу. Эхний зураг үндсэн зураг болно.</div>
        <div class="image-upload-grid" id="npImageGrid">
          ${renderProjectImageBoxes()}
        </div>

        <div class="form-grid-2" style="margin-top:20px;">
          <div class="form-row">
            <label class="form-label">Давхарын төлөвлөгөө <span class="hint">— заавал биш</span></label>
            ${s.sitePlan ? `
              <div style="position:relative; display:inline-block;">
                <img src="${s.sitePlan}" alt="" style="max-width:220px; border-radius:10px; border:1px solid var(--line); display:block;" />
                <button type="button" class="remove-img" style="position:absolute; top:6px; right:6px;" onclick="clearSitePlan()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ` : `
              <label class="image-upload-box" for="npSitePlanInput" style="max-width:220px;">
                <input type="file" id="npSitePlanInput" accept="image/*" style="display:none" onchange="handleSitePlanUpload(event)" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M3 9h18"/></svg>
                <div class="image-upload-text">Төлөвлөгөө оруулах</div>
                <div class="image-upload-hint">JPG, PNG</div>
              </label>
            `}
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Floor plan (нэгжийн төлөвлөгөө) <span class="hint">— олон зураг, заавал биш</span></label>
          <div class="image-upload-grid" id="npFloorPlanGrid">
            ${renderProjectFloorPlanBoxes()}
          </div>
        </div>

        <div class="form-row">
          <label class="form-label" for="npTour3d">3D танилцуулга холбоос <span class="hint">— YouTube эсвэл Vimeo линк</span></label>
          <input type="url" class="form-input" id="npTour3d" placeholder="https://youtube.com/watch?v=..." value="${esc(s.tour3d)}" />
        </div>

        <div class="form-row">
          <label class="form-label" for="npTourUrl">360° virtual tour холбоос <span class="hint">— Matterport, Kuula гэх мэт embed линк</span></label>
          <input type="url" class="form-input" id="npTourUrl" placeholder="https://my.matterport.com/show/?m=..." value="${esc(s.tourUrl)}" />
        </div>

        <div class="step-section-title" style="margin-top:28px;">Холбоо барих</div>
        <div class="form-grid-2">
          <div class="form-row">
            <label class="form-label" for="npPhone">Утасны дугаар<span class="req">*</span></label>
            <div class="phone-input-group">
              <div class="phone-prefix">+976</div>
              <input type="tel" class="form-input" id="npPhone" placeholder="88112233" maxlength="8" value="${esc(s.phone)}" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" for="npContactName">Хариуцсан ажилтан</label>
            <input type="text" class="form-input" id="npContactName" placeholder="Жнь: Борлуулалтын алба" maxlength="60" value="${esc(s.contactName)}" />
          </div>
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevProjectStep(3)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="submitProject()">
            ${editingProjectId ? 'Хадгалах' : 'Нийтлэх'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderProjectSuccess() {
    const active = addProjectState.step === 4;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="4">
        <div class="success-state">
          <div class="success-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="success-title">${editingProjectId ? 'Төсөл шинэчлэгдлээ' : 'Төсөл амжилттай нийтлэгдлээ'}</div>
          <div class="success-info">Таны төсөл одоо "Шинэ орон сууц" хэсэгт бүх хэрэглэгчдэд харагдаж байна.</div>
          <div style="display:flex; gap:10px; justify-content:center;">
            <button class="btn btn-ghost btn-lg" onclick="closeModal(); addProjectState = defaultAddProjectState(); editingProjectId = null;">Хаах</button>
            <button class="btn btn-blue btn-lg" onclick="closeModal(); addProjectState = defaultAddProjectState(); editingProjectId = null; showPage('newdev');">
              Төслүүдийг үзэх
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderProjectImageBoxes() {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const img = addProjectState.images[i];
      if (img) {
        boxes.push(`
          <div class="image-upload-box has-image">
            ${i === 0 ? '<div class="main-badge">Үндсэн</div>' : ''}
            <button class="remove-img" onclick="removeProjectImage(${i})">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <img src="${img}" alt="">
          </div>
        `);
      } else {
        boxes.push(`
          <label class="image-upload-box" for="npImgInput${i}">
            <input type="file" id="npImgInput${i}" accept="image/*" style="display:none" onchange="handleProjectImageUpload(event, ${i})" />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
            <div class="image-upload-text">${i === 0 ? 'Үндсэн зураг' : 'Зураг ' + (i + 1)}</div>
            <div class="image-upload-hint">JPG, PNG</div>
          </label>
        `);
      }
    }
    return boxes.join('');
  }

  function renderProjectFloorPlanBoxes() {
    const boxes = addProjectState.floorPlans.map((img, i) => `
      <div class="image-upload-box has-image">
        <button class="remove-img" onclick="removeProjectFloorPlan(${i})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <img src="${img}" alt="">
      </div>
    `);
    if (addProjectState.floorPlans.length < 4) {
      boxes.push(`
        <label class="image-upload-box" for="npFloorPlanInput">
          <input type="file" id="npFloorPlanInput" accept="image/*" style="display:none" onchange="handleProjectFloorPlanUpload(event)" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
          <div class="image-upload-text">Floor plan нэмэх</div>
          <div class="image-upload-hint">JPG, PNG</div>
        </label>
      `);
    }
    return boxes.join('');
  }

  // Resize-then-base64, same approach as the floor-plan uploader in my-listings.js —
  // projects can carry up to 11 images total (6 cover + site plan + 4 floor plans),
  // far more than a single listing, so every slot here is compressed, not just plans.
  function compressImageFile(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('not-image')); return; }
      if (file.size > 8 * 1024 * 1024) { reject(new Error('too-large')); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
          else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.85));
        };
        img.onerror = () => reject(new Error('decode-failed'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsDataURL(file);
    });
  }

  function handleProjectImageUpload(event, idx) {
    const file = event.target.files[0];
    if (!file) return;
    compressImageFile(file, 1400, 0.85).then(dataUrl => {
      addProjectState.images[idx] = dataUrl;
      document.getElementById('npImageGrid').innerHTML = renderProjectImageBoxes();
    }).catch(() => showToast('Зураг оруулахад алдаа гарлаа (5-8MB-аас бага зурган файл сонгоно уу)'));
  }
  function removeProjectImage(idx) {
    addProjectState.images.splice(idx, 1);
    document.getElementById('npImageGrid').innerHTML = renderProjectImageBoxes();
  }

  function handleSitePlanUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    compressImageFile(file, 900, 0.85).then(dataUrl => {
      saveProjectStepData(3);
      addProjectState.sitePlan = dataUrl;
      document.getElementById('modalContent').innerHTML = renderAddProject();
      setTimeout(attachAddProjectHandlers, 50);
    }).catch(() => showToast('Зураг оруулахад алдаа гарлаа'));
  }
  function clearSitePlan() {
    saveProjectStepData(3);
    addProjectState.sitePlan = null;
    document.getElementById('modalContent').innerHTML = renderAddProject();
    setTimeout(attachAddProjectHandlers, 50);
  }

  function handleProjectFloorPlanUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    compressImageFile(file, 900, 0.85).then(dataUrl => {
      saveProjectStepData(3);
      addProjectState.floorPlans.push(dataUrl);
      document.getElementById('modalContent').innerHTML = renderAddProject();
      setTimeout(attachAddProjectHandlers, 50);
    }).catch(() => showToast('Зураг оруулахад алдаа гарлаа'));
  }
  function removeProjectFloorPlan(idx) {
    saveProjectStepData(3);
    addProjectState.floorPlans.splice(idx, 1);
    document.getElementById('modalContent').innerHTML = renderAddProject();
    setTimeout(attachAddProjectHandlers, 50);
  }

  function attachAddProjectHandlers() {
    document.querySelectorAll('.toggle-row[data-unittype]').forEach(t => {
      const type = t.dataset.unittype;
      if (addProjectState.unitTypes.includes(type)) t.classList.add('on');
      t.addEventListener('click', () => {
        t.classList.toggle('on');
        if (t.classList.contains('on')) {
          if (!addProjectState.unitTypes.includes(type)) addProjectState.unitTypes.push(type);
        } else {
          addProjectState.unitTypes = addProjectState.unitTypes.filter(x => x !== type);
        }
      });
    });
    const phoneEl = document.getElementById('npPhone');
    if (phoneEl) {
      phoneEl.addEventListener('input', () => {
        phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 8);
      });
    }
  }

  function nextProjectStep(currentStep) {
    if (!validateProjectStep(currentStep)) return;
    saveProjectStepData(currentStep);
    addProjectState.step = currentStep + 1;
    document.getElementById('modalContent').innerHTML = renderAddProject();
    document.querySelector('.modal')?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(attachAddProjectHandlers, 50);
  }
  function prevProjectStep(currentStep) {
    saveProjectStepData(currentStep);
    addProjectState.step = currentStep - 1;
    document.getElementById('modalContent').innerHTML = renderAddProject();
    setTimeout(attachAddProjectHandlers, 50);
  }

  function saveProjectStepData(step) {
    if (step === 1) {
      addProjectState.company = document.getElementById('npCompany')?.value || '';
      addProjectState.projectName = document.getElementById('npProjectName')?.value || '';
      addProjectState.district = document.getElementById('npDistrict')?.value || '';
      addProjectState.khoroo = document.getElementById('npKhoroo')?.value || '';
      addProjectState.address = document.getElementById('npAddress')?.value || '';
      addProjectState.completionDate = document.getElementById('npCompletionDate')?.value || '';
    }
    if (step === 2) {
      addProjectState.pricePerSqm = document.getElementById('npPricePerSqm')?.value || '';
      addProjectState.unitsRemaining = document.getElementById('npUnitsRemaining')?.value || '';
      addProjectState.paymentTerms = document.getElementById('npPaymentTerms')?.value || '';
      addProjectState.mortgage = document.getElementById('npMortgage')?.value || '';
    }
    if (step === 3) {
      addProjectState.tour3d = document.getElementById('npTour3d')?.value || '';
      addProjectState.tourUrl = document.getElementById('npTourUrl')?.value || '';
      addProjectState.phone = document.getElementById('npPhone')?.value || '';
      addProjectState.contactName = document.getElementById('npContactName')?.value || '';
    }
  }

  function focusFirstInvalidProject() {
    const el = document.querySelector('.form-input.err, .form-select.err, .form-textarea.err');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }

  function validateProjectStep(step) {
    document.querySelectorAll('.form-input.err, .form-select.err, .form-textarea.err').forEach(el => el.classList.remove('err'));
    if (step === 1) {
      let ok = true;
      const company = document.getElementById('npCompany');
      const projectName = document.getElementById('npProjectName');
      const district = document.getElementById('npDistrict');
      const completionDate = document.getElementById('npCompletionDate');
      if (!company.value || company.value.trim().length < 2) { company.classList.add('err'); ok = false; }
      if (!projectName.value || projectName.value.trim().length < 2) { projectName.classList.add('err'); ok = false; }
      if (!district.value) { district.classList.add('err'); ok = false; }
      if (!completionDate.value.trim()) { completionDate.classList.add('err'); ok = false; }
      if (!ok) { showToast('Бүх заавал талбарыг бөглөнө үү'); focusFirstInvalidProject(); }
      return ok;
    }
    if (step === 2) {
      let ok = true;
      const price = document.getElementById('npPricePerSqm');
      if (!price.value || parseFloat(price.value) <= 0) { price.classList.add('err'); ok = false; }
      if (!ok) { showToast('1м² үнэ оруулна уу'); focusFirstInvalidProject(); }
      return ok;
    }
    if (step === 3) {
      let ok = true;
      const phone = document.getElementById('npPhone');
      if (!phone.value || phone.value.length !== 8) { phone.classList.add('err'); ok = false; }
      if (addProjectState.images.filter(Boolean).length < 1) {
        showToast('Хамгийн багадаа 1 зураг оруулна уу');
        ok = false;
      }
      if (!ok) { showToast('Утасны дугаар (8 орон) болон зураг шаардлагатай'); focusFirstInvalidProject(); }
      return ok;
    }
    return true;
  }

  async function submitProject() {
    if (!validateProjectStep(3)) return;
    try {
      await doSubmitProject();
    } catch(e) {
      console.error('submitProject failed:', e);
      showToast('Төсөл нийтлэхэд алдаа гарлаа. Дахин оролдоно уу.');
    }
  }

  async function doSubmitProject() {
    saveProjectStepData(3);
    if (!currentUser) { showToast('Нэвтэрнэ үү'); openAuth(); return; }
    const s = addProjectState;
    const allImages = s.images.filter(Boolean);
    const fsDoc = {
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email,
      company: s.company.trim(),
      projectName: s.projectName.trim(),
      district: s.district,
      khoroo: s.khoroo ? parseInt(s.khoroo, 10) : null,
      address: s.address.trim(),
      completionDate: s.completionDate.trim(),
      pricePerSqm: parseFloat(s.pricePerSqm) || 0,
      unitTypes: s.unitTypes.slice(),
      unitsRemaining: s.unitsRemaining !== '' ? parseInt(s.unitsRemaining, 10) : null,
      paymentTerms: s.paymentTerms.trim(),
      mortgage: s.mortgage.trim(),
      images: allImages,
      img: allImages[0] || '',
      sitePlan: s.sitePlan || null,
      floorPlans: s.floorPlans.slice(),
      tour3d: (s.tour3d && videoEmbedUrl(s.tour3d)) ? s.tour3d.trim() : '',
      tourUrl: (s.tourUrl && safeEmbedUrl(s.tourUrl)) ? s.tourUrl.trim() : '',
      phone: s.phone.trim(),
      contactName: s.contactName.trim(),
      status: 'active',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Firestore documents cap out around 1MiB — a project can carry far more base64
    // images than a single listing (cover gallery + site plan + floor plans), so trim
    // progressively rather than letting the write silently fail.
    if (JSON.stringify(fsDoc).length > 900000) fsDoc.floorPlans = fsDoc.floorPlans.slice(0, 1);
    if (JSON.stringify(fsDoc).length > 900000) fsDoc.floorPlans = [];
    if (JSON.stringify(fsDoc).length > 900000) fsDoc.sitePlan = null;
    if (JSON.stringify(fsDoc).length > 900000) fsDoc.images = allImages.slice(0, 1);

    try {
      if (editingProjectId) {
        await db.collection('projects').doc(editingProjectId).update(fsDoc);
        const idx = projects.findIndex(x => x.id === editingProjectId);
        if (idx > -1) projects[idx] = Object.assign({}, projects[idx], fsDoc, { id: editingProjectId });
      } else {
        fsDoc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        fsDoc.viewCount = 0; fsDoc.contactCount = 0;
        const docRef = await db.collection('projects').add(fsDoc);
        projects.unshift(Object.assign({}, fsDoc, { id: docRef.id, createdAt: { toMillis: () => Date.now() } }));
      }
    } catch(e) {
      console.error('Project Firestore save failed:', e.code, e.message);
      const reason = e.code === 'permission-denied'
        ? ' (зөвшөөрөл татгалзагдлаа — Firestore Rules Publish хийгдээгүй байж болзошгүй)'
        : (e.code ? ' (' + e.code + ')' : '');
      showToast('Төсөл нийтлэхэд алдаа гарлаа' + reason);
      return;
    }

    populateNewdevFilterOptions();
    renderProjectsGrid();
    addProjectState.step = 4;
    document.getElementById('modalContent').innerHTML = renderAddProject();
  }
