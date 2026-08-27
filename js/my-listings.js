  // ===== ADD LISTING FORM =====
  // Full unegui.mn-style property type list. Each type maps to one of the 4 filterable
  // buckets (apartment/house/land/office) so search/filter pills stay unchanged — the
  // specific type name is still stored and shown, just grouped under a bucket for filtering.
  const PROPERTY_TYPES = [
    { id: 'apartment', name: 'Орон сууц', desc: 'Байр, апартмент', bucket: 'apartment',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M8 10h.01M8 14h.01M12 6h.01M12 10h.01M12 14h.01M16 6h.01M16 10h.01M16 14h.01"/></svg>' },
    { id: 'new-apartment', name: 'Шинэ байр', desc: 'Шинэ төсөл, ашиглалтад ороогүй', bucket: 'apartment',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 9h6M9 13h6M9 17h6"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/></svg>' },
    { id: 'house', name: 'Хувийн сууц', desc: 'Хаус, тагт орон сууц', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12l9-9 9 9M5 10v11h14V10"/></svg>' },
    { id: 'ger', name: 'Монгол гэр', desc: 'Гэр, хашаатай', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 6v12H4V9l8-6z"/><path d="M12 3v18M4 13h16"/></svg>' },
    { id: 'yard-house', name: 'Хашаа байшин', desc: 'Хашаатай байшин', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="10" width="18" height="11" rx="1"/><path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
    { id: 'land', name: 'Газар', desc: 'Эзэмшил, барилгын', bucket: 'land',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M3 21l6-12 4 6 4-8 4 14"/></svg>' },
    { id: 'office', name: 'Оффис', desc: 'Захиргаа, ажлын байр', bucket: 'office',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/></svg>' },
    { id: 'commercial', name: 'Худалдаа, үйлчилгээ', desc: 'Дэлгүүр, үйлчилгээний талбай', bucket: 'office',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l1-5h16l1 5M4 9h16v11H4z"/><path d="M9 20v-6h6v6"/></svg>' },
    { id: 'warehouse', name: 'Үйлдвэр, агуулах', desc: 'Агуулах, объект', bucket: 'office',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20V9l10-6 10 6v11H2z"/><path d="M2 9l10 6 10-6"/></svg>' },
    { id: 'garage', name: 'Гараж, контейнер', desc: 'Гараж, з-сууц', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21V9l9-6 9 6v12"/><path d="M5 21v-8h14v8"/></svg>' },
    { id: 'cottage', name: 'АОС, зуслан', desc: 'Хаус, амралтын газар', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V11L12 4l8 7v10"/><path d="M9 21v-6h6v6"/></svg>' },
    { id: 'basement', name: '00-н өрөө, подвал', desc: 'В1, доод давхар', bucket: 'apartment',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 15h16"/></svg>' },
    { id: 'dorm', name: 'Нийтийн байр', desc: 'Дотуур байр', bucket: 'apartment',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h6M3 15h6M15 9h6M15 15h6"/></svg>' },
    { id: 'meeting-room', name: 'Хурлын өрөө, заал', desc: 'Хурал, арга хэмжээний танхим', bucket: 'office',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="12" cy="12" r="4"/></svg>' },
    { id: 'daily', name: 'Хоногоор байр', desc: 'Хоног/цагаар түрээслэх', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
    { id: 'hostel', name: 'Hostel', desc: 'Хостел', bucket: 'apartment',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 18h18M6 9V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/></svg>' },
    { id: 'other', name: 'Бусад', desc: 'Дээрхэд ороогүй', bucket: 'house',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' }
  ];
  function propertyTypeBucket(id) {
    return (PROPERTY_TYPES.find(t => t.id === id) || {}).bucket || 'apartment';
  }

  // Approximate real-world district centers (Улаанбаатар), used to center the location
  // picker map before the user places their own exact pin.
  const DISTRICT_CENTERS = {
    'khan-uul': [47.8864, 106.9057], 'sukhbaatar': [47.9184, 106.9177],
    'chingeltei': [47.9280, 106.8935], 'bayanzurkh': [47.9203, 106.9556],
    'bayangol': [47.9077, 106.8600], 'songinokhairkhan': [47.9298, 106.7600],
    'nalaikh': [47.7725, 107.2506], 'bagakhangai': [47.5497, 106.7644],
    'baganuur': [47.8093, 108.3722]
  };
  const UB_CENTER = [47.9184, 106.9177];

  let editingListingId = null;

  function editMyListing(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    editingListingId = id;
    const districtKeys = {
      'Хан-Уул': 'khan-uul', 'Сүхбаатар': 'sukhbaatar', 'Чингэлтэй': 'chingeltei',
      'Баянзүрх': 'bayanzurkh', 'Баянгол': 'bayangol', 'Сонгинохайрхан': 'songinokhairkhan',
      'Налайх': 'nalaikh', 'Багахангай': 'bagakhangai', 'Багануур': 'baganuur'
    };
    // Land's "Барилгын насжилт" field is repurposed to hold the ownership type instead
    // (see doSubmitListing) — reverse-map its saved label back to the select's key,
    // the same way districtKeys reverses the saved district label above.
    const ownershipKeys = { 'Өмчлөлийн гэрчилгээтэй': 'owned', 'Эзэмших эрхтэй': 'possession', 'Ашиглах эрхтэй': 'usage' };
    const isLandEdit = (l.propertyType || (l.cat === 'rent' ? 'apartment' : l.cat)) === 'land';
    Object.assign(addListingState, {
      step: 2,
      intent: l.cat === 'rent' ? 'rent' : (l.barterOk ? 'exchange' : 'sell'),
      propertyType: l.propertyType || (l.cat === 'rent' ? 'apartment' : l.cat),
      title: l.title,
      district: districtKeys[l.district] || l.district,
      khoroo: l.khoroo ? String(l.khoroo) : '',
      address: l.loc,
      geoLat: l.geoLat || null,
      geoLng: l.geoLng || null,
      area: String(l.area),
      rooms: String(l.rooms),
      bedrooms: l.bedrooms ? String(l.bedrooms) : '',
      bathrooms: l.bathrooms ? String(l.bathrooms) : '',
      floor: (l.floor || '').split('/')[0] || '',
      totalFloors: (l.floor || '').split('/')[1] || '',
      year: isLandEdit ? (ownershipKeys[l.ownership] || '') : String(l.year),
      buildingName: l.buildingName || '',
      complex: l.complex || '',
      landArea: l.landArea ? String(l.landArea) : '',
      price: String(l.price),
      buildingType: l.buildingType || '',
      heating: l.heating || '',
      insulationType: l.insulationType || '',
      windowDirection: l.windowDirection || '',
      hoaFee: l.hoaFee ? String(l.hoaFee) : '',
      condition: l.condition || '',
      usageType: l.usageType || '',
      deposit: l.deposit ? String(l.deposit) : '',
      minTerm: l.minTerm || '',
      constructionProgress: l.constructionProgress || '',
      description: l.description || '',
      features: Array.isArray(l.features) ? l.features.slice() : [],
      paymentTerms: Array.isArray(l.paymentTerms) ? l.paymentTerms.slice() : [],
      // Every existing photo already has a real URL (Storage, or a legacy base64 string
      // from before this fix) — mark it 'uploaded' with nothing to (re)upload, so the
      // grid renders it immediately and retryImageUpload correctly no-ops on it.
      images: (listingExtras[l.id]?.gallery || (l.img ? [l.img] : [])).map(url => ({
        id: ++imgSeq, url, previewUrl: url, status: 'uploaded', localDataUrl: '', localOnly: false, error: ''
      })),
      videoUrl: l.videoUrl || '',
      tourUrl: l.tourUrl || '',
      floorPlan: l.floorPlan || null,
      // Contact info lives on the separate sellerData lookup (like on every other listing
      // card), not on `l` itself — leaving these blank forced a full phone/name re-entry
      // (and a blocked "8-digit phone required" validation) on every edit, even one that
      // never touched the contact step.
      phone: sellerData[l.id]?.phone || '',
      name: sellerData[l.id]?.name || '',
      role: sellerData[l.id]?.type === 'Агент' ? 'agent' : (sellerData[l.id]?.type === 'Компани' ? 'company' : 'owner')
    });
    document.getElementById('modalContent').innerHTML = renderAddListing();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(attachAddListingHandlers, 50);
  }

  let addListingState = {
    step: 1,
    // Step 1
    intent: 'sell', // sell, rent, exchange
    propertyType: '', // apartment, house, land, office
    // Step 2 - basic info
    title: '',
    district: '',
    khoroo: '',
    address: '',
    geoLat: null,
    geoLng: null,
    area: '',
    rooms: '',
    bedrooms: '',
    bathrooms: '',
    floor: '',
    totalFloors: '',
    year: '',
    buildingName: '',
    complex: '',
    landArea: '', // house only — yard/lot size, distinct from the dwelling's own area
    // Step 3 - details
    price: '',
    buildingType: '',
    heating: '',
    insulationType: '',
    windowDirection: '',
    hoaFee: '',
    condition: '',
    usageType: '', // office only — occupancy/readiness status
    deposit: '',
    minTerm: '',
    constructionProgress: '', // '', 'completed', 'under-construction', 'presale'
    description: '',
    features: [],
    paymentTerms: [], // subset of 'leasing'/'loan'/'cash' — barter uses the separate intent==='exchange' flag below
    // Step 4 - images
    images: [],
    videoUrl: '',
    tourUrl: '',
    floorPlan: null,
    // Step 5 - contact
    phone: '',
    name: '',
    role: 'owner', // owner, agent, company
    plan: 'basic' // basic, vip, featured
  };

  function openAddListing() {
    // Closed brokerage system: only an approved agent (or admin/owner) may open this form —
    // enforced for real by firestore.rules' listings/{listingId} create rule (isApprovedAgent()),
    // this is the defense-in-depth UI gate so a stray/missed CTA can't even open it.
    if (!currentUser) { openAuth(); return; }
    if (typeof isApprovedAgent === 'function' && !isApprovedAgent(currentUser)) {
      showToast('Зөвхөн зөвшөөрөгдсөн Agent эрхтэй хэрэглэгч зар нэмэх боломжтой');
      return;
    }
    addListingState.step = 1;
    // Default the "Та хэн вэ?" role to the account's saved identity (Миний тохиргоо) so
    // it stays consistent across listings instead of resetting to "owner" every time —
    // still overridable per listing in Step 6.
    if (currentUser?.accountType) addListingState.role = currentUser.accountType;
    restoreDraftIfPresent();
    document.getElementById('modalContent').innerHTML = renderAddListing();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(attachAddListingHandlers, 50);
  }

  // ===== DRAFT PERSISTENCE =====
  // Protects against an accidental refresh/back-navigation losing everything typed so
  // far — every text/selection field in addListingState (never the in-progress images:
  // File/Blob objects and blob: preview URLs can't survive JSON.stringify or a reload in
  // any useful way, so a restored draft always starts step 4's photos from scratch, same
  // as this app's honest "local-only" language elsewhere rather than pretending uploads
  // can resume). Only for a fresh listing — editMyListing() already restores the real
  // saved data for an edit, and saving a fresh-listing draft mid-edit would leak one
  // listing's data into the next new listing someone starts.
  const AL_DRAFT_KEY = 'bairxAddListingDraft';
  function saveDraftToStorage() {
    if (editingListingId) return;
    try {
      const { images, ...rest } = addListingState;
      localStorage.setItem(AL_DRAFT_KEY, JSON.stringify(rest));
    } catch (e) {}
  }
  function clearDraftStorage() {
    try { localStorage.removeItem(AL_DRAFT_KEY); } catch (e) {}
  }
  function restoreDraftIfPresent() {
    if (editingListingId) return;
    let draft;
    try { draft = JSON.parse(localStorage.getItem(AL_DRAFT_KEY) || 'null'); } catch (e) { draft = null; }
    // A draft is only worth restoring once the user actually got somewhere — step 1 alone
    // (just an intent/type pick, or nothing at all) isn't worth a "continued" toast for.
    if (!draft || !draft.step || draft.step < 2) return;
    Object.assign(addListingState, draft, { images: [] });
    showToast('Өмнөх ноорог сэргээгдлээ — зургаа дахин оруулна уу', 'success');
  }

  function renderAddListing() {
    return `
      <button class="modal-close" onclick="confirmCloseAddListing()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="add-listing">
        <div class="al-header">
          <span class="al-eyebrow">Шинэ зар нийтлэх</span>
          <div class="al-title">Үл хөдлөх хөрөнгөө TP Property дээр зарлаарай</div>
          <div class="al-sub">Бүх алхамыг бөглөж дуусгахад ойролцоогоор 4-6 минут зарцуулагдана.</div>
        </div>

        <!-- Stepper — full pill row on desktop; a compact "Алхам X/7" + progress bar on
             mobile (see .al-stepper-mobile CSS) so 7 steps never needs to scroll or wrap. -->
        <div class="stepper">
          ${AL_STEPS.map(s => `
            <div class="step ${addListingState.step === s.n ? 'active' : ''} ${addListingState.step > s.n ? 'done' : ''}">
              <div class="step-num">${addListingState.step > s.n ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : s.n}</div>
              <span class="step-name">${s.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="al-stepper-mobile">
          <div class="al-stepper-mobile-label">Алхам ${addListingState.step} / ${AL_STEPS.length} — ${(AL_STEPS.find(s => s.n === addListingState.step) || {}).name || ''}</div>
          <div class="al-stepper-mobile-bar"><div class="al-stepper-mobile-fill" style="width:${(Math.min(addListingState.step, AL_STEPS.length) / AL_STEPS.length) * 100}%;"></div></div>
        </div>

        ${renderStep1()}
        ${renderStep2()}
        ${renderStep3()}
        ${renderStep4()}
        ${renderStep5()}
        ${renderStep6()}
        ${renderStep7()}
        ${renderSuccess()}
      </div>
    `;
  }

  const AL_STEPS = [
    { n: 1, name: 'Ангилал' },
    { n: 2, name: 'Мэдээлэл' },
    { n: 3, name: 'Нэмэлт' },
    { n: 4, name: 'Зураг' },
    { n: 5, name: 'Тайлбар' },
    { n: 6, name: 'Холбоо барих' },
    { n: 7, name: 'Урьдчилан харах' }
  ];

  function renderStep1() {
    const active = addListingState.step === 1;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="1">
        <div class="step-section-title">Зарын зорилго</div>
        <div class="step-section-sub">Та юу хийхийг хүсэж байна вэ?</div>

        <div class="intent-grid" style="margin-bottom:28px;">
          <button class="intent-card ${addListingState.intent === 'sell' ? 'active' : ''}" data-intent="sell">
            <div class="intent-card-name">Худалдах</div>
            <div class="intent-card-desc">Үл хөдлөх хөрөнгөө бүрэн зарж борлуулах</div>
          </button>
          <button class="intent-card ${addListingState.intent === 'rent' ? 'active' : ''}" data-intent="rent">
            <div class="intent-card-name">Түрээслүүлэх</div>
            <div class="intent-card-desc">Сар, жилийн түрээсээр гаргах</div>
          </button>
          <button class="intent-card ${addListingState.intent === 'exchange' ? 'active' : ''}" data-intent="exchange">
            <div class="intent-card-name">Солилцох / Бартер</div>
            <div class="intent-card-desc">Өөр үл хөдлөх хөрөнгөөр солих</div>
          </button>
        </div>

        <div class="step-section-title">Үл хөдлөх хөрөнгийн төрөл</div>
        <div class="step-section-sub">Зөв ангилал нь зөв хайлтын үр дүнг авчирна</div>

        <div class="type-grid">
          ${PROPERTY_TYPES.map(t => `
            <button class="type-card ${addListingState.propertyType === t.id ? 'active' : ''}" data-type="${t.id}">
              <div class="type-card-icon">${t.icon}</div>
              <div class="type-card-name">${t.name}</div>
              <div class="type-card-desc">${t.desc}</div>
            </button>
          `).join('')}
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="closeModal()">Цуцлах</button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(1)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Which field set a property type shows, per category: apartment / new-apartment
  // (a pre-completion project, so no condition/heating/building-type — those don't
  // apply to a unit that hasn't been finished or lived in yet) / house / land / office.
  function listingFieldGroup() {
    if (addListingState.propertyType === 'land') return 'land';
    if (addListingState.propertyType === 'new-apartment') return 'new-apartment';
    const bucket = propertyTypeBucket(addListingState.propertyType);
    if (bucket === 'office') return 'office';
    if (bucket === 'house') return 'house';
    return 'apartment';
  }

  function renderStep2() {
    const active = addListingState.step === 2;
    const fieldGroup = listingFieldGroup();
    const isLand = fieldGroup === 'land';
    const isOffice = fieldGroup === 'office';
    const isHouse = fieldGroup === 'house';
    const isNewApt = fieldGroup === 'new-apartment';
    const isApt = fieldGroup === 'apartment' || isNewApt;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="2">
        <div class="step-section-title">Үндсэн мэдээлэл</div>
        <div class="step-section-sub">Зар үзэгчдэд хамгийн чухал суурь мэдээлэл</div>

        <div class="form-row">
          <label class="form-label">Зарын гарчиг<span class="req">*</span> <span class="hint">— богино, ойлгомжтой</span></label>
          <input type="text" class="form-input" id="alTitle" placeholder="Жнь: Зайсан, шинэ барилга 2 өрөө, засвартай" value="${addListingState.title}" maxlength="80" />
          <div class="form-err-msg">Гарчгийг бөглөнө үү (10-аас доошгүй тэмдэгт)</div>
        </div>

        <div class="step-section-title" style="margin-top:28px;">Байршил</div>
        <div class="step-section-sub">Хаана байрлаж байгааг тодорхойлно уу</div>

        <div class="form-grid-2">
          <div>
            <label class="form-label">Дүүрэг<span class="req">*</span></label>
            <select class="form-select" id="alDistrict">
              <option value="">Сонгох...</option>
              <option value="khan-uul" ${addListingState.district === 'khan-uul' ? 'selected' : ''}>Хан-Уул</option>
              <option value="sukhbaatar" ${addListingState.district === 'sukhbaatar' ? 'selected' : ''}>Сүхбаатар</option>
              <option value="chingeltei" ${addListingState.district === 'chingeltei' ? 'selected' : ''}>Чингэлтэй</option>
              <option value="bayanzurkh" ${addListingState.district === 'bayanzurkh' ? 'selected' : ''}>Баянзүрх</option>
              <option value="bayangol" ${addListingState.district === 'bayangol' ? 'selected' : ''}>Баянгол</option>
              <option value="songinokhairkhan" ${addListingState.district === 'songinokhairkhan' ? 'selected' : ''}>Сонгинохайрхан</option>
              <option value="nalaikh" ${addListingState.district === 'nalaikh' ? 'selected' : ''}>Налайх</option>
              <option value="bagakhangai" ${addListingState.district === 'bagakhangai' ? 'selected' : ''}>Багахангай</option>
              <option value="baganuur" ${addListingState.district === 'baganuur' ? 'selected' : ''}>Багануур</option>
            </select>
            <div class="form-err-msg">Дүүрэг сонгоно уу</div>
          </div>
          <div>
            <label class="form-label">Хороо</label>
            <input type="number" class="form-input" id="alKhoroo" placeholder="Жнь: 11" min="1" max="50" value="${addListingState.khoroo}" />
          </div>
        </div>

        ${!isLand ? `
        <div class="form-grid-2">
          <div>
            <label class="form-label">Барилгын нэр <span class="hint">— заавал биш</span></label>
            <input type="text" class="form-input" id="alBuildingName" placeholder="Жнь: Хүннү 2222" value="${addListingState.buildingName}" />
          </div>
          <div>
            <label class="form-label">${isNewApt ? 'Төслийн нэр' : 'Хотхон'}</label>
            <input type="text" class="form-input" id="alComplex" placeholder="${isNewApt ? 'Жнь: Зайсан Тольт төсөл' : 'Жнь: Зайсан Тольт'}" value="${addListingState.complex}" />
          </div>
        </div>
        ` : ''}

        <div class="form-row">
          <label class="form-label">Дэлгэрэнгүй хаяг <span class="hint">— хороолол, барилгын нэр</span></label>
          <input type="text" class="form-input" id="alAddress" placeholder="Жнь: Зайсан, Хүннү 2222 хороолол" value="${addListingState.address}" />
        </div>

        <div class="form-row">
          <label class="form-label">Байршил <span class="hint">— газрын зураг дээр тодорхой цэгээ тэмдэглэнэ үү</span></label>
          ${addListingState.geoLat ? `
            <div id="alMapPicker" style="height:220px; border-radius:12px; overflow:hidden; border:1px solid var(--line);"></div>
            <button type="button" class="btn btn-ghost" style="margin-top:8px;" onclick="clearListingLocation()">Цэгийг арилгах</button>
          ` : `
            <button type="button" class="btn btn-ghost" style="width:100%; justify-content:center; border:1.5px solid var(--line-2);" onclick="openListingMapPicker()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Газрын зураг дээр байршил тэмдэглэх
            </button>
          `}
        </div>

        <div class="step-section-title" style="margin-top:28px;">Үл хөдлөхийн мэдээлэл</div>
        <div class="step-section-sub">${isLand ? 'Газрын хэмжээ, зориулалт' : 'Талбай, өрөөний тоо болон бусад үндсэн үзүүлэлт'}</div>

        ${isApt ? `
        <div class="form-grid-3">
          <div>
            <label class="form-label">Талбай (м²)<span class="req">*</span></label>
            <input type="number" class="form-input" id="alArea" placeholder="78" value="${addListingState.area}" min="1" />
            <div class="form-err-msg">Талбайн хэмжээ оруулна уу</div>
          </div>
          <div>
            <label class="form-label">Өрөөний тоо<span class="req">*</span></label>
            <select class="form-select" id="alRooms">
              <option value="">Сонгох...</option>
              <option value="1" ${addListingState.rooms === '1' ? 'selected' : ''}>1 өрөө (студи)</option>
              <option value="2" ${addListingState.rooms === '2' ? 'selected' : ''}>2 өрөө</option>
              <option value="3" ${addListingState.rooms === '3' ? 'selected' : ''}>3 өрөө</option>
              <option value="4" ${addListingState.rooms === '4' ? 'selected' : ''}>4 өрөө</option>
              <option value="5" ${addListingState.rooms === '5' ? 'selected' : ''}>5 өрөө</option>
              <option value="6+" ${addListingState.rooms === '6+' ? 'selected' : ''}>6+ өрөө</option>
            </select>
            <div class="form-err-msg">Өрөөний тоо сонгоно уу</div>
          </div>
          <div>
            <label class="form-label">${isNewApt ? 'Ашиглалтад орох/орсон он' : 'Барилгын он'}</label>
            <input type="number" class="form-input" id="alYear" placeholder="2022" min="1950" max="2030" value="${addListingState.year}" />
          </div>
        </div>
        <div class="form-grid-2">
          <div>
            <label class="form-label">Хэддүгээр давхар</label>
            <input type="number" class="form-input" id="alFloor" placeholder="5" min="1" max="50" value="${addListingState.floor}" />
          </div>
          <div>
            <label class="form-label">Нийт давхар</label>
            <input type="number" class="form-input" id="alTotalFloors" placeholder="12" min="1" max="50" value="${addListingState.totalFloors}" />
          </div>
        </div>
        ` : ''}

        ${isHouse ? `
        <div class="form-grid-3">
          <div>
            <label class="form-label">Байшингийн талбай (м²)<span class="req">*</span></label>
            <input type="number" class="form-input" id="alArea" placeholder="120" value="${addListingState.area}" min="1" />
            <div class="form-err-msg">Талбайн хэмжээ оруулна уу</div>
          </div>
          <div>
            <label class="form-label">Өрөөний тоо<span class="req">*</span></label>
            <select class="form-select" id="alRooms">
              <option value="">Сонгох...</option>
              <option value="1" ${addListingState.rooms === '1' ? 'selected' : ''}>1 өрөө</option>
              <option value="2" ${addListingState.rooms === '2' ? 'selected' : ''}>2 өрөө</option>
              <option value="3" ${addListingState.rooms === '3' ? 'selected' : ''}>3 өрөө</option>
              <option value="4" ${addListingState.rooms === '4' ? 'selected' : ''}>4 өрөө</option>
              <option value="5" ${addListingState.rooms === '5' ? 'selected' : ''}>5 өрөө</option>
              <option value="6+" ${addListingState.rooms === '6+' ? 'selected' : ''}>6+ өрөө</option>
            </select>
            <div class="form-err-msg">Өрөөний тоо сонгоно уу</div>
          </div>
          <div>
            <label class="form-label">Газрын хэмжээ (м²) <span class="hint">— заавал биш</span></label>
            <input type="number" class="form-input" id="alLandArea" placeholder="Жнь: 400" min="0" value="${addListingState.landArea}" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Давхарын тоо</label>
          <input type="number" class="form-input" id="alFloor" placeholder="2" min="1" max="10" value="${addListingState.floor}" />
        </div>
        ` : ''}

        ${isLand ? `
        <div class="form-row">
          <label class="form-label">Газрын хэмжээ (м²)<span class="req">*</span></label>
          <input type="number" class="form-input" id="alArea" placeholder="600" value="${addListingState.area}" min="1" />
          <div class="form-err-msg">Талбайн хэмжээ оруулна уу</div>
        </div>
        <div class="form-row">
          <label class="form-label">Зориулалт<span class="req">*</span></label>
          <select class="form-select" id="alRooms">
            <option value="">Сонгох...</option>
            <option value="residential" ${addListingState.rooms === 'residential' ? 'selected' : ''}>Орон сууцны</option>
            <option value="commercial" ${addListingState.rooms === 'commercial' ? 'selected' : ''}>Худалдаа үйлчилгээний</option>
            <option value="industrial" ${addListingState.rooms === 'industrial' ? 'selected' : ''}>Үйлдвэрлэлийн</option>
            <option value="agricultural" ${addListingState.rooms === 'agricultural' ? 'selected' : ''}>Хөдөө аж ахуйн</option>
          </select>
          <div class="form-err-msg">Зориулалт сонгоно уу</div>
        </div>
        <div class="form-row">
          <label class="form-label">Өмчлөх/эзэмших</label>
          <select class="form-select" id="alYear">
            <option value="">Сонгох...</option>
            <option value="owned" ${addListingState.year === 'owned' ? 'selected' : ''}>Өмчлөлийн гэрчилгээтэй</option>
            <option value="possession" ${addListingState.year === 'possession' ? 'selected' : ''}>Эзэмших эрхтэй</option>
            <option value="usage" ${addListingState.year === 'usage' ? 'selected' : ''}>Ашиглах эрхтэй</option>
          </select>
        </div>
        ` : ''}

        ${isOffice ? `
        <div class="form-row">
          <label class="form-label">Талбай (м²)<span class="req">*</span></label>
          <input type="number" class="form-input" id="alArea" placeholder="150" value="${addListingState.area}" min="1" />
          <div class="form-err-msg">Талбайн хэмжээ оруулна уу</div>
        </div>
        <div class="form-row">
          <label class="form-label">Давхар</label>
          <input type="number" class="form-input" id="alFloor" placeholder="3" min="1" max="50" value="${addListingState.floor}" />
        </div>
        ` : ''}

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(2)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(2)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // ===== LOCATION PICKER (real Leaflet/OpenStreetMap — no API key needed) =====
  let listingPickerMap = null;
  let listingPickerMarker = null;
  let listingPreviewMap = null;

  function openListingMapPicker() {
    saveStepData(2);
    const start = (addListingState.geoLat && addListingState.geoLng)
      ? [addListingState.geoLat, addListingState.geoLng]
      : (DISTRICT_CENTERS[addListingState.district] || UB_CENTER);
    document.getElementById('modalContent').innerHTML = `
      <div style="padding:0;">
        <div style="display:flex; align-items:center; gap:12px; padding:20px 24px 12px;">
          <button class="btn btn-ghost" onclick="document.getElementById('modalContent').innerHTML = renderAddListing(); setTimeout(attachAddListingHandlers, 50);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div style="font-weight:700; font-size:16px;">Байршил</div>
        </div>
        <div id="alMapPickerFull" style="height:60vh; min-height:320px;"></div>
        <div style="padding:16px 24px;">
          <div style="font-size:12px; color:var(--ink-3); margin-bottom:12px;">Газрын зураг дээр товшиж эсвэл цэгийг чирж яг байршлаа тэмдэглэнэ үү.</div>
          <button class="btn btn-blue btn-lg" style="width:100%; justify-content:center;" onclick="saveListingLocation()">Газрын зураг дээр байршлыг хадгалах</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      listingPickerMap = L.map('alMapPickerFull').setView(start, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      }).addTo(listingPickerMap);
      listingPickerMarker = L.marker(start, { draggable: true }).addTo(listingPickerMap);
      listingPickerMap.on('click', (e) => listingPickerMarker.setLatLng(e.latlng));
    }, 50);
  }

  function saveListingLocation() {
    if (!listingPickerMarker) return;
    const pos = listingPickerMarker.getLatLng();
    addListingState.geoLat = pos.lat;
    addListingState.geoLng = pos.lng;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    setTimeout(attachAddListingHandlers, 50);
  }

  function clearListingLocation() {
    addListingState.geoLat = null;
    addListingState.geoLng = null;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    setTimeout(attachAddListingHandlers, 50);
  }

  // Small read-only preview map shown on step 2 once a location pin has been saved.
  function initListingLocationPreview() {
    const el = document.getElementById('alMapPicker');
    if (!el || !addListingState.geoLat) return;
    if (listingPreviewMap) { listingPreviewMap.remove(); listingPreviewMap = null; }
    const pos = [addListingState.geoLat, addListingState.geoLng];
    listingPreviewMap = L.map('alMapPicker', { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView(pos, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(listingPreviewMap);
    L.marker(pos).addTo(listingPreviewMap);
  }

  function renderStep3() {
    const active = addListingState.step === 3;
    const fieldGroup = listingFieldGroup();
    const isLand = fieldGroup === 'land';
    const isOffice = fieldGroup === 'office';
    const isHouse = fieldGroup === 'house';
    const isNewApt = fieldGroup === 'new-apartment';
    const isApt = fieldGroup === 'apartment';

    // Which chip-buttons render for a given single-choice select, backed by a hidden
    // input (id === forId) so saveStepData/validateStep keep reading it exactly like
    // a native <select> — see the .chip-select handler in attachAddListingHandlers.
    function chipSelect(forId, value, options) {
      return `
        <div class="chip-select" data-for="${forId}">
          <input type="hidden" id="${forId}" value="${value}" />
          ${options.map(([v, label]) => `
            <button type="button" class="chip-option ${value === v ? 'active' : ''}" data-value="${v}">${label}</button>
          `).join('')}
        </div>
      `;
    }

    const featureDefs = {
      apartment: [['parking', 'Паркинг бий'], ['elevator', 'Лифттэй'], ['balcony', 'Тагттай'], ['basement', 'Зоорьтой'], ['furnished', 'Тавилгатай']],
      'new-apartment': [['parking', 'Паркинг'], ['elevator', 'Лифт'], ['balcony', 'Тагт']],
      house: [['garage', 'Гараж'], ['yard', 'Хашаа'], ['water', 'Ус'], ['sewage', 'Цэвэр/бохир ус']],
      land: [['electricity', 'Тог'], ['water', 'Ус'], ['road', 'Зам']],
      office: [['parking', 'Паркинг'], ['elevator', 'Лифт']]
    };
    const chipFeatures = [
      ...(featureDefs[fieldGroup] || []),
      ...(isLand ? [] : [['loan', 'Банкны зээлд хамрагдана']]),
      ['negotiable', 'Үнэ хэлэлцэх боломжтой']
    ];

    const hasMore = isApt || isNewApt || isHouse;

    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="3">
        <div class="step-section-title">Үнэ</div>
        <div class="step-section-sub">Зарын үнийн дүн</div>

        <div class="form-row">
          <label class="form-label">Үнэ (сая ₮)<span class="req">*</span></label>
          <input type="number" class="form-input" id="alPrice" placeholder="Жнь: 412" min="1" step="0.5" value="${addListingState.price}" />
          <div class="form-err-msg">Үнэ оруулна уу</div>
          <div id="pricePerSqmBox" style="margin-top:8px;"></div>
          <div id="priceSuggestBox"></div>
        </div>

        ${isApt ? `
        <div class="step-section-title" style="margin-top:28px;">Барилгын чанар</div>
        <div class="step-section-sub">Хийц, халаалт, засварын байдал</div>
        <div class="form-row">
          <label class="form-label">Барилгын төрөл</label>
          <select class="form-select" id="alBuildingType">
            <option value="">Сонгох...</option>
            <option value="reinforced-concrete">Цутгамал төмөр бетон</option>
            <option value="brick">Хийц өрлөгийн (керамзитбетон)</option>
            <option value="panel">Угсармал панель</option>
            <option value="frame">Каркасан хийц</option>
            <option value="wooden">Модон</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Халаалт</label>
          ${chipSelect('alHeating', addListingState.heating, [
            ['central', 'Төвлөрсөн халаалт'], ['gas', 'Хийн зуух'], ['electric', 'Цахилгаан халаагуур'],
            ['solid', 'Хатуу түлшний'], ['floor', 'Шалны халаалт']
          ])}
        </div>
        <div class="form-row">
          <label class="form-label">Засварын байдал</label>
          ${chipSelect('alCondition', addListingState.condition, [
            ['white-box', 'Засваргүй'], ['basic', 'Энгийн засвартай'], ['renovated', 'Үндсэн засвартай'],
            ['premium', 'Premium засвартай'], ['furnished', 'Тавилгатай, бүрэн засвартай']
          ])}
        </div>
        ` : ''}

        ${isHouse ? `
        <div class="step-section-title" style="margin-top:28px;">Барилгын чанар</div>
        <div class="step-section-sub">Халаалтын төрөл</div>
        <div class="form-row">
          <label class="form-label">Халаалт</label>
          ${chipSelect('alHeating', addListingState.heating, [
            ['central', 'Төвлөрсөн халаалт'], ['gas', 'Хийн зуух'], ['electric', 'Цахилгаан халаагуур'], ['solid', 'Хатуу түлшний']
          ])}
        </div>
        ` : ''}

        ${isOffice ? `
        <div class="step-section-title" style="margin-top:28px;">Барилгын чанар</div>
        <div class="step-section-sub">Ашиглалтын төлөв</div>
        <div class="form-row">
          <label class="form-label">Ашиглалтын төлөв</label>
          ${chipSelect('alUsageType', addListingState.usageType, [
            ['ready', 'Ашиглалтад бэлэн'], ['leased', 'Түрээслэгдсэн'], ['renovation', 'Засвар шаардлагатай']
          ])}
        </div>
        ` : ''}

        <div class="step-section-title" style="margin-top:28px;">Нэмэлт онцлог</div>
        <div class="step-section-sub">Тохирох бүгдийг сонгоно уу</div>
        <div class="feature-chip-grid">
          ${chipFeatures.map(([id, label]) => `
            <div class="toggle-row chip ${addListingState.features.includes(id) ? 'on' : ''}" data-feature="${id}">
              <span>${label}</span>
            </div>
          `).join('')}
        </div>

        ${!isLand ? `
        <div class="step-section-title" style="margin-top:28px;">Төлбөрийн нөхцөл</div>
        <div class="step-section-sub">Худалдан авагчид санал болгож буй төлбөрийн нөхцөл (сонголттой)</div>
        <div class="feature-chip-grid">
          ${[['leasing', 'Хувь лизингээр'], ['loan', 'Банкны зээлээр'], ['cash', 'Бэлэн төлөлтөөр']].map(([id, label]) => `
            <div class="toggle-row-pt chip ${addListingState.paymentTerms.includes(id) ? 'on' : ''}" data-payment-term="${id}">
              <span>${label}</span>
            </div>
          `).join('')}
        </div>

        <div class="form-row" style="margin-top:16px;">
          <label class="form-label">Барилгын явц</label>
          <select class="form-select" id="alConstructionProgress">
            <option value="">Сонгох...</option>
            <option value="completed" ${addListingState.constructionProgress === 'completed' ? 'selected' : ''}>Ашиглалтад орсон</option>
            <option value="under-construction" ${addListingState.constructionProgress === 'under-construction' ? 'selected' : ''}>Баригдаж байгаа</option>
            <option value="presale" ${addListingState.constructionProgress === 'presale' ? 'selected' : ''}>Захиалга авч байгаа</option>
          </select>
        </div>
        ` : ''}

        ${hasMore ? `
        <details class="al-more" style="margin-top:22px;">
          <summary class="al-more-toggle">Нэмэлт мэдээлэл <span class="hint">— заавал биш</span></summary>
          <div class="al-more-body">
            <div class="form-grid-2">
              <div>
                <label class="form-label">Унтлагын өрөө</label>
                <input type="number" class="form-input" id="alBedrooms" placeholder="2" min="0" max="20" value="${addListingState.bedrooms}" />
              </div>
              <div>
                <label class="form-label">Ариун цэврийн өрөө</label>
                <input type="number" class="form-input" id="alBathrooms" placeholder="1" min="0" max="10" value="${addListingState.bathrooms}" />
              </div>
            </div>
            ${(isApt || isNewApt) ? `
            <div class="form-grid-2">
              <div>
                <label class="form-label">Цонхны чиглэл</label>
                <select class="form-select" id="alWindowDirection">
                  <option value="">Сонгох...</option>
                  <option value="north" ${addListingState.windowDirection === 'north' ? 'selected' : ''}>Хойд</option>
                  <option value="south" ${addListingState.windowDirection === 'south' ? 'selected' : ''}>Урд</option>
                  <option value="east" ${addListingState.windowDirection === 'east' ? 'selected' : ''}>Дорнод</option>
                  <option value="west" ${addListingState.windowDirection === 'west' ? 'selected' : ''}>Өрнөд</option>
                  <option value="southeast" ${addListingState.windowDirection === 'southeast' ? 'selected' : ''}>Урд-Дорнод</option>
                  <option value="southwest" ${addListingState.windowDirection === 'southwest' ? 'selected' : ''}>Урд-Өрнөд</option>
                  <option value="northeast" ${addListingState.windowDirection === 'northeast' ? 'selected' : ''}>Хойд-Дорнод</option>
                  <option value="northwest" ${addListingState.windowDirection === 'northwest' ? 'selected' : ''}>Хойд-Өрнөд</option>
                </select>
              </div>
              <div>
                <label class="form-label">Дулаалга</label>
                <select class="form-select" id="alInsulation">
                  <option value="">Сонгох...</option>
                  <option value="eps" ${addListingState.insulationType === 'eps' ? 'selected' : ''}>Гадна EPS дулаалга</option>
                  <option value="mw" ${addListingState.insulationType === 'mw' ? 'selected' : ''}>Эрдэс ноос (MW)</option>
                  <option value="pir" ${addListingState.insulationType === 'pir' ? 'selected' : ''}>PIR (шинэ стандарт)</option>
                  <option value="inside" ${addListingState.insulationType === 'inside' ? 'selected' : ''}>Дотроос хийсэн</option>
                  <option value="none" ${addListingState.insulationType === 'none' ? 'selected' : ''}>Дулаалгагүй</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">СӨХ-ийн төлбөр (₮/сар)</label>
              <input type="number" class="form-input" id="alHoaFee" placeholder="Жнь: 80000" min="0" step="1000" value="${addListingState.hoaFee}" />
            </div>
            ` : ''}
          </div>
        </details>
        ` : ''}

        ${addListingState.intent === 'rent' && !isLand ? `
        <div class="form-grid-2" style="margin-top:18px;">
          <div>
            <label class="form-label">Барьцаа/Урьдчилгаа (сая ₮)</label>
            <input type="number" class="form-input" id="alDeposit" placeholder="Жнь: 2" min="0" step="0.5" value="${addListingState.deposit}" />
          </div>
          <div>
            <label class="form-label">Хамгийн бага хугацаа</label>
            <select class="form-select" id="alMinTerm">
              <option value="">Сонгох...</option>
              <option value="1m" ${addListingState.minTerm === '1m' ? 'selected' : ''}>1 сар</option>
              <option value="3m" ${addListingState.minTerm === '3m' ? 'selected' : ''}>3 сар</option>
              <option value="6m" ${addListingState.minTerm === '6m' ? 'selected' : ''}>6 сар</option>
              <option value="1y" ${addListingState.minTerm === '1y' ? 'selected' : ''}>1 жил+</option>
            </select>
          </div>
        </div>
        ` : ''}

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(3)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(3)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderStep4() {
    const active = addListingState.step === 4;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="4">
        <div class="step-section-title">Зурагнууд</div>
        <div class="step-section-sub">Тод, чанартай 5-15 зураг оруулна уу. Эхний зураг нь үндсэн зураг болно.</div>

        <div class="image-upload-grid" id="imageGrid">
          ${renderImageBoxes()}
        </div>

        <div class="price-suggest" style="margin-top: 20px;">
          <div class="price-suggest-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          </div>
          <div>
            <strong>Чанартай зураг оруулах зөвлөмж:</strong> Гэрэл сайтай, цэвэрхэн өрөөг харуулна уу. Хамгийн багадаа дотор, гадна, гал тогоо, ванн өрөөний зургуудыг оруулна. Чанартай зурагтай зарууд 3 дахин хурдан зарагддаг.
          </div>
        </div>

        <div class="step-section-title" style="margin-top:28px;">Нэмэлт медиа <span class="hint">— заавал биш</span></div>
        <div class="step-section-sub">Байгаа бол оруулна уу — байхгүй бол хоосон орхиж болно</div>

        <div class="form-row">
          <label class="form-label">Видео холбоос <span class="hint">— YouTube эсвэл Vimeo линк</span></label>
          <input type="url" class="form-input" id="alVideoUrl" placeholder="https://youtube.com/watch?v=..." value="${addListingState.videoUrl || ''}" />
        </div>

        <div class="form-row">
          <label class="form-label">360° тойрох холбоос <span class="hint">— Matterport, Kuula гэх мэт embed линк</span></label>
          <input type="url" class="form-input" id="alTourUrl" placeholder="https://my.matterport.com/show/?m=..." value="${addListingState.tourUrl || ''}" />
        </div>

        <div class="form-row">
          <label class="form-label">Планировкын зураг (Floor plan)</label>
          ${addListingState.floorPlan ? `
            <div style="position:relative; display:inline-block;">
              <img src="${addListingState.floorPlan}" alt="" style="max-width:220px; border-radius:10px; border:1px solid var(--line); display:block;" />
              <button type="button" class="remove-img" style="position:absolute; top:6px; right:6px;" onclick="clearFloorPlan()">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ` : `
            <label class="image-upload-box" for="floorPlanInput" style="max-width:220px;">
              <input type="file" id="floorPlanInput" accept="image/*" style="display:none" onchange="handleFloorPlanUpload(event)" />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M3 9h18"/></svg>
              <div class="image-upload-text">Планировка оруулах</div>
              <div class="image-upload-hint">JPG, PNG</div>
            </label>
          `}
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(4)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(4)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Up to MAX_LISTING_IMAGES photos, selected one-or-many-at-a-time (input has
  // `multiple`), each uploaded to Firebase Storage in the background as soon as it's
  // added — see uploadListingImage(). imgSeq gives every item a stable id for the
  // duration of this form session (retry/reorder/remove all key off it, not array index,
  // since the array gets reordered).
  const MAX_LISTING_IMAGES = 15;
  let imgSeq = 0;

  function renderImageBoxes() {
    const boxes = addListingState.images.map((img, i) => {
      const busy = img.status === 'uploading' || img.status === 'waiting';
      const failed = img.status === 'failed';
      return `
        <div class="image-upload-box has-image ${busy ? 'busy' : ''} ${failed ? 'failed' : ''}">
          ${i === 0 ? '<div class="main-badge">Үндсэн</div>' : `
            <button type="button" class="cover-btn" onclick="makeImageCover(${i})" title="Үндсэн зураг болгох">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.6z"/></svg>
            </button>
          `}
          <button type="button" class="remove-img" onclick="removeImage(${i})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <img src="${img.previewUrl}" alt="">
          ${busy ? '<div class="img-status-overlay"><div class="img-spinner"></div></div>' : ''}
          ${failed ? `
            <div class="img-status-overlay img-status-failed">
              <span>${img.error || 'Алдаа гарлаа'}</span>
              <button type="button" onclick="retryImageUpload(${i})">Дахин оролдох</button>
            </div>
          ` : ''}
          ${img.status === 'uploaded' && img.localOnly ? '<div class="local-badge">Зөвхөн энэ төхөөрөмжид</div>' : ''}
          ${addListingState.images.length > 1 ? `
            <div class="img-reorder">
              <button type="button" ${i === 0 ? 'disabled' : ''} onclick="moveImage(${i}, -1)" title="Зүүн тийш зөөх">‹</button>
              <button type="button" ${i === addListingState.images.length - 1 ? 'disabled' : ''} onclick="moveImage(${i}, 1)" title="Баруун тийш зөөх">›</button>
            </div>
          ` : ''}
        </div>
      `;
    });
    if (addListingState.images.length < MAX_LISTING_IMAGES) {
      boxes.push(`
        <label class="image-upload-box image-upload-drop" for="imgInputMulti"
          ondragover="event.preventDefault(); event.stopPropagation(); this.classList.add('drag-over');"
          ondragleave="this.classList.remove('drag-over');"
          ondrop="handleImageDrop(event, this)">
          <input type="file" id="imgInputMulti" accept="image/*" multiple style="display:none" onchange="handleImageUpload(event)" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
          <div class="image-upload-text">${addListingState.images.length === 0 ? 'Үндсэн зураг' : 'Зураг нэмэх'}</div>
          <div class="image-upload-hint">JPG, PNG — чирж оруулах эсвэл олноор сонгож болно</div>
        </label>
      `);
    }
    return boxes.join('');
  }

  function refreshImageGrid() {
    const grid = document.getElementById('imageGrid');
    if (grid) grid.innerHTML = renderImageBoxes();
    updateSubmitButtonState();
  }

  // Mirrors upload progress onto the step-7 "Зар нийтлэх" button so a still-uploading
  // photo can never be submitted twice or published half-attached — see submitListing().
  function updateSubmitButtonState() {
    const btn = document.getElementById('alSubmitBtn');
    if (!btn) return;
    const label = document.getElementById('alSubmitBtnLabel');
    const busy = addListingState.images.some(im => im.status === 'uploading' || im.status === 'waiting');
    btn.disabled = busy;
    if (label) label.textContent = busy ? 'Зураг байршуулж байна...' : (editingListingId ? 'Өөрчлөлт хадгалах' : 'Зар нийтлэх');
  }

  function renderStep5() {
    const active = addListingState.step === 5;
    const len = (addListingState.description || '').length;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="5">
        <div class="step-section-title">Тайлбар</div>
        <div class="step-section-sub">Үл хөдлөх хөрөнгийнхөө онцлог, давуу талыг чөлөөтэй бичнэ үү</div>

        <div class="form-row">
          <div class="form-label-row">
            <label class="form-label" for="alDescription">Дэлгэрэнгүй тайлбар<span class="req">*</span></label>
            <span class="form-char-count" id="alDescCount">${len} / 2000</span>
          </div>
          <textarea class="form-textarea form-textarea-lg" id="alDescription" rows="10" placeholder="Жнь: Зайсаны бизнес төвөөс 5 минутын зайтай, өмнөд талдаа задгай, наран гэрэлтэй, ойролцоо сургууль цэцэрлэгтэй. Шинэ засвартай, бүх тавилга үлдэнэ..." maxlength="2000" oninput="document.getElementById('alDescCount').textContent = this.value.length + ' / 2000';">${addListingState.description}</textarea>
          <div class="form-err-msg">Тайлбараа оруулна уу</div>
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(5)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(5)">
            Үргэлжлүүлэх
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderStep6() {
    const active = addListingState.step === 6;
    return `
      <div class="step-panel ${active ? 'active' : ''}" data-step="6">
        <div class="step-section-title">Холбоо барих</div>
        <div class="step-section-sub">Худалдан авагчид зөвхөн энэ дугаараар холбогдоно</div>

        <div class="form-row">
          <label class="form-label" for="alPhone">Холбоо барих утасны дугаар<span class="req">*</span></label>
          <div class="phone-input-group">
            <div class="phone-prefix">+976</div>
            <input type="tel" class="form-input" id="alPhone" placeholder="88112233" maxlength="8" value="${addListingState.phone}" />
          </div>
          <div class="form-err-msg">Утасны дугаараа 8 оронтой зөв оруулна уу</div>
        </div>

        <div class="form-grid-2">
          <div>
            <label class="form-label">Таны нэр<span class="req">*</span></label>
            <input type="text" class="form-input" id="alName" placeholder="Жнь: Болд" value="${addListingState.name}" />
            <div class="form-err-msg">Нэрээ оруулна уу</div>
          </div>
          <div>
            <label class="form-label">Та хэн вэ?<span class="req">*</span></label>
            <select class="form-select" id="alRole">
              <option value="owner" ${addListingState.role === 'owner' ? 'selected' : ''}>Үл хөдлөхийн эзэн</option>
              <option value="agent" ${addListingState.role === 'agent' ? 'selected' : ''}>Үл хөдлөхийн агент</option>
              <option value="company" ${addListingState.role === 'company' ? 'selected' : ''}>Барилгын компани</option>
            </select>
          </div>
        </div>

        <div class="step-section-title" style="margin-top:24px;">Зарын үнэлгээний хувилбар</div>
        <div class="step-section-sub">Илүү харагдах зарууд илүү хурдан зарагдана</div>

        <div class="plan-grid">
          <button class="plan-card ${addListingState.plan === 'basic' ? 'active' : ''}" data-plan="basic">
            <div class="plan-name">Энгийн</div>
            <div class="plan-price">Үнэгүй</div>
            <div class="plan-price-period">30 хоног идэвхтэй</div>
            <ul class="plan-features">
              <li>30 хоног идэвхтэй</li>
              <li>${MAX_LISTING_IMAGES} хүртэл зураг</li>
              <li>Энгийн хайлтад харагдана</li>
            </ul>
          </button>
          <button class="plan-card recommend ${addListingState.plan === 'vip' ? 'active' : ''}" data-plan="vip">
            <div class="plan-name">VIP</div>
            <div class="plan-price">15,000 ₮ <span class="plan-price-period">/ зар</span></div>
            <div class="plan-price-period">60 хоног идэвхтэй</div>
            <ul class="plan-features">
              <li>60 хоног идэвхтэй</li>
              <li>${MAX_LISTING_IMAGES} хүртэл зураг</li>
              <li>"VIP" тэмдэглэгээтэй</li>
              <li>Хайлт болон нүүр хуудсанд эхэнд гарна</li>
            </ul>
          </button>
          <button class="plan-card ${addListingState.plan === 'featured' ? 'active' : ''}" data-plan="featured">
            <div class="plan-name">Онцлох</div>
            <div class="plan-price">35,000 ₮ <span class="plan-price-period">/ зар</span></div>
            <div class="plan-price-period">90 хоног идэвхтэй</div>
            <ul class="plan-features">
              <li>90 хоног идэвхтэй</li>
              <li>${MAX_LISTING_IMAGES} хүртэл зураг</li>
              <li>"VIP" тэмдэглэгээтэй</li>
              <li>Хайлт болон нүүр хуудсанд эхэнд гарна</li>
              <li>Хамгийн урт хугацаагаар идэвхтэй</li>
            </ul>
          </button>
        </div>

        <div style="padding:12px 14px; background:rgba(255,176,32,0.1); border:1px solid rgba(255,176,32,0.3); border-radius:10px; font-size:12px; color:var(--ink-2); line-height:1.5;">
          <strong>Демо — бодит төлбөрийн систем одоогоор холбогдоогүй.</strong> VIP/Онцлох сонголтууд зөвхөн урьдчилан харуулж байгаа болно; төлбөрийн систем холбогдох хүртэл таны зар үргэлж Энгийн (үнэгүй) нөхцөлөөр нийтлэгдэнэ.
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(6)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" onclick="nextStep(6)">
            Урьдчилан харах
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Builds a real listing-shaped object out of the in-progress wizard state so the
  // preview step can reuse the exact same listingCardHtml() component every other grid
  // in the app uses — real visual parity with the real card, not a lookalike. id:0 never
  // matches a real listing (openListing/toggleFav no-op on it), and the card is wrapped
  // pointer-events:none below since none of its click targets (favorite, compare, the
  // card itself) mean anything yet.
  function alPreviewListingShim() {
    const s = addListingState;
    const districtLabels = {
      'khan-uul': 'Хан-Уул', 'sukhbaatar': 'Сүхбаатар', 'chingeltei': 'Чингэлтэй',
      'bayanzurkh': 'Баянзүрх', 'bayangol': 'Баянгол', 'songinokhairkhan': 'Сонгинохайрхан',
      'nalaikh': 'Налайх', 'bagakhangai': 'Багахангай', 'baganuur': 'Багануур'
    };
    const isLand = s.propertyType === 'land';
    const a = parseFloat(s.area) || 0;
    return {
      id: 0,
      img: s.images[0]?.previewUrl || s.images[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      title: s.title || 'Гарчиг оруулаагүй',
      badges: [],
      listingVerified: false, sellerVerified: false, userSubmitted: true,
      price: parseFloat(s.price) || 0,
      cat: s.intent === 'rent' ? 'rent' : propertyTypeBucket(s.propertyType || 'apartment'),
      features: s.features || [],
      tag: { type: 'normal', text: 'Урьдчилан харах' },
      loc: (districtLabels[s.district] || s.district || 'Байршил сонгоогүй') + (s.khoroo ? ' · ' + s.khoroo + '-р хороо' : ''),
      area: a,
      rooms: isLand ? (a ? (a / 10000).toFixed(2) + ' га' : '—') : (parseInt(s.rooms) || '—'),
      floor: isLand ? 'Эзэмшил' : (s.floor ? s.floor + '/' + (s.totalFloors || '?') : '?'),
      year: isLand ? null : (parseInt(s.year) || null)
    };
  }

  function renderStep7() {
    const active = addListingState.step === 7;
    if (!active) return '<div class="step-panel" data-step="7"></div>';
    const s = addListingState;
    const roleLabels = { owner: 'Үл хөдлөхийн эзэн', agent: 'Үл хөдлөхийн агент', company: 'Барилгын компани' };
    return `
      <div class="step-panel active" data-step="7">
        <div class="step-section-title">Урьдчилан харах</div>
        <div class="step-section-sub">Нийтлэхээс өмнө зараа шалгаарай — талбар бүрийн "Засах" товч тухайн алхам руу шууд буцаана.</div>

        <div class="al-preview-wrap">
          <div class="al-preview-card" style="pointer-events:none;">
            ${listingCardHtml(alPreviewListingShim())}
          </div>
          <button type="button" class="al-preview-edit" onclick="jumpToStep(4)">Зураг/мэдээлэл засах</button>
        </div>

        <div class="al-preview-block">
          <div class="al-preview-block-head">
            <span>Тайлбар</span>
            <button type="button" class="al-preview-edit" onclick="jumpToStep(5)">Засах</button>
          </div>
          <div class="al-preview-block-body">${s.description ? esc(s.description).replace(/\n/g, '<br>') : '<span style="color:var(--ink-3);">Тайлбар оруулаагүй</span>'}</div>
        </div>

        <div class="al-preview-block">
          <div class="al-preview-block-head">
            <span>Холбоо барих мэдээлэл</span>
            <button type="button" class="al-preview-edit" onclick="jumpToStep(6)">Засах</button>
          </div>
          <div class="al-preview-block-body">
            ${esc(s.name || '—')} · ${roleLabels[s.role] || roleLabels.owner}<br>
            +976 ${esc(s.phone || '—')}
          </div>
        </div>

        <div style="padding:14px; background:var(--paper-2); border-radius:10px; font-size:12px; color:var(--ink-3); line-height:1.5; margin-top:18px;">
          Зар нийтлэхээр <a href="javascript:void(0)" style="color:var(--primary); font-weight:600;" onclick="openInfoPage('terms', 'addListing')">Үйлчилгээний нөхцөл</a> болон <a href="javascript:void(0)" style="color:var(--primary); font-weight:600;" onclick="openInfoPage('privacy', 'addListing')">Нууцлалын бодлого</a>-той зөвшөөрсөнд тооцогдоно. Хуурамч мэдээлэл оруулсан тохиолдолд зар нь устгагдаж, бүртгэл блоклогдох эрсдэлтэй.
        </div>

        <div class="step-nav">
          <button class="btn btn-ghost btn-back" onclick="prevStep(7)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Буцах
          </button>
          <button class="btn btn-blue btn-lg" id="alSubmitBtn" onclick="submitListing()">
            <span id="alSubmitBtnLabel">${editingListingId ? 'Өөрчлөлт хадгалах' : 'Зар нийтлэх'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Jumps straight to a step from the Preview screen's "Засах" links — all of the
  // wizard's own state is already saved (nextStep/prevStep call saveStepData on every
  // transition), so this just needs to re-render at the target step.
  function jumpToStep(n) {
    addListingState.step = n;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    document.querySelector('.modal')?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(attachAddListingHandlers, 50);
  }

  function renderSuccess() {
    const active = addListingState.step === 8;
    if (!active) return '';
    const listingId = 'BX-' + Date.now().toString().slice(-7);
    return `
      <div class="step-panel ${active ? 'active' : ''}">
        <div class="success-state">
          <div class="success-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="success-title">${addListingState._syncFailed ? 'Энэ төхөөрөмж дээр түр хадгаллаа. Нийтлэгдээгүй.' : 'Зар илгээгдлээ — хянагдаж байна'}</div>
          <div class="success-id">Зарын дугаар: ${listingId}</div>
          <div class="success-info">
            ${addListingState._syncFailed
              ? (!currentUser
                  ? 'Та нэвтрээгүй тул зар зөвхөн энэ төхөөрөмж дээр л харагдаж байна — серверт хадгалагдаагүй, өөр хэн ч харахгүй. Нэвтэрч орсны дараа дахин нийтэлнэ үү.'
                  : 'Таны зар одоогоор зөвхөн энэ төхөөрөмж дээр харагдаж байна — серверт хадгалагдаагүй тул өөр хэн ч харахгүй (сүлжээ эсвэл зурган файлтай холбоотой алдаа гарсан байж болзошгүй). Дахин оролдоно уу эсвэл интернэт холболтоо шалгаад дараа дахин нийтэлнэ үү.')
              : 'Таны зар админы шалгалтад орлоо. Батлагдсны дараа TP Property дээр нийтэд харагдана — "Миний зарууд" хэсгийн "Хянагдаж байна" таб-аас явцыг харна уу.'}
          </div>
          <div style="display:flex; gap:10px; justify-content:center;">
            <button class="btn btn-ghost btn-lg" onclick="closeModal()">Хаах</button>
            <button class="btn btn-blue btn-lg" onclick="closeModal(); showPage('my-listings'); renderMyListings('pending');">
              Миний зарууд
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Add Listing handlers =====
  function attachAddListingHandlers() {
    initListingLocationPreview();

    // Intent cards
    document.querySelectorAll('.intent-card').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.intent-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        addListingState.intent = c.dataset.intent;
      });
    });

    // Type cards
    document.querySelectorAll('.type-card').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.type-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        addListingState.propertyType = c.dataset.type;
      });
    });

    // Toggle rows
    document.querySelectorAll('.toggle-row').forEach(t => {
      const feature = t.dataset.feature;
      if (addListingState.features.includes(feature)) t.classList.add('on');
      t.addEventListener('click', () => {
        t.classList.toggle('on');
        if (t.classList.contains('on')) {
          if (!addListingState.features.includes(feature)) addListingState.features.push(feature);
        } else {
          addListingState.features = addListingState.features.filter(f => f !== feature);
        }
      });
    });

    // Payment-terms toggle rows — same mechanism as the feature toggle rows above, but a
    // separate class/data attribute so they write into addListingState.paymentTerms
    // instead of .features (kept as two distinct arrays deliberately, see renderStep3).
    document.querySelectorAll('.toggle-row-pt').forEach(t => {
      const term = t.dataset.paymentTerm;
      if (addListingState.paymentTerms.includes(term)) t.classList.add('on');
      t.addEventListener('click', () => {
        t.classList.toggle('on');
        if (t.classList.contains('on')) {
          if (!addListingState.paymentTerms.includes(term)) addListingState.paymentTerms.push(term);
        } else {
          addListingState.paymentTerms = addListingState.paymentTerms.filter(x => x !== term);
        }
      });
    });

    // Chip-selects (heating, condition, land ownership-esque single-choice fields) —
    // each group mirrors its choice into a hidden input so saveStepData/validateStep
    // keep reading it exactly like the native <select> it replaces.
    document.querySelectorAll('.chip-select').forEach(group => {
      const hidden = document.getElementById(group.dataset.for);
      if (!hidden) return;
      group.querySelectorAll('.chip-option').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.chip-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          hidden.value = btn.dataset.value;
        });
      });
    });

    // Plan cards
    document.querySelectorAll('.plan-card').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.plan-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        addListingState.plan = c.dataset.plan;
      });
    });

    // Price suggestion
    const priceInput = document.getElementById('alPrice');
    if (priceInput) priceInput.addEventListener('input', updatePriceSuggestion);

    // Phone input — digits only
    const phoneEl = document.getElementById('alPhone');
    if (phoneEl) {
      phoneEl.addEventListener('input', () => {
        phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 8);
      });
    }

    updatePriceSuggestion();
    updateSubmitButtonState(); // covers landing on step 5 while step 4's background uploads are still in flight
  }

  function updatePriceSuggestion() {
    const priceInput = document.getElementById('alPrice');
    const box = document.getElementById('priceSuggestBox');
    const ppsqmBox = document.getElementById('pricePerSqmBox');
    if (!priceInput) return;
    const price = parseFloat(priceInput.value);
    const area = parseFloat(document.getElementById('alArea')?.value || addListingState.area);
    if (!price || !area) {
      if (box) box.innerHTML = '';
      if (ppsqmBox) ppsqmBox.innerHTML = '';
      return;
    }

    if (ppsqmBox) {
      const totalTogrog = Math.round(price * 1000000);
      ppsqmBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:10px 14px; background:var(--paper-2); border-radius:10px; font-size:13px;">
          <span style="color:var(--ink-3);">${fmt(totalTogrog)}₮ ÷ ${area}м² =</span>
          <strong style="font-family:'JetBrains Mono',monospace; color:var(--primary);">${fmt(totalTogrog / area)}₮/м²</strong>
        </div>
      `;
    }

    if (!box) return;
    // No verified district-level market-average source exists to compare this price
    // against, so this box no longer claims a "district average" — it just states that
    // plainly instead of guessing. The honest ₮/м² figure above (from the user's own
    // input) is left as-is.
    box.innerHTML = `
      <div class="price-suggest">
        <div class="price-suggest-icon" style="color:var(--ink-3);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M9 9l4 4 5-5"/></svg>
        </div>
        <div><strong>Үнийн зөвлөмж мэдээлэл хангалтгүй.</strong> Тухайн дүүргийн одоогийн зах зээлийн үнийг өөрөө шалгаж үзэхийг зөвлөж байна.</div>
      </div>
    `;
  }

  function nextStep(currentStep) {
    if (!validateStep(currentStep)) return;
    saveStepData(currentStep);
    addListingState.step = currentStep + 1;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    document.getElementById('modal').scrollTop = 0;
    document.querySelector('.modal')?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(attachAddListingHandlers, 50);
  }

  function prevStep(currentStep) {
    saveStepData(currentStep);
    addListingState.step = currentStep - 1;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    setTimeout(attachAddListingHandlers, 50);
  }

  function saveStepData(step) {
    if (step === 2) {
      addListingState.title = document.getElementById('alTitle')?.value || '';
      addListingState.district = document.getElementById('alDistrict')?.value || '';
      addListingState.khoroo = document.getElementById('alKhoroo')?.value || '';
      addListingState.address = document.getElementById('alAddress')?.value || '';
      addListingState.area = document.getElementById('alArea')?.value || '';
      addListingState.rooms = document.getElementById('alRooms')?.value || '';
      addListingState.bedrooms = document.getElementById('alBedrooms')?.value || '';
      addListingState.bathrooms = document.getElementById('alBathrooms')?.value || '';
      addListingState.year = document.getElementById('alYear')?.value || '';
      addListingState.floor = document.getElementById('alFloor')?.value || '';
      addListingState.totalFloors = document.getElementById('alTotalFloors')?.value || '';
      addListingState.buildingName = document.getElementById('alBuildingName')?.value || '';
      addListingState.complex = document.getElementById('alComplex')?.value || '';
      addListingState.landArea = document.getElementById('alLandArea')?.value || '';
    }
    if (step === 3) {
      addListingState.price = document.getElementById('alPrice')?.value || '';
      addListingState.buildingType = document.getElementById('alBuildingType')?.value || '';
      addListingState.heating = document.getElementById('alHeating')?.value || '';
      addListingState.windowDirection = document.getElementById('alWindowDirection')?.value || '';
      addListingState.insulationType = document.getElementById('alInsulation')?.value || '';
      addListingState.hoaFee = document.getElementById('alHoaFee')?.value || '';
      addListingState.condition = document.getElementById('alCondition')?.value || '';
      addListingState.usageType = document.getElementById('alUsageType')?.value || '';
      addListingState.deposit = document.getElementById('alDeposit')?.value || '';
      addListingState.minTerm = document.getElementById('alMinTerm')?.value || '';
      addListingState.constructionProgress = document.getElementById('alConstructionProgress')?.value || '';
    }
    if (step === 4) {
      addListingState.videoUrl = document.getElementById('alVideoUrl')?.value || '';
      addListingState.tourUrl = document.getElementById('alTourUrl')?.value || '';
    }
    if (step === 5) {
      addListingState.description = document.getElementById('alDescription')?.value || '';
    }
    if (step === 6) {
      addListingState.phone = document.getElementById('alPhone')?.value || '';
      addListingState.name = document.getElementById('alName')?.value || '';
      addListingState.role = document.getElementById('alRole')?.value || 'owner';
    }
    saveDraftToStorage();
  }

  // Scrolls/focuses the first invalid field so a validation failure is never silent —
  // without this, a rejected step just looks like the button did nothing.
  function focusFirstInvalid() {
    const el = document.querySelector('.form-input.err, .form-select.err, .form-textarea.err');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }

  function validateStep(step) {
    document.querySelectorAll('.form-input.err, .form-select.err, .form-textarea.err').forEach(el => el.classList.remove('err'));
    if (step === 1) {
      if (!addListingState.intent || !addListingState.propertyType) {
        showToast('Зорилго ба үл хөдлөхийн төрлөө сонгоно уу');
        return false;
      }
      return true;
    }
    if (step === 2) {
      let ok = true;
      const title = document.getElementById('alTitle');
      const district = document.getElementById('alDistrict');
      const area = document.getElementById('alArea');
      const rooms = document.getElementById('alRooms');
      if (!title.value || title.value.length < 10) { title.classList.add('err'); ok = false; }
      if (!district.value) { district.classList.add('err'); ok = false; }
      if (!area.value || parseFloat(area.value) < 1) { area.classList.add('err'); ok = false; }
      if (rooms && !rooms.value) { rooms.classList.add('err'); ok = false; }
      if (!ok) { showToast('Заавал бөглөх талбаруудыг шалгана уу'); focusFirstInvalid(); }
      return ok;
    }
    if (step === 3) {
      let ok = true;
      const price = document.getElementById('alPrice');
      if (!price.value || parseFloat(price.value) < 1) { price.classList.add('err'); ok = false; }
      if (!ok) { showToast('Заавал бөглөх талбаруудыг шалгана уу'); focusFirstInvalid(); }
      return ok;
    }
    if (step === 4) {
      if (addListingState.images.length < 1) {
        showToast('Хамгийн багадаа 1 зураг оруулна уу');
        return false;
      }
      return true;
    }
    if (step === 5) {
      const desc = document.getElementById('alDescription');
      if (!desc.value || !desc.value.trim()) {
        desc.classList.add('err');
        showToast('Тайлбараа оруулна уу');
        focusFirstInvalid();
        return false;
      }
      return true;
    }
    if (step === 6) {
      let ok = true;
      const phone = document.getElementById('alPhone');
      if (!phone.value || phone.value.length !== 8) { phone.classList.add('err'); ok = false; }
      const name = document.getElementById('alName');
      if (!name.value) { name.classList.add('err'); ok = false; }
      if (!ok) {
        showToast(!phone.value || phone.value.length !== 8 ? 'Утасны дугаараа 8 оронтой зөв оруулна уу' : 'Нэрээ оруулна уу');
        focusFirstInvalid();
      }
      return ok;
    }
    return true;
  }

  // Resizes+re-encodes a photo client-side before it ever leaves the device — a
  // straight-from-camera phone photo (5-15MB) both uploads slowly and, if Storage is
  // ever unreachable, is far too big to fall back into a Firestore document (1MiB cap).
  // Returns both a Blob (for the Storage upload) and a dataURL (for the local-only
  // fallback / instant preview) off the same decoded canvas, so a file that can't be
  // decoded at all — HEIC on a browser with no native decoder is the common case —
  // rejects clearly instead of silently producing a broken image.
  function compressListingImageFile(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('unsupported-format')); return; }
          resolve({ blob, dataUrl });
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('unsupported-format')); };
      img.src = objectUrl;
    });
  }

  function handleImageUpload(event) {
    addImageFiles(event.target.files);
    event.target.value = ''; // lets the user pick the same file again later (e.g. after removing it)
  }

  // Desktop drag & drop onto the upload box — same file list, same add pipeline as the
  // file picker (handleImageUpload), just a different entry point into it.
  function handleImageDrop(event, el) {
    event.preventDefault();
    event.stopPropagation();
    if (el) el.classList.remove('drag-over');
    addImageFiles(event.dataTransfer?.files);
  }

  function addImageFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_LISTING_IMAGES - addListingState.images.length;
    if (room <= 0) {
      showToast('Хамгийн ихдээ ' + MAX_LISTING_IMAGES + ' зураг оруулж болно');
      return;
    }
    const toAdd = files.slice(0, room);
    if (files.length > toAdd.length) {
      showToast(toAdd.length + ' зураг нэмэгдлээ — хамгийн ихдээ ' + MAX_LISTING_IMAGES + ' зураг байна');
    }
    toAdd.forEach(file => {
      if (!file.type || !file.type.startsWith('image/')) {
        showToast('"' + file.name + '" — зурган файл биш байна');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast('"' + file.name + '" — зураг 15MB-аас бага байх ёстой');
        return;
      }
      const item = {
        id: ++imgSeq, file, previewUrl: URL.createObjectURL(file),
        status: 'waiting', url: '', localDataUrl: '', localOnly: false, error: ''
      };
      addListingState.images.push(item);
      uploadListingImage(item);
    });
    refreshImageGrid();
  }

  // Starts (or retries) one photo's compress-then-upload pipeline. Runs independently
  // per image and in the background — the user can move on to later steps while several
  // of these are still in flight; submitListing() is what actually waits for all of them.
  async function uploadListingImage(item) {
    item.status = 'uploading';
    item.error = '';
    refreshImageGrid();
    let compressed;
    try {
      compressed = await compressListingImageFile(item.file, 1600, 0.82);
    } catch (e) {
      item.status = 'failed';
      item.error = 'Дэмжигдэхгүй зургийн формат (HEIC байж болзошгүй) — JPG эсвэл PNG болгож дахин оруулна уу';
      refreshImageGrid();
      return;
    }
    item.localDataUrl = compressed.dataUrl;
    if (!currentUser) {
      // Guest submissions never reach Firestore at all today (see doSubmitListing) —
      // Storage rules require auth too, so there's nothing to upload to yet. The
      // compressed local copy is what this listing will keep.
      item.status = 'uploaded';
      item.localOnly = true;
      refreshImageGrid();
      return;
    }
    // Everything from here down — including constructing the ref/task themselves — is
    // inside one try/catch. A synchronous throw at any point used to leave `item` stuck
    // on 'uploading' forever (no catch, no timer, no way out except a page reload); now
    // every path reaches 'uploaded' or 'failed'.
    let timedOut = false;
    let timeoutId = null;
    try {
      const path = 'listing-images/' + currentUser.uid + '/' + Date.now() + '-' + item.id + '.jpg';
      const uploadTask = storage.ref(path).put(compressed.blob, { contentType: 'image/jpeg' });
      // The Storage SDK's own retry logic can otherwise keep an unreachable/misconfigured
      // request alive far longer than a user will wait — .cancel() is a real abort (not
      // just abandoning the promise), so the network request actually stops instead of
      // continuing in the background after we've already given up on it.
      timeoutId = setTimeout(() => { timedOut = true; uploadTask.cancel(); }, 18000);
      await uploadTask;
      item.url = await uploadTask.snapshot.ref.getDownloadURL();
      item.storagePath = path;
      item.status = 'uploaded';
      item.localOnly = false;
    } catch (e) {
      console.error('Listing image upload failed:', item.id, timedOut ? 'timeout' : (e?.code || e?.message));
      // A real per-image failure now — not a silent downgrade to a local-only copy.
      // The user sees exactly which photo didn't make it and can Retry or remove it;
      // submitListing() refuses to publish while any photo is stuck failed, so this can
      // never turn into a listing that looks successful with a photo silently missing.
      item.status = 'failed';
      item.error = timedOut
        ? 'Хугацаа дууслаа — сүлжээгээ шалгаад дахин оролдоно уу'
        : 'Зураг байршуулахад алдаа гарлаа — дахин оролдоно уу';
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    refreshImageGrid();
  }

  function retryImageUpload(idx) {
    const item = addListingState.images[idx];
    if (!item || !item.file) return; // nothing to retry for an already-existing (edit-mode) image
    uploadListingImage(item);
  }

  function makeImageCover(idx) {
    if (idx <= 0 || idx >= addListingState.images.length) return;
    const [item] = addListingState.images.splice(idx, 1);
    addListingState.images.unshift(item);
    refreshImageGrid();
  }

  function moveImage(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= addListingState.images.length) return;
    const arr = addListingState.images;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    refreshImageGrid();
  }

  function removeImage(idx) {
    const [item] = addListingState.images.splice(idx, 1);
    if (item && item.file) URL.revokeObjectURL(item.previewUrl); // only ours to revoke — existing (edit-mode) previews are real URLs, not blob: ones
    refreshImageGrid();
  }

  // Floor plan — same resize-then-base64 approach as the profile photo (dashboard.js),
  // just a larger max dimension since floor plans need readable text/labels.
  function handleFloorPlanUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Зурган файл сонгоно уу'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('Зураг 8MB-аас бага байх ёстой'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        addListingState.floorPlan = canvas.toDataURL('image/jpeg', 0.85);
        // Re-rendering the step would otherwise revert alVideoUrl/alTourUrl to their
        // last-saved (possibly stale) state, discarding whatever the user just typed
        // into those fields before touching the floor plan uploader.
        saveStepData(4);
        document.getElementById('modalContent').innerHTML = renderAddListing();
        setTimeout(attachAddListingHandlers, 50);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearFloorPlan() {
    saveStepData(4);
    addListingState.floorPlan = null;
    document.getElementById('modalContent').innerHTML = renderAddListing();
    setTimeout(attachAddListingHandlers, 50);
  }

  async function submitListing() {
    // Defensive re-check — step 6 (Contact) is already validated once by nextStep(6)
    // before the Preview step is even reachable, so this should never actually fail in
    // normal use. If it somehow does, jump back to step 6 first (jumpToStep re-renders
    // that panel's inputs from scratch, which would wipe an .err class added beforehand)
    // and validate there, so the flagged field is both visible and actually marked.
    if (addListingState.step === 7) {
      jumpToStep(6);
      if (!validateStep(6)) return;
      jumpToStep(7);
    } else if (!validateStep(6)) {
      return;
    }
    // Never publish while a photo is mid-upload or stuck on a failure — otherwise a
    // double-click (or a slow retry) could either submit before the image exists
    // server-side, or claim success on a listing with a photo silently missing.
    if (addListingState.images.some(im => im.status === 'uploading' || im.status === 'waiting')) {
      showToast('Зураг байршуулж дуустал хүлээнэ үү');
      return;
    }
    const failedIdx = addListingState.images.findIndex(im => im.status === 'failed');
    if (failedIdx !== -1) {
      showToast('Амжилтгүй зураг байна — Дахин оролдох дарна уу эсвэл устгана уу');
      addListingState.step = 4;
      document.getElementById('modalContent').innerHTML = renderAddListing();
      setTimeout(attachAddListingHandlers, 50);
      return;
    }
    if (!editingListingId && isDuplicateListing()) {
      showToast('Та яг ижил дүүрэг, талбай, үнэтэй зар оруулсан байна — давхардсан зар мэдээлэгдэж болно');
      return;
    }
    // isDuplicateListing() only catches a second, separate submission after the first one
    // has already landed in local state — a fast double-click on this same button fires
    // twice before either request resolves, so neither sees the other yet. Lock the button
    // for the duration of this call to close that gap; doSubmitListing() itself navigates
    // away to the success step, so this only ever needs to unlock again on failure.
    const btn = document.getElementById('alSubmitBtn');
    if (btn) { if (btn.disabled) return; btn.disabled = true; }
    try {
      await doSubmitListing();
    } catch(e) {
      console.error('submitListing failed:', e);
      showToast('Зар нийтлэхэд алдаа гарлаа. Дахин оролдоно уу.');
      if (btn) btn.disabled = false;
    }
  }

  // Lightweight spam/duplicate guard: the same signed-in owner submitting another listing
  // in the same district, at the same price and area, while an earlier one of theirs is
  // still pending review or already live. Not a content-fingerprint/ML system — just the
  // simplest signal that's actually available without a backend.
  function isDuplicateListing() {
    if (!currentUser?.uid) return false;
    const s = addListingState;
    const price = parseFloat(s.price) || 0;
    const area = parseFloat(s.area) || 0;
    if (!price || !area) return false;
    return listings.some(l =>
      l.userSubmitted && l.ownerId === currentUser.uid &&
      (l.status === 'active' || l.status === 'pending') &&
      l.district === s.district && l.price === price && l.area === area
    );
  }

  async function doSubmitListing() {
    saveStepData(6);

    const s = addListingState;
    const districtLabels = {
      'khan-uul': 'Хан-Уул', 'sukhbaatar': 'Сүхбаатар', 'chingeltei': 'Чингэлтэй',
      'bayanzurkh': 'Баянзүрх', 'bayangol': 'Баянгол', 'songinokhairkhan': 'Сонгинохайрхан',
      'nalaikh': 'Налайх', 'bagakhangai': 'Багахангай', 'baganuur': 'Багануур'
    };
    const zoningLabels = { residential: 'Орон сууцны', commercial: 'Худалдаа үйлчилгээний', industrial: 'Үйлдвэрлэлийн', agricultural: 'Хөдөө аж ахуйн' };
    const ownershipLabels = { owned: 'Өмчлөлийн гэрчилгээтэй', possession: 'Эзэмших эрхтэй', usage: 'Ашиглах эрхтэй' };
    const usageTypeLabels = { ready: 'Ашиглалтад бэлэн', leased: 'Түрээслэгдсэн', renovation: 'Засвар шаардлагатай' };
    const conditionLabels = {
      'white-box': 'Засваргүй (white box)', basic: 'Энгийн засвартай', renovated: 'Үндсэн засвартай',
      premium: 'Premium засвартай', furnished: 'Тавилгатай, бүрэн засвартай'
    };
    const insulationLabels = {
      eps: 'Гадна EPS дулаалга', mw: 'Эрдэс ноос (MW)', pir: 'PIR (шинэ стандарт)',
      inside: 'Дотроос хийсэн', none: 'Дулаалгагүй'
    };
    const windowDirLabels = {
      north: 'Хойд', south: 'Урд', east: 'Дорнод', west: 'Өрнөд',
      southeast: 'Урд-Дорнод', southwest: 'Урд-Өрнөд', northeast: 'Хойд-Дорнод', northwest: 'Хойд-Өрнөд'
    };
    const minTermLabels = { '1m': '1 сар', '3m': '3 сар', '6m': '6 сар', '1y': '1 жил+' };
    const isLand = s.propertyType === 'land';
    const newId = listings.reduce(function(m, l) { return l.id > m ? l.id : m; }, 0) + 1;
    const p = parseFloat(s.price) || 0;
    const a = parseFloat(s.area) || 0;
    // A real Storage download URL when the upload made it to the server, otherwise the
    // compressed local copy — either way this listing always has something to display
    // locally. Whether it's *safe* to also write to Firestore is a separate question,
    // decided by allImagesSynced below (a mix of tiny URLs and multi-hundred-KB local
    // fallback strings is exactly how the old base64-in-Firestore bug happened).
    const allImages = s.images.map(im => im.url || im.localDataUrl).filter(Boolean);
    const allImagesSynced = s.images.length > 0 && s.images.every(im => !!im.url);
    // VIP/Онцлох cards in the plan picker above are a preview only — no real payment
    // system is connected, so selecting one must never actually grant the paid duration
    // or badge here. Every new listing gets the same free (basic) terms regardless of
    // s.plan; a real payment integration would need to gate this properly before it could
    // vary. (openBoostModal's separate, already-disclosed demo boost flow for an existing
    // published listing is untouched — this only concerns entitlement granted at creation.)
    const now = Date.now();
    const expiresAt = now + 30 * 86400000;
    const newListing = {
      id: newId,
      ownerId: currentUser?.uid || null,
      sellerVerified: !!(currentUser && currentUser.emailVerified),
      // "Verified phone" means THIS listing's contact number matches a number the owner
      // actually proved via SMS OTP (see dashboard.js's real phone-verification flow) —
      // not just that the account exists. Recomputed on every save, including edits, so
      // changing the contact number to an unverified one correctly drops the badge.
      phoneVerified: !!(currentUser?.verifiedPhone && normalizePhone(s.phone) === currentUser.verifiedPhone),
      // Admin-only, scam-review signal — never true on a fresh listing or after an edit
      // (firestore.rules blocks the owner from setting this themselves either way).
      listingVerified: false,
      // New listings, and any edit to an existing one, go back to admin review before they're
      // public again — status (not listingVerified above) is what actually gates public
      // visibility, since loadPublicListings() only fetches status=='active' docs.
      status: 'pending', rejectionReason: '', isDemo: false, _inactive: true,
      expiresAt, _bumpedAt: now,
      cat: s.intent === 'rent' ? 'rent' : propertyTypeBucket(s.propertyType || 'apartment'),
      propertyType: s.propertyType || 'apartment',
      title: s.title || ((districtLabels[s.district] || s.district) + ', ' + (isLand ? 'газар' : (s.rooms || '?') + ' өрөө')),
      loc: (districtLabels[s.district] || s.district) + (s.khoroo ? ' · ' + s.khoroo + '-р хороо' : ''),
      district: s.district || 'sukhbaatar',
      khoroo: s.khoroo ? parseInt(s.khoroo) : null,
      geoLat: s.geoLat || null,
      geoLng: s.geoLng || null,
      price: p,
      pricePerSqm: (a && p) ? parseFloat((p / a).toFixed(2)) : 0,
      area: a,
      rooms: isLand ? (a ? (a / 10000).toFixed(2) + ' га' : '—') : (parseInt(s.rooms) || 1),
      bedrooms: isLand ? null : (parseInt(s.bedrooms) || null),
      bathrooms: isLand ? null : (parseInt(s.bathrooms) || null),
      floor: isLand ? 'Эзэмшил' : (s.floor ? s.floor + '/' + (s.totalFloors || '?') : '?'),
      year: isLand ? null : (parseInt(s.year) || new Date().getFullYear()),
      buildingName: isLand ? '' : (s.buildingName || ''),
      complex: isLand ? '' : (s.complex || ''),
      landArea: parseFloat(s.landArea) || null,
      usageType: usageTypeLabels[s.usageType] || '',
      tag: { type: 'new', text: 'Шинэ зар' },
      // No "vip" badge here regardless of s.plan — see the expiresAt comment above.
      badges: ['new', 'user'],
      loanType: 'Тохиролцоно',
      monthly: 0,
      img: allImages[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      buildingType: isLand ? ('Газар (' + (zoningLabels[s.rooms] || 'Тодорхойгүй') + ')') : (s.buildingType || ''),
      insulation: isLand ? '' : (insulationLabels[s.insulationType] || ''),
      windowDirection: isLand ? '' : (windowDirLabels[s.windowDirection] || ''),
      hoaFee: isLand ? null : (parseInt(s.hoaFee) || null),
      heating: s.heating || '',
      parking: s.features.includes('parking') ? 'Паркинг бий' : '',
      elevator: s.features.includes('elevator') ? 'Лифттэй' : '',
      balcony: s.features.includes('balcony') ? 'Тагттай' : '',
      basement: s.features.includes('basement') ? 'Зоорьтой' : '',
      furniture: s.features.includes('furnished') ? 'Тавилгатай' : '',
      deposit: (s.intent === 'rent' && !isLand) ? (parseFloat(s.deposit) || null) : null,
      minTerm: (s.intent === 'rent' && !isLand) ? (minTermLabels[s.minTerm] || '') : '',
      videoUrl: (s.videoUrl && videoEmbedUrl(s.videoUrl)) ? s.videoUrl.trim() : '',
      tourUrl: (s.tourUrl && safeEmbedUrl(s.tourUrl)) ? s.tourUrl.trim() : '',
      floorPlan: s.floorPlan || null,
      utilityCost: '', ownership: isLand ? (ownershipLabels[s.year] || 'Тодорхойгүй') : 'Хувийн өмчлөл',
      cadastre: '', collateral: '', taxDebt: '',
      condition: conditionLabels[s.condition] || s.condition || '',
      features: s.features.slice(),
      paymentTerms: s.paymentTerms.slice(),
      constructionProgress: s.constructionProgress || '',
      description: s.description || '',
      // Real "open to a barter/exchange" signal from the intent the user actually picked
      // in step 1 — was captured into addListingState but never carried through to the
      // listing object before. Backs the home page's "Бартер сонсоно" quick filter.
      barterOk: s.intent === 'exchange',
      legalNotes: 'Хэрэглэгчийн нэмсэн зар · ' + (s.name || '') + ' · ' + (s.phone || ''),
      userSubmitted: true
    };
    if (allImages.length > 0) listingExtras[newId] = { coords: { x: 50, y: 50 }, gallery: allImages };

    const targetId = editingListingId || newId;

    // ===== FIRESTORE SAVE =====
    // Only attempted once every photo has a real Storage URL — a listing with any
    // localOnly/still-compressed-only image is treated the same as a signed-out
    // submission: kept device-local (see the _syncFailed messaging below) rather than
    // writing a document with a giant base64 string in it, which is what used to blow
    // past Firestore's ~1MiB document cap and surface as a silent "server error".
    let firestoreSaveFailed = false;
    if (currentUser && allImagesSynced) {
      const fsDoc = {
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        sellerVerified: newListing.sellerVerified,
        phoneVerified: newListing.phoneVerified,
        listingVerified: newListing.listingVerified,
        expiresAt: newListing.expiresAt,
        bumpedAt: newListing._bumpedAt,
        category: newListing.cat,
        propertyType: newListing.propertyType,
        title: newListing.title,
        loc: newListing.loc,
        district: newListing.district,
        khoroo: newListing.khoroo,
        geoLat: newListing.geoLat,
        geoLng: newListing.geoLng,
        price: newListing.price,
        area: newListing.area,
        rooms: newListing.rooms,
        bedrooms: newListing.bedrooms,
        bathrooms: newListing.bathrooms,
        floor: newListing.floor,
        year: newListing.year,
        buildingName: newListing.buildingName,
        complex: newListing.complex,
        landArea: newListing.landArea,
        usageType: newListing.usageType,
        buildingType: newListing.buildingType,
        insulation: newListing.insulation,
        windowDirection: newListing.windowDirection,
        hoaFee: newListing.hoaFee,
        heating: newListing.heating,
        deposit: newListing.deposit,
        minTerm: newListing.minTerm,
        condition: newListing.condition,
        features: newListing.features,
        paymentTerms: newListing.paymentTerms,
        constructionProgress: newListing.constructionProgress,
        description: newListing.description,
        barterOk: newListing.barterOk,
        img: newListing.img,
        images: allImages,
        videoUrl: newListing.videoUrl,
        tourUrl: newListing.tourUrl,
        floorPlan: newListing.floorPlan,
        sellerName: s.name || currentUser.name || 'Хэрэглэгч',
        sellerPhone: s.phone || '',
        sellerType: s.role === 'agent' ? 'Агент' : (s.role === 'company' ? 'Компани' : 'Хувь хүн'),
        // Snapshot at publish time — other users can't read another account's private
        // users/{uid} doc (Firestore rules), so verification/company identity has to
        // ride along on the listing itself the same way sellerVerified already does.
        sellerCompany: currentUser.companyName || '',
        sellerEmail: currentUser.email || '',
        sellerPhotoURL: currentUser.photoURL || '',
        status: 'pending', rejectionReason: '',
        badges: newListing.badges,
        boosted: false,
        userSubmitted: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      // Belt-and-suspenders: images are always short Storage URLs by this point, but the
      // floor plan is still a raw base64 image (out of scope for this fix — see
      // handleFloorPlanUpload) and could theoretically still push the document too large.
      if (JSON.stringify(fsDoc).length > 900000) {
        fsDoc.floorPlan = null;
      }
      try {
        if (editingListingId) {
          const existingFsId = listings.find(x => x.id === editingListingId)?.firestoreId;
          if (existingFsId) await db.collection('listings').doc(existingFsId).update(fsDoc);
        } else {
          fsDoc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          fsDoc.lastRefreshedAt = firebase.firestore.FieldValue.serverTimestamp();
          fsDoc.viewCount = 0; fsDoc.favoriteCount = 0; fsDoc.reportCount = 0;
          const docRef = await db.collection('listings').add(fsDoc);
          newListing.firestoreId = docRef.id;
        }
      } catch(e) {
        firestoreSaveFailed = true;
        console.error('Listing Firestore save failed:', e.code, e.message);
        const reason = e.code === 'permission-denied'
          ? ' (зөвшөөрөл татгалзагдлаа — Firestore Rules Publish хийгдээгүй байж болзошгүй)'
          : (e.code ? ' (' + e.code + ')' : '');
        showToast('Сервер лүү илгээхэд алдаа гарлаа — зар зөвхөн энэ төхөөрөмж дээр хадгалагдлаа' + reason);
      }
    }
    // ===== END FIRESTORE =====

    if (editingListingId) {
      const idx = listings.findIndex(x => x.id === editingListingId);
      if (idx > -1) Object.assign(listings[idx], newListing, { id: editingListingId, badges: listings[idx].badges, userSubmitted: true, _gallery: allImages });
      if (allImages.length > 0) listingExtras[editingListingId] = { coords: { x: 50, y: 50 }, gallery: allImages };
      try {
        var saved = JSON.parse(localStorage.getItem('bairxUserListings') || '[]');
        const si = saved.findIndex(x => x.id === editingListingId);
        const updated = Object.assign({}, listings.find(x => x.id === editingListingId), { _gallery: allImages });
        if (si > -1) saved[si] = updated; else saved.push(updated);
        localStorage.setItem('bairxUserListings', JSON.stringify(saved));
      } catch(e) {}
      editingListingId = null;
    } else {
      newListing._gallery = allImages;
      // Local mirror of the serverTimestamp() writes above, so the freshness badge/sort
      // is correct immediately rather than only after the next Firestore reload — set only
      // on create, never on the shared newListing object used by the edit branch too
      // (an edit must not reset the refresh clock).
      newListing._createdAtMs = now;
      newListing._lastRefreshedAtMs = now;
      listings.push(newListing);
      try {
        var saved = JSON.parse(localStorage.getItem('bairxUserListings') || '[]');
        saved.push(newListing);
        localStorage.setItem('bairxUserListings', JSON.stringify(saved));
      } catch(e) {}
    }

    // Mirror rent-intent submissions into the dedicated Rent section's data source too
    if (s.intent === 'rent' && typeof rentListings !== 'undefined') {
      const rentFeatureLabels = { furnished: 'Тавилгатай', parking: 'Гараж', elevator: 'Лифттэй', balcony: 'Тагттай', negotiable: 'Үнэ хэлэлцэх боломжтой' };
      const rentFeatures = s.features.map(f => rentFeatureLabels[f]).filter(Boolean);
      const rentId = 'u' + targetId;
      const rentEntry = {
        id: rentId, type: 'monthly',
        title: newListing.title, loc: newListing.loc,
        price: p, deposit: parseFloat((p * 2).toFixed(1)),
        area: a, rooms: isLand ? 0 : (parseInt(s.rooms) || 1),
        features: rentFeatures.length ? rentFeatures : ['Хэрэглэгчийн зар'],
        protected: true, img: newListing.img
      };
      const ridx = rentListings.findIndex(x => x.id === rentId);
      if (ridx > -1) rentListings[ridx] = rentEntry; else rentListings.push(rentEntry);
      const activeRentTab = document.querySelector('.rent-tab.active');
      if (typeof renderRentListings === 'function') renderRentListings(activeRentTab?.dataset.rentType || 'all');
    }

    if (s.name || s.phone) {
      sellerData[targetId] = {
        phone: s.phone || '9900-0000',
        name: s.name || 'Хэрэглэгч',
        type: s.role === 'agent' ? 'Агент' : (s.role === 'company' ? 'Компани' : 'Хувь хүн'),
        company: currentUser?.companyName || ''
      };
      try {
        const sd = JSON.parse(localStorage.getItem('bairxSellerData') || '{}');
        sd[targetId] = sellerData[targetId];
        localStorage.setItem('bairxSellerData', JSON.stringify(sd));
      } catch(e) {}
    }

    renderHomeListings();
    renderListings(getFilteredListings());
    updateCatPillCounts();
    renderMyListings();
    if (typeof renderDashboard === 'function') renderDashboard();

    // True whenever this listing did NOT make it to the server — either the Firestore
    // write itself failed, or it was never attempted at all because the user is signed
    // out or at least one photo never got a real Storage URL (see allImagesSynced above).
    // Guests submitting device-local listings used to see the "under admin review"
    // message here even though nothing had actually left the device — this now matches
    // reality in every case, not just an actual Firestore error.
    addListingState._syncFailed = !(currentUser && allImagesSynced) || firestoreSaveFailed;
    addListingState.step = 8;
    // The listing itself (local or synced) now holds this data — the in-progress draft
    // copy would otherwise resurface stale text the next time the wizard is opened.
    clearDraftStorage();
    document.getElementById('modalContent').innerHTML = renderAddListing();
  }

  // Sweeps every user-submitted listing and auto-marks anything past its plan duration as
  // expired — only ever applies to a currently-active listing (30 days *of being live*, not
  // 30 days since a pending/rejected one was submitted). Never deletes anything: this writes
  // status:'expired' to Firestore so the listing survives, drops out of public view (the same
  // way every other status change does), and the owner can renew it from "Миний зарууд".
  function checkExpiredListings() {
    const now = Date.now();
    let changed = false;
    listings.forEach(l => {
      if (l.userSubmitted && l.status === 'active' && l.expiresAt && now > l.expiresAt && !l._expired) {
        l._expired = true;
        l._inactive = true;
        l.status = 'expired';
        changed = true;
        if (l.firestoreId) {
          db.collection('listings').doc(l.firestoreId).update({ status: 'expired' }).catch(() => {});
        }
      }
    });
    return changed;
  }

  function bumpMyListing(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    const now = Date.now();
    if (l._bumpedAt && now - l._bumpedAt < 86400000) {
      const hoursLeft = Math.ceil((86400000 - (now - l._bumpedAt)) / 3600000);
      showToast(`Дараагийн үнэгүй дээшлүүлэлт ${hoursLeft} цагийн дараа боломжтой`);
      return;
    }
    l._bumpedAt = now;
    if (l.firestoreId) db.collection('listings').doc(l.firestoreId).update({ bumpedAt: now }).catch(() => {});
    showToast('Зар дээшлүүлэгдлээ', 'success');
    renderMyListings();
    if (typeof renderDashboard === 'function') renderDashboard();
    renderListings(getFilteredListings());
    renderHomeListings();
  }

  // "Шинэчлэх" — marks a listing as still accurate. Writes ONLY lastRefreshedAt (a real
  // Firestore Timestamp, not a local Date.now() mirror pushed to the server) — must never
  // touch content, images, ownerId, or status. No cooldown: unlike bumpMyListing's paid/
  // free-tier 24h rate limit, the 14-day system is purely informational, so refreshing
  // early (e.g. an agent double-checking a listing is still accurate) is allowed on demand.
  async function refreshMyListing(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    const now = Date.now();
    l._lastRefreshedAtMs = now;
    if (l.firestoreId) {
      try {
        await db.collection('listings').doc(l.firestoreId).update({ lastRefreshedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        console.error('Refresh failed:', e.code, e.message);
        showToast('Шинэчлэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
        return;
      }
    }
    showToast('Зар шинэчлэгдлээ', 'success');
    renderMyListings();
    if (typeof renderDashboard === 'function') renderDashboard();
    renderListings(getFilteredListings());
    renderHomeListings();
  }

  // "Сунгах" — extends expiresAt by 30 days and (re)activates without going back through
  // admin review, since the listing's content hasn't changed. Works both for reactivating
  // an expired listing and for proactively extending one that's still active.
  async function renewMyListing(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    const now = Date.now();
    l.expiresAt = now + 30 * 86400000;
    l._expired = false;
    l._inactive = false;
    l._bumpedAt = now;
    l.status = 'active';
    if (l.firestoreId) {
      try {
        await db.collection('listings').doc(l.firestoreId).update({ expiresAt: l.expiresAt, status: 'active', bumpedAt: now });
      } catch(e) {}
    }
    showToast('Зар 30 хоногоор сунгагдлаа', 'success');
    renderMyListings('active');
    renderListings(getFilteredListings());
    renderHomeListings();
  }

  // Marks a listing as sold/rented — pulls it out of public view immediately (status
  // change alone does that, same mechanism as every other transition) and files it under
  // the "Зарагдсан/Түрээслэгдсэн" tab instead of deleting it.
  async function markSoldRented(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    const newStatus = l.cat === 'rent' ? 'rented' : 'sold';
    const confirmMsg = l.cat === 'rent' ? 'Энэ зарыг түрээслэгдсэн гэж тэмдэглэх үү? Нийтэд харагдахаа болино.' : 'Энэ зарыг зарагдсан гэж тэмдэглэх үү? Нийтэд харагдахаа болино.';
    if (!confirm(confirmMsg)) return;
    l.status = newStatus;
    l._inactive = true;
    if (l.firestoreId) {
      try { await db.collection('listings').doc(l.firestoreId).update({ status: newStatus }); } catch(e) {}
    }
    showToast(newStatus === 'rented' ? 'Түрээслэгдсэн болгов' : 'Зарагдсан болгов', 'success');
    renderMyListings('sold');
    renderListings(getFilteredListings());
    renderHomeListings();
    if (typeof renderDashboard === 'function') renderDashboard();
  }

  const MY_LISTINGS_TABS = ['active', 'pending', 'rejected', 'expired', 'sold'];
  const MY_LISTINGS_EMPTY_MSG = {
    active: 'Нийтлэгдсэн зар байхгүй байна.',
    pending: 'Хянагдаж буй зар байхгүй байна.',
    rejected: 'Буцаагдсан зар байхгүй байна.',
    expired: 'Хугацаа дууссан зар байхгүй байна.',
    sold: 'Зарагдсан/Түрээслэгдсэн зар байхгүй байна.'
  };
  const MY_LISTINGS_STATUS_META = {
    active: { label: 'Нийтлэгдсэн', cls: 'badge new' },
    pending: { label: 'Хянагдаж байна', cls: 'badge' },
    rejected: { label: 'Буцаагдсан', cls: 'badge' },
    expired: { label: 'Хаагдсан', cls: 'badge' },
    sold: { label: 'Зарагдсан', cls: 'badge' },
    rented: { label: 'Түрээслэгдсэн', cls: 'badge' }
  };

  let myListingsTab = 'active';
  function renderMyListings(tab) {
    checkExpiredListings();
    myListingsTab = tab || myListingsTab;
    MY_LISTINGS_TABS.forEach(t => {
      const btn = document.getElementById('myTab-' + t);
      if (btn) btn.classList.toggle('active', t === myListingsTab);
    });
    const grid = document.getElementById('myListingsGrid');
    if (!grid) return;
    const userListings = listings.filter(l => l.userSubmitted || l.badges.includes('user'));
    const shown = userListings.filter(l => {
      const st = l.status || 'active';
      return myListingsTab === 'sold' ? (st === 'sold' || st === 'rented') : st === myListingsTab;
    });
    if (shown.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 24px;color:var(--ink-3);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:0.4;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
        <div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:6px;">Зар байхгүй</div>
        <div style="font-size:13px;margin-bottom:20px;">${MY_LISTINGS_EMPTY_MSG[myListingsTab] || 'Одоогоор энэ хэсэгт зар байхгүй байна.'}</div>
        <button class="btn btn-blue agent-cta" onclick="openAddListing()">Зар нэмэх</button>
      </div>`;
      return;
    }
    grid.innerHTML = shown.map(l => {
      const isVip = l.badges.includes('vip');
      const st = l.status || 'active';
      const meta = MY_LISTINGS_STATUS_META[st] || MY_LISTINGS_STATUS_META.active;
      const daysLeft = l.expiresAt ? Math.ceil((l.expiresAt - Date.now()) / 86400000) : null;
      const canBump = st === 'active' && (!l._bumpedAt || Date.now() - l._bumpedAt >= 86400000);
      const freshDays = st === 'active' ? listingFreshnessDays(l) : null;
      const fresh = listingFreshnessStatus(freshDays);
      const freshColor = { fresh: 'var(--accent)', 'needs-refresh': 'var(--warning)', stale: 'var(--danger)', 'very-stale': 'var(--danger)' };

      let actions;
      if (st === 'pending') {
        actions = `
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();editMyListing(${l.id})">Засах</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:var(--danger);" onclick="event.stopPropagation();deleteMyListing(${l.id})">Устгах</button>
        `;
      } else if (st === 'rejected') {
        actions = `
          <button class="btn btn-blue" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();editMyListing(${l.id})">Засаад дахин илгээх</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:var(--danger);" onclick="event.stopPropagation();deleteMyListing(${l.id})">Устгах</button>
        `;
      } else if (st === 'expired') {
        actions = `
          <button class="btn btn-blue" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();renewMyListing(${l.id})">Сунгах</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();editMyListing(${l.id})">Засах</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:var(--danger);" onclick="event.stopPropagation();deleteMyListing(${l.id})">Устгах</button>
        `;
      } else if (st === 'sold' || st === 'rented') {
        actions = `
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:var(--danger);" onclick="event.stopPropagation();deleteMyListing(${l.id})">Устгах</button>
        `;
      } else {
        actions = `
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:${canBump ? 'var(--primary)' : 'var(--ink-3)'};" onclick="event.stopPropagation();bumpMyListing(${l.id})" title="24 цагт нэг удаа үнэгүй">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            Дээшлүүлэх
          </button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:${fresh && fresh.key !== 'fresh' ? 'var(--warning)' : ''};" onclick="event.stopPropagation();refreshMyListing(${l.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Шинэчлэх
          </button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();renewMyListing(${l.id})">Сунгах</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();openBoostModal(${l.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Boost
          </button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();editMyListing(${l.id})">Засах</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;" onclick="event.stopPropagation();markSoldRented(${l.id})">${l.cat === 'rent' ? 'Түрээслэгдсэн болгох' : 'Зарагдсан болгох'}</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;min-width:0;color:var(--danger);" onclick="event.stopPropagation();deleteMyListing(${l.id})">Устгах</button>
        `;
      }

      return `
      <article class="listing-card" onclick="showPage('listings'); setTimeout(()=>openListing(${l.id}),150)" style="${st !== 'active' ? 'opacity:0.75;' : ''}">
        <div class="listing-img">
          <img src="${esc(l.img)}" alt="${esc(l.title)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #1E5BFF)';"/>
          <div class="listing-badges">
            ${isVip ? '<span class="badge vip">⭐ VIP</span>' : ''}
            <span class="${meta.cls}">${meta.label}</span>
            ${fresh ? `<span class="badge" style="background:${freshColor[fresh.key]};color:#fff;">${esc(fresh.label)}</span>` : ''}
          </div>
        </div>
        <div class="listing-body">
          <div class="listing-price-row">
            <div class="listing-price">${fmtPrice(l.price)}</div>
          </div>
          <h3 class="listing-title">${esc(l.title)}</h3>
          <div class="listing-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(l.loc)}</div>
          <div class="listing-meta">
            <span class="listing-meta-item"><strong>${l.area}</strong> м²</span>
            <span class="listing-meta-item"><strong>${l.rooms}</strong> өрөө</span>
            <span class="listing-meta-item">👁 <strong>${l.viewCount || 0}</strong></span>
          </div>
          ${st === 'rejected' && l.rejectionReason ? `<div style="font-size:11.5px;color:var(--danger);margin-top:6px;">Шалтгаан: ${esc(l.rejectionReason)}</div>` : ''}
          ${st === 'active' && daysLeft !== null ? `<div style="font-size:11px;color:var(--ink-3);margin-top:6px;">${daysLeft > 0 ? daysLeft + ' хоногийн дараа дуусна' : 'Өнөөдөр дуусна'}</div>` : ''}
          ${fresh ? `<div style="font-size:11px;color:${freshColor[fresh.key]};margin-top:4px;font-weight:600;">${esc(fresh.badgeText)}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
            ${actions}
          </div>
        </div>
      </article>
    `}).join('');
  }

  let boostTargetId = null;

  function openBoostModal(id) {
    const l = listings.find(x => x.id === id);
    if (!l) return;
    boostTargetId = id;
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:36px;margin-bottom:8px;">⚡</div>
          <h3 style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;margin-bottom:6px;">Зараа дэмжих</h3>
          <div style="font-size:13px;color:var(--ink-3);">${esc(l.title)}</div>
        </div>
        <div style="display:grid;gap:12px;">
          ${[
            { icon:'⭐', name:'VIP', price:'15,000 ₮', days: 60, desc:'60 хоног · VIP шошго · Нүүр хуудас, хайлтын үр дүнд эхэнд харагдана', color:'#FFB020' },
            { icon:'💎', name:'Онцлох', price:'35,000 ₮', days: 90, desc:'90 хоног · VIP шошго · Нүүр хуудас, хайлтын үр дүнд эхэнд харагдана', color:'#009878' }
          ].map(p => `
            <div style="border:2px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:border-color 0.15s;" onclick="confirmBoost('${p.name}', '${p.price}', ${p.days})">
              <div style="font-size:28px;">${p.icon}</div>
              <div style="flex:1;">
                <div style="font-weight:700;color:${p.color};">${p.name} — ${p.price}</div>
                <div style="font-size:12px;color:var(--ink-3);margin-top:2px;">${p.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          `).join('')}
        </div>
        <div style="font-size:11.5px; color:var(--ink-3); margin-top:14px; line-height:1.5;">Энэ бол жишээ/demo төлбөрийн урсгал — бодит төлбөрийн систем холбогдоогүй.</div>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:16px;" onclick="closeModal()">Цуцлах</button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function confirmBoost(plan, price, days) {
    // Add vip badge and extend expiresAt by the plan's promised duration — matching the same
    // real mechanism (badge + expiresAt) the listing-creation wizard's VIP/Featured plans use,
    // so a boost bought from here behaves identically to one bought at creation time.
    if (boostTargetId) {
      const bl = listings.find(x => x.id === boostTargetId);
      if (bl) {
        if (!bl.badges.includes('vip')) bl.badges.push('vip');
        const base = (bl.expiresAt && bl.expiresAt > Date.now()) ? bl.expiresAt : Date.now();
        bl.expiresAt = base + (days || 30) * 86400000;
        if (bl.firestoreId) {
          db.collection('listings').doc(bl.firestoreId).update({ badges: bl.badges, expiresAt: bl.expiresAt }).catch(() => {});
        }
      }
      const txn = { listingId: boostTargetId, listingTitle: bl?.title || '', plan, price, date: Date.now() };
      try {
        const boosted = JSON.parse(localStorage.getItem('bairxBoostedListings') || '[]');
        if (!boosted.includes(boostTargetId)) boosted.push(boostTargetId);
        localStorage.setItem('bairxBoostedListings', JSON.stringify(boosted));
        const txns = JSON.parse(localStorage.getItem('bairxTransactions') || '[]');
        txns.unshift(txn);
        localStorage.setItem('bairxTransactions', JSON.stringify(txns));
      } catch(e) {}
      if (currentUser) {
        db.collection('transactions').add(Object.assign({}, txn, {
          userId: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })).catch(() => {});
      }
      renderMyListings();
    if (typeof renderDashboard === 'function') renderDashboard();
      renderHomeListings();
      renderListings(getFilteredListings());
    }
    closeModal();
    setTimeout(() => {
      document.getElementById('modalContent').innerHTML = `
        <button class="modal-close" onclick="closeModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <div style="padding:40px 28px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h3 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:8px;">${plan} идэвхжлээ!</h3>
          <div style="font-size:14px;color:var(--ink-3);margin-bottom:24px;">${price} төлбөр баталгаажлаа (Demo горим)</div>
          <button class="btn btn-blue btn-lg" onclick="closeModal()">Ойлголоо</button>
        </div>
      `;
      document.getElementById('modal').classList.add('open');
      document.body.style.overflow = 'hidden';
    }, 250);
    showToast(plan + ' идэвхжлээ!', 'success');
    boostTargetId = null;
  }

  async function deleteMyListing(id) {
    if (!confirm('Та энэ зарыг устгахдаа итгэлтэй байна уу?')) return;
    const l = listings.find(x => x.id === id);
    if (l?.firestoreId) {
      try {
        await db.collection('listings').doc(l.firestoreId).delete();
      } catch (e) {
        console.error('Delete failed:', e.code, e.message);
        showToast('Устгахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
        return;
      }
    }
    const idx = listings.findIndex(x => x.id === id);
    if (idx > -1) listings.splice(idx, 1);
    try {
      const saved = JSON.parse(localStorage.getItem('bairxUserListings') || '[]').filter(x => x.id !== id);
      localStorage.setItem('bairxUserListings', JSON.stringify(saved));
    } catch(e) {}
    renderMyListings();
    if (typeof renderDashboard === 'function') renderDashboard();
    renderHomeListings();
    renderListings(getFilteredListings());
    updateCatPillCounts();
    showToast('Зар устгагдлаа');
  }

  function blankAddListingState() {
    return {
      step: 1, intent: 'sell', propertyType: '',
      title: '', district: '', khoroo: '', address: '', geoLat: null, geoLng: null, area: '', rooms: '',
      bedrooms: '', bathrooms: '', floor: '', totalFloors: '', year: '', buildingName: '', complex: '', landArea: '',
      price: '', buildingType: '', heating: '', insulationType: '', windowDirection: '', hoaFee: '',
      condition: '', usageType: '', deposit: '', minTerm: '', constructionProgress: '',
      description: '', features: [], paymentTerms: [], images: [],
      videoUrl: '', tourUrl: '', floorPlan: null,
      phone: '', name: '', role: 'owner', plan: 'basic'
    };
  }

  function confirmCloseAddListing() {
    if (addListingState.step === 8 || addListingState.step === 1) {
      closeModal();
      addListingState = blankAddListingState();
      editingListingId = null; // was never reset here — a cancelled edit used to silently overwrite the same listing on the next fresh submission
      clearDraftStorage();
      return;
    }
    if (confirm('Зар нэмэх процессоос гарвал оруулсан мэдээлэл устгагдана. Үргэлжлүүлэх үү?')) {
      closeModal();
      addListingState = blankAddListingState();
      editingListingId = null;
      clearDraftStorage();
    }
  }

