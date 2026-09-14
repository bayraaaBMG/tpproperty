  // ===== CMS — Хуудас удирдлага (Page Management) + Дизайн (Theme) =====
  // A structured, safe CMS layered on top of the existing site. It controls CONTENT
  // (text/media/links), VISIBILITY, ORDER of a set of sections, a shared organization
  // profile, and the site THEME (brand colours) — never business logic. Property search,
  // listing cards, favorites, compare and auth stay native app components; the CMS never
  // touches them.
  //
  // Data model (see firestore.rules):
  //   siteSettings/organization   — shared org profile (public read, admin write)
  //   siteSettings/theme          — published brand colours (public read, admin write)
  //   sitePages/{pageId}          — admin working copy { draft, versions[], meta } (admin only)
  //   sitePagesPublic/{pageId}    — published snapshot the public site reads (public read, admin write)
  //   cms-media/*                 — Firebase Storage images (public read, admin write)
  //
  // Content is an ordered array of structured blocks: { id, type, order, visible, content }.
  // No block carries raw HTML/script — every field is a plain string, a validated URL, or a
  // list of structured items, escaped at render (esc) or set via textContent. The project
  // had real stored-XSS incidents, so the CMS accepts structured fields only.

  const CMS_PAGES = [
    { id: 'home', title: 'Нүүр хуудас', editable: true },
    { id: 'about', title: 'Бидний тухай', editable: true, infoKey: 'about' },
    { id: 'services', title: 'Үйлчилгээ', editable: true, infoKey: 'services' },
    { id: 'newdev', title: 'Шинэ орон сууц', editable: true, target: 'newdev' },
    { id: 'contact', title: 'Холбоо барих', editable: true, infoKey: 'contact' }
  ];
  const CMS_INFO_PAGE_IDS = { about: 'about', services: 'services', contact: 'contact' };

  // kind: 'fields' (flat) | 'repeater' (list of items). system: can't hide/remove.
  // addable: offered in the "+ Хэсэг нэмэх" picker. field: [key, label, type].
  const CMS_BLOCK_TYPES = {
    hero:     { label: 'Гарчиг (Hero)', kind: 'fields', system: true,
                fields: [ ['title', 'Гарчиг', 'text'], ['subtitle', 'Дэд гарчиг', 'textarea'],
                          ['buttonText', 'Товч 1 нэр', 'text'], ['buttonUrl', 'Товч 1 холбоос', 'url'],
                          ['button2Text', 'Товч 2 нэр', 'text'], ['button2Url', 'Товч 2 холбоос', 'url'],
                          ['backgroundImage', 'Дэвсгэр зураг', 'image'] ] },
    banks:    { label: 'Хамтрагч банк, санхүү', kind: 'repeater', togglable: true,
                itemFields: [ ['name', 'Нэр', 'text'], ['short', 'Товч (лого дээрх)', 'text'],
                              ['color', 'Лого өнгө', 'color'], ['url', 'Холбоос', 'url'] ] },
    features: { label: 'Онцлох давуу тал', kind: 'repeater', togglable: true,
                itemFields: [ ['title', 'Гарчиг', 'text'], ['description', 'Тайлбар', 'textarea'] ] },
    text:     { label: 'Текст', kind: 'fields', togglable: true, addable: true,
                fields: [ ['title', 'Гарчиг', 'text'], ['body', 'Текст', 'textarea'], ['align', 'Байрлал', 'align'] ] },
    cta:      { label: 'Уриалга (CTA)', kind: 'fields', togglable: true, addable: true,
                fields: [ ['title', 'Гарчиг', 'text'], ['description', 'Тайлбар', 'textarea'],
                          ['buttonText', 'Товчны нэр', 'text'], ['buttonUrl', 'Товчны холбоос', 'url'] ] },
    image:    { label: 'Зураг', kind: 'fields', togglable: true, addable: true,
                fields: [ ['imageUrl', 'Зураг', 'image'], ['alt', 'Alt текст', 'text'],
                          ['caption', 'Тайлбар', 'text'], ['linkUrl', 'Холбоос', 'url'] ] },
    video:    { label: 'Видео', kind: 'fields', togglable: true, addable: true,
                fields: [ ['videoUrl', 'Видео (YouTube/Vimeo/MP4)', 'url'], ['title', 'Гарчиг', 'text'] ] },
    gallery:  { label: 'Галерей', kind: 'repeater', togglable: true, addable: true,
                itemFields: [ ['imageUrl', 'Зураг', 'image'], ['caption', 'Тайлбар', 'text'], ['alt', 'Alt текст', 'text'] ] },
    faq:      { label: 'Түгээмэл асуулт (FAQ)', kind: 'repeater', togglable: true, addable: true,
                itemFields: [ ['question', 'Асуулт', 'text'], ['answer', 'Хариулт', 'textarea'] ] },
    stats:    { label: 'Статистик', kind: 'repeater', togglable: true, addable: true,
                itemFields: [ ['number', 'Тоо', 'text'], ['label', 'Тайлбар', 'text'] ] },
    contact:  { label: 'Холбоо барих (байгууллагаас)', kind: 'fields', togglable: true, addable: true,
                fields: [ ['title', 'Гарчиг', 'text'], ['note', 'Тэмдэглэл', 'textarea'] ] },
    map:      { label: 'Газрын зураг', kind: 'fields', togglable: true, addable: true,
                fields: [ ['title', 'Гарчиг', 'text'], ['address', 'Хаяг', 'text'], ['lat', 'Өргөрөг', 'text'], ['lng', 'Уртраг', 'text'] ] },
    divider:  { label: 'Зай / Зураас', kind: 'fields', togglable: true, addable: true, fields: [] }
  };

  function cmsDefaultBanks() {
    return [
      { name: 'Хаан Банк', short: 'ХБ', color: '#0066B3', url: 'https://www.khanbank.com/personal/product/detail/39/' },
      { name: 'Голомт Банк', short: 'ГБ', color: '#E31E24', url: 'https://www.golomtbank.com/retail/loans/786' },
      { name: 'Худалдаа Хөгжлийн', short: 'ХХБ', color: '#003F87', url: 'https://www.tdbm.mn/mn/retail/loans/oron-suutsnii-zeel/oron-suuc-khudaldan-avakh-zeel' },
      { name: 'Төрийн Банк', short: 'ТБ', color: '#FFB81C', url: 'https://www.statebank.mn/personal/product/10054' },
      { name: 'Хас Банк', short: 'ХА', color: '#00A651', url: 'https://xacbank.mn/mortgage' },
      { name: 'Капитрон', short: 'КБ', color: '#7B2CBF', url: 'https://www.capitronbank.mn/c/' },
      { name: 'Ариг Банк', short: 'АБ', color: '#FF6B35', url: 'https://www.arigbank.mn/mn/product/loan/26' },
      { name: 'Богд Банк', short: 'ББ', color: '#0A1628', url: 'https://www.bogdbank.com/product/53' }
    ];
  }
  function cmsDefaultHomeSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Зөв байр, зөв боломжийг TP Property-ээс хай',
          subtitle: 'Орон сууц, түрээс, газар, оффисын зарыг нэг дороос.' } },
      { id: 'banks', type: 'banks', order: 2, visible: true, content: { label: 'Банк дээр дарж шууд зээлийн хуудсанд нь орно уу', items: cmsDefaultBanks() } },
      { id: 'features', type: 'features', order: 3, visible: true, content: { items: [] } }
    ];
  }
  function cmsDefaultAboutSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Бидний тухай', subtitle: 'Ти Пи Приват Проперти ХХК — үл хөдлөх хөрөнгө зуучлалын мэргэжлийн үйлчилгээ.' } },
      { id: 'about-intro', type: 'text', order: 2, visible: true, content: {
          title: 'Эрхэм зорилго',
          body: 'Харилцагч, үйлчлүүлэгчдийн итгэлийг хүлээж, эрх ашгийг хамгаалсан, зах зээлийн бодит мэдээлэлд үндэслэсэн хурдан шуурхай, найдвартай үйлчилгээ үзүүлэх.', align: 'left' } },
      { id: 'about-stats', type: 'stats', order: 3, visible: true, content: { items: [
          { number: '2023', label: 'Байгуулагдсан он' }, { number: '10', label: 'Ажилтны тоо' },
          { number: 'Сүхбаатар', label: 'Байршил' } ] } }
    ];
  }
  function cmsDefaultServicesSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Үйлчилгээ', subtitle: 'Худалдаа, түрээс, зуучлал, үнэлгээ — нэг дороос.' } },
      { id: 'svc-features', type: 'features', order: 2, visible: true, content: { items: [
          { title: 'Худалдаа зуучлал', description: 'Орон сууц, газар, оффисын худалдааг мэргэжлийн түвшинд зохион байгуулна.' },
          { title: 'Түрээсийн үйлчилгээ', description: 'Түрээслэгч, түрээслүүлэгчийг холбож, гэрээ, баримт бичгийг бүрдүүлнэ.' },
          { title: 'Үнэлгээ, зөвлөгөө', description: 'Зах зээлийн бодит үнэлгээ, зээлийн нөхцөлийн зөвлөгөө өгнө.' } ] } }
    ];
  }
  function cmsDefaultNewdevSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Шинэ орон сууц', subtitle: 'Хотхон, төслүүдийн мэдээллийг нэг дороос харна уу.' } }
    ];
  }
  function cmsDefaultContactSections() {
    return [
      { id: 'hero', type: 'hero', order: 1, visible: true, content: {
          title: 'Холбоо барих', subtitle: 'Бидэнтэй холбогдох мэдээлэл.' } },
      { id: 'contact-main', type: 'contact', order: 2, visible: true, content: {
          title: 'Холбоо барих мэдээлэл', note: 'Доорх мэдээллээр бидэнтэй холбогдоно уу.' } }
    ];
  }
  function cmsDefaultSectionsFor(pageId) {
    if (pageId === 'home') return cmsDefaultHomeSections();
    if (pageId === 'about') return cmsDefaultAboutSections();
    if (pageId === 'services') return cmsDefaultServicesSections();
    if (pageId === 'newdev') return cmsDefaultNewdevSections();
    if (pageId === 'contact') return cmsDefaultContactSections();
    return [];
  }
  function cmsDefaultOrganization() {
    return {
      name: 'TP Property', description: 'Үл хөдлөх хөрөнгийн худалдаа, түрээс, зуучлалын мэргэжлийн үйлчилгээ.',
      phone: '', email: '', website: '', address: '', workingHours: '',
      facebook: 'https://www.facebook.com/TPprivatepropertyLLC', instagram: '', youtube: '', tiktok: '', mapUrl: '', logoUrl: ''
    };
  }
  function cmsDefaultTheme() {
    return { primary: '#272B68', primaryDeep: '#1B1D4D', primarySoft: '#E8E9F4', primaryGlow: '#7C83D0', accent: '#00D4AA' };
  }

  // ---- Validators ----
  function cmsSafeUrl(url) {
    if (!url) return '';
    try { const u = new URL(String(url).trim()); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : ''; } catch (e) { return ''; }
  }
  // Strict #RGB / #RRGGBB — blocks any CSS-injection payload (</style>, url(), expression(), etc.).
  function cmsSafeHex(v) {
    if (typeof v !== 'string') return '';
    const t = v.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t) ? t.toUpperCase() : '';
  }
  function cmsVideoEmbed(url) {
    const safe = cmsSafeUrl(url);
    if (!safe) return null;
    try {
      const u = new URL(safe);
      if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtu.be') {
        let id = '';
        if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
        else if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
        else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1];
        else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1];
        id = (id || '').split(/[?&/]/)[0];
        return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? { kind: 'iframe', src: 'https://www.youtube.com/embed/' + id } : null;
      }
      if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
        const id = (u.pathname.split('/').filter(Boolean)[0] || '').split(/[?&]/)[0];
        return /^\d{5,}$/.test(id) ? { kind: 'iframe', src: 'https://player.vimeo.com/video/' + id } : null;
      }
      if (/\.mp4($|\?)/i.test(u.pathname)) return { kind: 'video', src: safe };
      return null;
    } catch (e) { return null; }
  }

  // ===================================================================================
  //  PUBLIC SIDE
  // ===================================================================================
  let _cmsPublicCache = {};
  let _cmsOrgCache = null;
  let _cmsThemeCache = null;
  let _cmsPreviewOverride = null;
  let _cmsThemePreview = null;
  let _cmsPublicSeoCache = {};

  function cmsDefaultSeo(pageId) {
    const t = (CMS_PAGES.find(p => p.id === pageId) || {}).title || 'TP Property';
    return { seoTitle: '', metaDescription: '', canonical: '', ogTitle: '', ogDescription: '', ogImage: '', twitterTitle: '', twitterDescription: '', noindex: false, _pageTitle: t };
  }
  async function cmsLoadPublishedSeo(pageId) {
    if (_cmsPublicSeoCache[pageId]) return _cmsPublicSeoCache[pageId];
    let seo = cmsDefaultSeo(pageId);
    try {
      const snap = await db.collection('sitePagesPublic').doc(pageId).get();
      if (snap.exists && snap.data().seo && typeof snap.data().seo === 'object') seo = Object.assign(seo, snap.data().seo);
    } catch (e) { if (e.code !== 'permission-denied') console.error('cmsLoadPublishedSeo failed:', e.code, e.message); }
    _cmsPublicSeoCache[pageId] = seo;
    return seo;
  }
  // Apply per-page SEO to <head>. Only ever writes plain text / validated URLs into meta content.
  function cmsApplySeo(pageId, seo) {
    if (!seo) return;
    const org = _cmsOrgCache || cmsDefaultOrganization();
    const setMeta = (sel, attr, key, val) => {
      if (!val) return;
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', String(val));
    };
    const title = seo.seoTitle || seo._pageTitle;
    if (title) document.title = (pageId === 'home') ? title : title + ' | ' + (org.name || 'TP Property');
    if (seo.metaDescription) setMeta('meta[name="description"]', 'name', 'description', seo.metaDescription);
    // canonical
    if (cmsSafeUrl(seo.canonical)) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
      link.setAttribute('href', cmsSafeUrl(seo.canonical));
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', seo.ogTitle || title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', seo.ogDescription || seo.metaDescription);
    if (cmsSafeUrl(seo.ogImage)) setMeta('meta[property="og:image"]', 'property', 'og:image', cmsSafeUrl(seo.ogImage));
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.twitterTitle || seo.ogTitle || title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.twitterDescription || seo.ogDescription || seo.metaDescription);
    // robots noindex
    let robots = document.head.querySelector('meta[name="robots"]');
    if (seo.noindex === true) {
      if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
      robots.setAttribute('content', 'noindex, nofollow');
    } else if (robots && /noindex/i.test(robots.getAttribute('content') || '')) {
      robots.setAttribute('content', 'index, follow');
    }
  }
  // Render CMS content into a content page (about/services/contact modal body, or newdev container).
  // Falls back silently (returns false) when nothing is published, so hardcoded content stays.
  async function cmsRenderContentPage(pageId, hostEl) {
    if (!hostEl) return false;
    try {
      const [sections, org, seo] = await Promise.all([cmsLoadPublishedPage(pageId), cmsLoadOrganization(), cmsLoadPublishedSeo(pageId)]);
      const publishedExists = !!(_cmsPublicCache[pageId] && _cmsPublicCache[pageId].__published);
      const rendered = cmsRenderPageInto(hostEl, sections);
      cmsApplySeo(pageId, seo);
      return rendered;
    } catch (e) { console.error('cmsRenderContentPage failed:', e && e.code, e && e.message); return false; }
  }
  // Called by openInfoPage for CMS-managed info pages (about/services/contact).
  async function cmsRenderInfoPageBody(pageId, bodyEl) {
    if (!bodyEl || !CMS_INFO_PAGE_IDS[pageId]) return;
    const holder = document.createElement('div'); holder.className = 'cms-content-page';
    const ok = await cmsRenderContentPage(pageId, holder);
    if (ok) { bodyEl.textContent = ''; bodyEl.appendChild(holder); }
  }
  // Called when the newdev section is shown.
  async function cmsApplyNewdev() {
    const host = document.getElementById('cmsNewdevBlocks'); if (!host) return;
    const ok = await cmsRenderContentPage('newdev', host);
    host.hidden = !ok;
  }

  async function cmsLoadPublishedPage(pageId) {
    if (_cmsPreviewOverride && _cmsPreviewOverride.pageId === pageId) return _cmsPreviewOverride.sections;
    if (_cmsPublicCache[pageId]) return _cmsPublicCache[pageId];
    let sections = cmsDefaultSectionsFor(pageId);
    try {
      const snap = await db.collection('sitePagesPublic').doc(pageId).get();
      if (snap.exists && Array.isArray(snap.data().sections)) { if (snap.data().sections.length) sections = snap.data().sections; sections.__published = true; }
    } catch (e) { if (e.code !== 'permission-denied') console.error('cmsLoadPublishedPage failed:', e.code, e.message); }
    _cmsPublicCache[pageId] = sections;
    return sections;
  }
  async function cmsLoadOrganization() {
    if (_cmsOrgCache) return _cmsOrgCache;
    let org = cmsDefaultOrganization();
    try { const snap = await db.collection('siteSettings').doc('organization').get(); if (snap.exists) org = Object.assign(org, snap.data()); }
    catch (e) { if (e.code !== 'permission-denied') console.error('cmsLoadOrganization failed:', e.code, e.message); }
    _cmsOrgCache = org; return org;
  }
  async function cmsLoadTheme() {
    if (_cmsThemePreview) return _cmsThemePreview;
    if (_cmsThemeCache) return _cmsThemeCache;
    let theme = cmsDefaultTheme();
    try { const snap = await db.collection('siteSettings').doc('theme').get(); if (snap.exists) theme = Object.assign(theme, snap.data()); }
    catch (e) { if (e.code !== 'permission-denied') console.error('cmsLoadTheme failed:', e.code, e.message); }
    _cmsThemeCache = theme; return theme;
  }

  // Apply theme colours as CSS custom properties — the ONLY place theme data reaches the
  // DOM, and it can only ever emit `--token: #hex;` pairs (each re-validated by cmsSafeHex).
  function cmsApplyTheme(theme) {
    const el = document.getElementById('cmsThemeVars'); if (!el) return;
    const map = { primary: '--primary', primaryDeep: '--primary-deep', primarySoft: '--primary-soft', primaryGlow: '--primary-glow', accent: '--accent' };
    const rules = [];
    Object.keys(map).forEach(k => { const hex = cmsSafeHex(theme && theme[k]); if (hex) rules.push(map[k] + ': ' + hex + ';'); });
    el.textContent = rules.length ? (':root{' + rules.join('') + '}') : '';
  }

  function cmsBySection(sections) { const m = {}; (sections || []).forEach(s => { m[s.id] = s; }); return m; }
  function cmsApplyHero(hero) {
    if (!hero || !hero.content) return;
    const titleEl = document.querySelector('.hero-compact-title'), subEl = document.querySelector('.hero-compact-sub');
    if (titleEl && typeof hero.content.title === 'string') cmsRenderBrandTitle(titleEl, hero.content.title);
    if (subEl && typeof hero.content.subtitle === 'string') subEl.textContent = hero.content.subtitle;
  }
  function cmsRenderBrandTitle(el, text) {
    const BRAND = 'TP Property'; el.textContent = '';
    const idx = text.indexOf(BRAND);
    if (idx === -1) { el.textContent = text; return; }
    el.appendChild(document.createTextNode(text.slice(0, idx)));
    const em = document.createElement('em'); em.textContent = BRAND; el.appendChild(em);
    el.appendChild(document.createTextNode(text.slice(idx + BRAND.length)));
  }
  function cmsApplyBanks(block) {
    const section = document.getElementById('banks');
    const row = section && section.querySelector('.banks-row');
    if (!block || !row) { if (section && block) section.hidden = block.visible === false; return; }
    section.hidden = block.visible === false;
    if (block.content && typeof block.content.label === 'string') { const l = section.querySelector('.banks-label'); if (l) l.textContent = block.content.label; }
    const items = block.content && Array.isArray(block.content.items) ? block.content.items : null;
    if (!items) return;
    row.textContent = '';
    items.forEach(it => {
      const a = document.createElement('a'); a.className = 'bank-pill';
      const href = cmsSafeUrl(it.url); if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.title = String(it.name || '');
      const logo = document.createElement('div'); logo.className = 'bp-logo';
      const color = cmsSafeHex(it.color); if (color) logo.style.background = color;
      logo.textContent = String(it.short || '').slice(0, 4);
      const name = document.createElement('div'); name.className = 'bp-name'; name.textContent = String(it.name || '');
      a.appendChild(logo); a.appendChild(name); row.appendChild(a);
    });
  }
  function cmsApplyFeatures(block) {
    const section = document.getElementById('features'); if (!section) return;
    if (block) section.hidden = block.visible === false;
    const grid = section.querySelector('.features-grid');
    const items = block && block.content && Array.isArray(block.content.items) ? block.content.items : null;
    if (!grid || !items || !items.length) return;
    grid.textContent = '';
    items.forEach(it => {
      const card = document.createElement('div'); card.className = 'feature-card';
      const icon = document.createElement('div'); icon.className = 'feature-icon'; icon.textContent = '★';
      const h = document.createElement('h4'); h.textContent = String(it.title || '');
      const pgh = document.createElement('p'); pgh.textContent = String(it.description || '');
      card.appendChild(icon); card.appendChild(h); card.appendChild(pgh); grid.appendChild(card);
    });
  }
  function cmsRenderAdditiveBlocks(sections) {
    const host = document.getElementById('cmsHomeBlocks'); if (!host) return;
    host.textContent = '';
    const additive = (sections || []).filter(s => ['text', 'cta', 'image', 'video', 'divider', 'gallery', 'faq', 'stats', 'contact', 'map'].includes(s.type) && s.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!additive.length) { host.hidden = true; return; }
    host.hidden = false;
    const inner = document.createElement('div'); inner.className = 'section-inner cms-blocks-inner';
    additive.forEach(s => { const node = cmsBuildBlockNode(s); if (node) inner.appendChild(node); });
    host.appendChild(inner);
  }
  function cmsBuildBlockNode(s) {
    const c = s.content || {};
    const wrap = document.createElement('div'); wrap.className = 'cms-pub-block cms-pub-' + s.type;
    if (s.type === 'divider') { wrap.classList.add('cms-pub-divider'); return wrap; }
    if (s.type === 'text') {
      if (c.align) wrap.style.textAlign = ['left', 'center', 'right'].includes(c.align) ? c.align : 'left';
      if (c.title) { const h = document.createElement('h3'); h.className = 'cms-pub-title'; h.textContent = c.title; wrap.appendChild(h); }
      if (c.body) { const p = document.createElement('p'); p.className = 'cms-pub-body'; p.textContent = c.body; wrap.appendChild(p); }
      return wrap;
    }
    if (s.type === 'cta') {
      if (c.title) { const h = document.createElement('h3'); h.className = 'cms-pub-title'; h.textContent = c.title; wrap.appendChild(h); }
      if (c.description) { const p = document.createElement('p'); p.className = 'cms-pub-body'; p.textContent = c.description; wrap.appendChild(p); }
      const href = cmsSafeUrl(c.buttonUrl);
      if (c.buttonText && href) { const a = document.createElement('a'); a.className = 'btn btn-blue'; a.textContent = c.buttonText; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; wrap.appendChild(a); }
      return wrap;
    }
    if (s.type === 'image') {
      const src = cmsSafeUrl(c.imageUrl); if (!src) return null;
      const img = document.createElement('img'); img.className = 'cms-pub-img'; img.src = src; img.alt = String(c.alt || ''); img.loading = 'lazy';
      img.onerror = function () { this.style.display = 'none'; };
      let holder = img; const link = cmsSafeUrl(c.linkUrl);
      if (link) { const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.appendChild(img); holder = a; }
      wrap.appendChild(holder);
      if (c.caption) { const cap = document.createElement('div'); cap.className = 'cms-pub-caption'; cap.textContent = c.caption; wrap.appendChild(cap); }
      return wrap;
    }
    if (s.type === 'video') {
      const embed = cmsVideoEmbed(c.videoUrl); if (!embed) return null;
      if (c.title) { const h = document.createElement('h3'); h.className = 'cms-pub-title'; h.textContent = c.title; wrap.appendChild(h); }
      const frame = document.createElement('div'); frame.className = 'cms-pub-video';
      if (embed.kind === 'iframe') {
        const f = document.createElement('iframe');
        f.src = embed.src; f.setAttribute('allowfullscreen', ''); f.setAttribute('loading', 'lazy');
        f.setAttribute('title', String(c.title || 'Видео')); f.setAttribute('allow', 'accelerometer; encrypted-media; picture-in-picture');
        frame.appendChild(f);
      } else { const v = document.createElement('video'); v.src = embed.src; v.controls = true; v.setAttribute('playsinline', ''); frame.appendChild(v); }
      wrap.appendChild(frame); return wrap;
    }
    if (s.type === 'hero') {
      wrap.classList.add('cms-pub-hero');
      const bg = cmsSafeUrl(c.backgroundImage);
      if (bg) { wrap.classList.add('cms-pub-hero-bg'); wrap.style.backgroundImage = 'url("' + encodeURI(bg) + '")'; }
      if (c.title) { const h = document.createElement('h1'); h.className = 'cms-pub-hero-title'; cmsRenderBrandTitle(h, String(c.title)); wrap.appendChild(h); }
      if (c.subtitle) { const p = document.createElement('p'); p.className = 'cms-pub-hero-sub'; p.textContent = c.subtitle; wrap.appendChild(p); }
      const hb = document.createElement('div'); hb.className = 'cms-pub-hero-btns';
      const u1 = cmsSafeUrl(c.buttonUrl); if (c.buttonText && u1) { const a = document.createElement('a'); a.className = 'btn btn-blue'; a.textContent = c.buttonText; a.href = u1; a.target = '_blank'; a.rel = 'noopener noreferrer'; hb.appendChild(a); }
      const u2 = cmsSafeUrl(c.button2Url); if (c.button2Text && u2) { const a = document.createElement('a'); a.className = 'btn btn-ghost'; a.textContent = c.button2Text; a.href = u2; a.target = '_blank'; a.rel = 'noopener noreferrer'; hb.appendChild(a); }
      if (hb.children.length) wrap.appendChild(hb);
      return wrap;
    }
    if (s.type === 'features') {
      const items = Array.isArray(c.items) ? c.items : [];
      if (!items.length) return null;
      const grid = document.createElement('div'); grid.className = 'cms-pub-features';
      items.forEach(it => {
        const card = document.createElement('div'); card.className = 'cms-pub-feature';
        const ic = document.createElement('div'); ic.className = 'cms-pub-feature-icon'; ic.textContent = '\u2605'; card.appendChild(ic);
        if (it.title) { const h = document.createElement('h4'); h.textContent = String(it.title); card.appendChild(h); }
        if (it.description) { const pp = document.createElement('p'); pp.textContent = String(it.description); card.appendChild(pp); }
        grid.appendChild(card);
      });
      wrap.appendChild(grid); return wrap;
    }
    if (s.type === 'banks') {
      const items = Array.isArray(c.items) ? c.items : [];
      if (!items.length) return null;
      if (c.label) { const l = document.createElement('div'); l.className = 'cms-pub-caption'; l.textContent = c.label; wrap.appendChild(l); }
      const row = document.createElement('div'); row.className = 'cms-pub-banks';
      items.forEach(it => {
        const href = cmsSafeUrl(it.url);
        const pill = document.createElement(href ? 'a' : 'div'); pill.className = 'bank-pill';
        if (href) { pill.href = href; pill.target = '_blank'; pill.rel = 'noopener noreferrer'; }
        const logo = document.createElement('div'); logo.className = 'bp-logo';
        const col = cmsSafeHex(it.color); if (col) logo.style.background = col;
        logo.textContent = String(it.short || '').slice(0, 4);
        const nm = document.createElement('div'); nm.className = 'bp-name'; nm.textContent = String(it.name || '');
        pill.appendChild(logo); pill.appendChild(nm); row.appendChild(pill);
      });
      wrap.appendChild(row); return wrap;
    }
    if (s.type === 'gallery') {
      const items = (Array.isArray(c.items) ? c.items : []).filter(it => cmsSafeUrl(it.imageUrl));
      if (!items.length) return null;
      const grid = document.createElement('div'); grid.className = 'cms-pub-gallery';
      items.forEach(it => {
        const fig = document.createElement('figure'); fig.className = 'cms-pub-gal-item';
        const img = document.createElement('img'); img.src = cmsSafeUrl(it.imageUrl); img.alt = String(it.alt || it.caption || ''); img.loading = 'lazy';
        img.onerror = function () { const f = this.closest('.cms-pub-gal-item'); if (f) f.style.display = 'none'; };
        fig.appendChild(img);
        if (it.caption) { const cap = document.createElement('figcaption'); cap.textContent = String(it.caption); fig.appendChild(cap); }
        grid.appendChild(fig);
      });
      wrap.appendChild(grid); return wrap;
    }
    if (s.type === 'faq') {
      const items = (Array.isArray(c.items) ? c.items : []).filter(it => it.question);
      if (!items.length) return null;
      const list = document.createElement('div'); list.className = 'cms-pub-faq';
      items.forEach(it => {
        const d = document.createElement('details'); d.className = 'cms-pub-faq-item';
        const sm = document.createElement('summary'); sm.textContent = String(it.question); d.appendChild(sm);
        if (it.answer) { const pp = document.createElement('p'); pp.textContent = String(it.answer); d.appendChild(pp); }
        list.appendChild(d);
      });
      wrap.appendChild(list); return wrap;
    }
    if (s.type === 'stats') {
      const items = (Array.isArray(c.items) ? c.items : []).filter(it => it.number || it.label);
      if (!items.length) return null;
      const grid = document.createElement('div'); grid.className = 'cms-pub-stats';
      items.forEach(it => {
        const cell = document.createElement('div'); cell.className = 'cms-pub-stat';
        const n = document.createElement('div'); n.className = 'cms-pub-stat-num'; n.textContent = String(it.number || ''); cell.appendChild(n);
        const l = document.createElement('div'); l.className = 'cms-pub-stat-label'; l.textContent = String(it.label || ''); cell.appendChild(l);
        grid.appendChild(cell);
      });
      wrap.appendChild(grid); return wrap;
    }
    if (s.type === 'contact') {
      const org = _cmsOrgCache || cmsDefaultOrganization();
      if (c.title) { const h = document.createElement('h3'); h.className = 'cms-pub-title'; h.textContent = c.title; wrap.appendChild(h); }
      if (c.note) { const pp = document.createElement('p'); pp.className = 'cms-pub-body'; pp.textContent = c.note; wrap.appendChild(pp); }
      const list = document.createElement('div'); list.className = 'cms-pub-contact';
      const rowIf = (label, val, href) => {
        if (!val) return;
        const r = document.createElement('div'); r.className = 'cms-pub-contact-row';
        const lb = document.createElement('span'); lb.className = 'cms-pub-contact-label'; lb.textContent = label; r.appendChild(lb);
        if (href) { const a = document.createElement('a'); a.href = href; a.textContent = val; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } r.appendChild(a); }
        else { const sp = document.createElement('span'); sp.textContent = val; r.appendChild(sp); }
        list.appendChild(r);
      };
      rowIf('\u0423\u0442\u0430\u0441', org.phone, org.phone ? 'tel:' + String(org.phone).replace(/[^0-9+]/g, '') : '');
      rowIf('\u0418-\u043c\u044d\u0439\u043b', org.email, org.email ? 'mailto:' + org.email : '');
      rowIf('\u0425\u0430\u044f\u0433', org.address, '');
      rowIf('\u0410\u0436\u043b\u044b\u043d \u0446\u0430\u0433', org.workingHours, '');
      rowIf('Facebook', org.facebook ? 'Facebook \u0445\u0443\u0443\u0434\u0430\u0441' : '', cmsSafeUrl(org.facebook));
      rowIf('\u0412\u0435\u0431\u0441\u0430\u0439\u0442', org.website ? org.website : '', cmsSafeUrl(org.website));
      if (list.children.length) wrap.appendChild(list);
      return wrap;
    }
    if (s.type === 'map') {
      const lat = parseFloat(c.lat), lng = parseFloat(c.lng);
      if (c.title) { const h = document.createElement('h3'); h.className = 'cms-pub-title'; h.textContent = c.title; wrap.appendChild(h); }
      if (c.address) { const pp = document.createElement('p'); pp.className = 'cms-pub-body'; pp.textContent = c.address; wrap.appendChild(pp); }
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const frame = document.createElement('div'); frame.className = 'cms-pub-map';
        const f = document.createElement('iframe');
        const d = 0.01;
        f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + '%2C' + (lat - d) + '%2C' + (lng + d) + '%2C' + (lat + d) + '&layer=mapnik&marker=' + lat + '%2C' + lng;
        f.setAttribute('loading', 'lazy'); f.setAttribute('title', String(c.title || '\u0413\u0430\u0437\u0440\u044b\u043d \u0437\u0443\u0440\u0430\u0433'));
        frame.appendChild(f); wrap.appendChild(frame);
      }
      return (wrap.children.length ? wrap : null);
    }
    return null;
  }
  // Generic renderer: render every visible block of a page into a host element (non-home pages).
  function cmsRenderPageInto(hostEl, sections) {
    if (!hostEl) return false;
    hostEl.textContent = '';
    const blocks = (sections || []).filter(s => s && s.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    let rendered = 0;
    blocks.forEach(s => { const node = cmsBuildBlockNode(s); if (node) { hostEl.appendChild(node); rendered++; } });
    return rendered > 0;
  }
  function cmsApplyOrganization(org) {
    if (!org) return;
    const desc = document.querySelector('.footer-desc'); if (desc && org.description) desc.textContent = org.description;
    const fb = document.querySelector('.footer a[aria-label="Facebook"]'); if (fb) { const u = cmsSafeUrl(org.facebook); if (u) fb.setAttribute('href', u); }
  }
  function cmsApplySectionOrder(sections) {
    const togglable = (sections || []).filter(s => ['banks', 'features'].includes(s.type)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const nodes = togglable.map(s => document.getElementById(s.id)).filter(Boolean);
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i - 1].compareDocumentPosition(nodes[i]) & Node.DOCUMENT_POSITION_PRECEDING) nodes[i - 1].parentNode.insertBefore(nodes[i], nodes[i - 1].nextSibling);
    }
  }
  async function applySiteCms() {
    try {
      const [sections, org, theme] = await Promise.all([cmsLoadPublishedPage('home'), cmsLoadOrganization(), cmsLoadTheme()]);
      cmsApplyTheme(theme);
      const by = cmsBySection(sections);
      cmsApplyHero(by.hero); cmsApplyBanks(by.banks); cmsApplyFeatures(by.features);
      cmsRenderAdditiveBlocks(sections); cmsApplyOrganization(org); cmsApplySectionOrder(sections);
      const seo = await cmsLoadPublishedSeo('home'); cmsApplySeo('home', seo);
    } catch (e) { console.error('applySiteCms failed:', e.code, e.message); }
  }

  // ===================================================================================
  //  ADMIN SIDE
  // ===================================================================================
  let _cmsAdminPage = null, _cmsDraft = null, _cmsOrgDraft = null, _cmsThemeDraft = null, _cmsSeoDraft = null;
  let _cmsExpanded = {}, _cmsDirty = false;

  function cmsRequireEditor() {
    if (typeof isAdminOrOwnerUser === 'function' && isAdminOrOwnerUser()) return true;
    showToast('Танд энэ хэсгийг засах эрх байхгүй'); return false;
  }
  function cmsMarkDirty() { _cmsDirty = true; const b = document.getElementById('cmsDirtyFlag'); if (b) b.hidden = false; }

  async function renderAdminCmsSection() {
    const el = adminSectionEl(); if (!el) return;
    if (!cmsRequireEditor()) { el.innerHTML = adminErrorState('Хандах эрхгүй.', ''); return; }
    el.innerHTML = `<div class="admin-loading">Ачааллаж байна…</div>`;
    let org = cmsDefaultOrganization(), theme = cmsDefaultTheme(); const pageMeta = {};
    try {
      const [orgSnap, themeSnap, ...pageSnaps] = await Promise.all([
        db.collection('siteSettings').doc('organization').get(),
        db.collection('siteSettings').doc('theme').get(),
        ...CMS_PAGES.map(p => db.collection('sitePages').doc(p.id).get())
      ]);
      if (orgSnap.exists) org = Object.assign(org, orgSnap.data());
      if (themeSnap.exists) theme = Object.assign(theme, themeSnap.data());
      pageSnaps.forEach((snap, i) => { pageMeta[CMS_PAGES[i].id] = snap.exists ? snap.data() : null; });
    } catch (e) { el.innerHTML = adminErrorState('CMS мэдээлэл татахад алдаа гарлаа.', 'renderAdminCmsSection()'); return; }
    _cmsOrgDraft = Object.assign(cmsDefaultOrganization(), org);
    _cmsThemeDraft = Object.assign(cmsDefaultTheme(), theme);
    el.innerHTML = `
      <div class="cms-wrap">
        <div class="admin-tabs" style="margin-bottom:16px;">
          <button class="mytab active" onclick="cmsSwitchTab(this,'pages')">Хуудсууд</button>
          <button class="mytab" onclick="cmsSwitchTab(this,'org')">Байгууллага</button>
          <button class="mytab" onclick="cmsSwitchTab(this,'theme')">Дизайн ба өнгө</button>
        </div>
        <div id="cmsTab-pages">
          <div class="admin-panel">
            <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <span>Вэбсайтын хуудсууд</span>
              ${pageMeta['home'] ? '' : `<button class="btn btn-ghost btn-sm" onclick="cmsSeedFromCurrentContent()">Анхны агуулга үүсгэх</button>`}
            </div>
            <div class="admin-list-table">${CMS_PAGES.map(pg => cmsPageRowHtml(pg, pageMeta[pg.id])).join('')}</div>
          </div>
          <div id="cmsEditorWrap"></div>
        </div>
        <div id="cmsTab-org" hidden>
          <div class="admin-panel"><div class="admin-panel-head">Байгууллагын мэдээлэл</div>
            <div id="cmsOrgEditor">${cmsOrgEditorHtml(_cmsOrgDraft)}</div></div>
        </div>
        <div id="cmsTab-theme" hidden><div id="cmsThemeEditor">${cmsThemeEditorHtml(_cmsThemeDraft)}</div></div>
      </div>`;
  }
  function cmsSwitchTab(btn, tab) {
    document.querySelectorAll('.cms-wrap .admin-tabs .mytab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['pages', 'org', 'theme'].forEach(t => { const e = document.getElementById('cmsTab-' + t); if (e) e.hidden = t !== tab; });
  }
  function cmsStatusPill(meta) { const pub = meta && meta.status === 'published'; return `<span class="admin-status-pill status-${pub ? 'active' : 'pending'}">${pub ? 'Нийтэлсэн' : 'Ноорог'}</span>`; }
  function cmsPageRowHtml(pg, meta) {
    const updated = meta && meta.updatedAt?.toDate ? meta.updatedAt.toDate().toLocaleDateString() : '—';
    const actions = pg.editable
      ? `<button class="btn btn-blue btn-sm" onclick="cmsOpenPageEditor('${pg.id}')">Засах</button>
         <button class="btn btn-ghost btn-sm" onclick="cmsPreviewPage('${pg.id}')">Урьдчилан харах</button>`
      : `<span style="font-size:12px;color:var(--ink-3);">Удахгүй</span>`;
    return `<div class="admin-row"><div class="admin-row-body">
        <div class="admin-row-title">${esc(pg.title)} ${cmsStatusPill(meta)}</div>
        <div class="admin-row-meta">Сүүлд шинэчилсэн: ${esc(updated)}</div>
      </div><div class="admin-row-actions">${actions}</div></div>`;
  }

  // ---- Organization editor ----
  function cmsOrgField(label, key, val, type) {
    return `<div class="cms-field"><label class="cms-label">${esc(label)}</label>
      <input class="form-input" type="${type || 'text'}" id="cmsOrg-${key}" value="${esc(val || '')}" /></div>`;
  }
  function cmsOrgEditorHtml(org) {
    return `<div class="cms-grid">
        ${cmsOrgField('Нэр', 'name', org.name)} ${cmsOrgField('Утас', 'phone', org.phone)}
        ${cmsOrgField('И-мэйл', 'email', org.email, 'email')} ${cmsOrgField('Вебсайт', 'website', org.website, 'url')}
        ${cmsOrgField('Хаяг', 'address', org.address)} ${cmsOrgField('Ажлын цаг', 'workingHours', org.workingHours)}
        ${cmsOrgField('Facebook', 'facebook', org.facebook, 'url')} ${cmsOrgField('Instagram', 'instagram', org.instagram, 'url')}
        ${cmsOrgField('YouTube', 'youtube', org.youtube, 'url')} ${cmsOrgField('TikTok', 'tiktok', org.tiktok, 'url')}
        ${cmsOrgField('Google Maps', 'mapUrl', org.mapUrl, 'url')}
      </div>
      <div class="cms-field" style="margin-top:10px;"><label class="cms-label">Тайлбар</label>
        <textarea class="form-input" id="cmsOrg-description" rows="2">${esc(org.description || '')}</textarea></div>
      <div style="margin-top:12px;"><button class="btn btn-blue" onclick="cmsSaveOrganization()">Хадгалах</button></div>`;
  }
  function cmsReadOrgForm() {
    const g = k => (document.getElementById('cmsOrg-' + k) || {}).value || '';
    return { name: g('name').trim(), phone: g('phone').trim(), email: g('email').trim(), website: cmsSafeUrl(g('website')),
      address: g('address').trim(), workingHours: g('workingHours').trim(), facebook: cmsSafeUrl(g('facebook')),
      instagram: cmsSafeUrl(g('instagram')), youtube: cmsSafeUrl(g('youtube')), tiktok: cmsSafeUrl(g('tiktok')),
      mapUrl: cmsSafeUrl(g('mapUrl')), description: g('description').trim(), logoUrl: (_cmsOrgDraft && _cmsOrgDraft.logoUrl) || '' };
  }
  async function cmsSaveOrganization() {
    if (!cmsRequireEditor()) return;
    for (const [k, lbl] of [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['website', 'Вебсайт'], ['mapUrl', 'Google Maps']]) {
      const raw = (document.getElementById('cmsOrg-' + k) || {}).value || '';
      if (raw.trim() && !cmsSafeUrl(raw)) { showToast(lbl + ' холбоос буруу байна (http/https)'); return; }
    }
    const org = cmsReadOrgForm();
    try {
      await db.collection('siteSettings').doc('organization').set(Object.assign(org, { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }), { merge: true });
      _cmsOrgDraft = org; _cmsOrgCache = null;
      logAdminAction('cms_org_edit', 'siteSettings', 'organization', '');
      showToast('Байгууллагын мэдээлэл хадгалагдлаа', 'success');
    } catch (e) { console.error('cmsSaveOrganization failed:', e.code, e.message); showToast('Хадгалахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); }
  }

  // ---- Theme editor ----
  const CMS_THEME_FIELDS = [ ['primary', 'Үндсэн өнгө'], ['primaryDeep', 'Hover / гүн өнгө'], ['primarySoft', 'Цайвар өнгө'], ['primaryGlow', 'Онцлох (dark)'], ['accent', 'Accent өнгө'] ];
  const CMS_THEME_VARMAP = { primary: '--primary', primaryDeep: '--primary-deep', primarySoft: '--primary-soft', primaryGlow: '--primary-glow', accent: '--accent' };
  function cmsThemeEditorHtml(theme) {
    const rows = CMS_THEME_FIELDS.map(([k, lbl]) => {
      const v = cmsSafeHex(theme[k]) || cmsDefaultTheme()[k];
      return `<div class="cms-theme-row"><label class="cms-label">${esc(lbl)}</label>
        <div class="cms-theme-inputs">
          <input type="color" id="cmsTheme-c-${k}" value="${v}" oninput="cmsThemeInput('${k}', this.value)" aria-label="${esc(lbl)}" />
          <input type="text" class="form-input" id="cmsTheme-t-${k}" value="${v}" maxlength="7" oninput="cmsThemeInput('${k}', this.value)" />
        </div></div>`;
    }).join('');
    return `<div class="admin-panel"><div class="admin-panel-head">Дизайн ба өнгө</div>
      <div style="padding:14px 16px;">
        <div class="cms-theme-grid">${rows}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
          <button class="btn btn-ghost btn-sm" onclick="cmsThemePreviewToggle()">Урьдчилан харах</button>
          <button class="btn btn-ghost btn-sm" onclick="cmsThemeReset()">Анхны өнгө сэргээх</button>
          <button class="btn btn-blue btn-sm" onclick="cmsThemePublish()">Нийтлэх</button>
        </div>
        <div class="cms-theme-preview" id="cmsThemePreviewBox">${cmsThemePreviewHtml()}</div>
      </div></div>`;
  }
  function cmsThemePreviewHtml() {
    return `<div class="cms-preview-card">
        <div class="cms-preview-swatches">${CMS_THEME_FIELDS.map(([k, lbl]) => `<div class="cms-swatch"><span id="cmsSw-${k}" style="background:${cmsSafeHex(_cmsThemeDraft[k]) || cmsDefaultTheme()[k]}"></span>${esc(lbl)}</div>`).join('')}</div>
        <div class="cms-preview-live">
          <button class="btn btn-blue" id="cmsPvBtn">Хайх</button>
          <button class="btn" id="cmsPvBtn2" style="background:var(--primary-soft);color:var(--primary-deep);">Харьцуулах</button>
          <span class="cms-pv-link" id="cmsPvLink">Холбоос</span>
        </div></div>`;
  }
  function cmsThemeInput(key, value) {
    const hex = cmsSafeHex(value);
    const t = document.getElementById('cmsTheme-t-' + key), c = document.getElementById('cmsTheme-c-' + key);
    if (t && t.value !== value) t.value = value;
    if (hex) {
      if (c) c.value = hex;
      _cmsThemeDraft[key] = hex;
      const sw = document.getElementById('cmsSw-' + key); if (sw) sw.style.background = hex;
      if (_cmsThemePreview) { _cmsThemePreview = Object.assign({}, _cmsThemeDraft); cmsApplyTheme(_cmsThemePreview); }
      const box = document.getElementById('cmsThemePreviewBox'); if (box) box.style.setProperty(CMS_THEME_VARMAP[key], hex);
    }
  }
  function cmsThemePreviewToggle() {
    if (_cmsThemePreview) { _cmsThemePreview = null; _cmsThemeCache = null; applySiteCms(); showToast('Урьдчилан харах унтарлаа'); }
    else { _cmsThemePreview = Object.assign({}, _cmsThemeDraft); cmsApplyTheme(_cmsThemePreview); showToast('Урьдчилан харах — зөвхөн танд харагдана'); }
  }
  function cmsThemeReset() {
    if (!confirm('TP Property-ийн үндсэн өнгийг сэргээх үү?')) return;
    _cmsThemeDraft = cmsDefaultTheme();
    CMS_THEME_FIELDS.forEach(([k]) => { const c = document.getElementById('cmsTheme-c-' + k), t = document.getElementById('cmsTheme-t-' + k), sw = document.getElementById('cmsSw-' + k); if (c) c.value = _cmsThemeDraft[k]; if (t) t.value = _cmsThemeDraft[k]; if (sw) sw.style.background = _cmsThemeDraft[k]; });
    const box = document.getElementById('cmsThemePreviewBox'); if (box) box.removeAttribute('style');
    if (_cmsThemePreview) { _cmsThemePreview = Object.assign({}, _cmsThemeDraft); cmsApplyTheme(_cmsThemePreview); }
  }
  async function cmsThemePublish() {
    if (!cmsRequireEditor()) return;
    const bad = CMS_THEME_FIELDS.filter(([k]) => !cmsSafeHex(_cmsThemeDraft[k]));
    if (bad.length) { showToast(bad.length + ' өнгө буруу байна (#RRGGBB)'); return; }
    if (!confirm('Шинэ өнгийг нийтлэх үү? Сайтын өнгө шууд шинэчлэгдэнэ.')) return;
    const theme = {}; CMS_THEME_FIELDS.forEach(([k]) => { theme[k] = cmsSafeHex(_cmsThemeDraft[k]); });
    try {
      await db.collection('siteSettings').doc('theme').set(Object.assign(theme, { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }), { merge: true });
      _cmsThemePreview = null; _cmsThemeCache = null;
      logAdminAction('cms_theme_publish', 'siteSettings', 'theme', '');
      showToast('Дизайн нийтлэгдлээ', 'success'); applySiteCms();
    } catch (e) { console.error('cmsThemePublish failed:', e.code, e.message); showToast('Нийтлэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); }
  }

  // ---- Page editor ----
  async function cmsOpenPageEditor(pageId) {
    if (!cmsRequireEditor()) return;
    const pg = CMS_PAGES.find(p => p.id === pageId); if (!pg || !pg.editable) return;
    _cmsAdminPage = pageId; _cmsDirty = false; _cmsExpanded = {};
    let draft = cmsDefaultSectionsFor(pageId); let seo = cmsDefaultSeo(pageId);
    try { const snap = await db.collection('sitePages').doc(pageId).get(); if (snap.exists) { const dd = snap.data(); if (dd.draft && Array.isArray(dd.draft.sections)) draft = dd.draft.sections; if (dd.seo && typeof dd.seo === 'object') seo = Object.assign(seo, dd.seo); } }
    catch (e) { console.error('cmsOpenPageEditor load failed:', e.code, e.message); }
    _cmsSeoDraft = seo;
    _cmsDraft = draft.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    cmsRenderEditor();
    const wrap = document.getElementById('cmsEditorWrap'); if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cmsRenderEditor() {
    const wrap = document.getElementById('cmsEditorWrap'); if (!wrap || !_cmsDraft) return;
    const pg = CMS_PAGES.find(p => p.id === _cmsAdminPage);
    wrap.innerHTML = `
      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>${esc(pg ? pg.title : '')} — хэсгүүд <span id="cmsDirtyFlag" ${_cmsDirty ? '' : 'hidden'} style="font-size:11px;color:var(--warning);font-weight:600;">• Хадгалаагүй</span></span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" onclick="cmsShowVersions()">Хувилбарууд</button>
            <button class="btn btn-ghost btn-sm" onclick="cmsPreviewCurrentDraft()">Урьдчилан харах</button>
            <button class="btn btn-ghost btn-sm" onclick="cmsSaveDraft()">Ноорог хадгалах</button>
            <button class="btn btn-blue btn-sm" onclick="cmsPublish()">Нийтлэх</button>
          </div>
        </div>
        <div id="cmsBlocks">${_cmsDraft.map((b, i) => cmsBlockHtml(b, i)).join('')}</div>
        <div style="padding:12px 16px;"><button class="btn btn-ghost" onclick="cmsShowAddBlock()">+ Хэсэг нэмэх</button></div>
        <div id="cmsAddBlockWrap"></div>
        <div id="cmsVersionsWrap"></div>
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>Хайлтын тохиргоо (SEO)</span>
          <button class="btn btn-ghost btn-sm" onclick="cmsToggleSeo()">Нээх / хаах</button>
        </div>
        <div id="cmsSeoEditor" hidden>${cmsSeoEditorHtml(_cmsSeoDraft || cmsDefaultSeo(_cmsAdminPage))}</div>
      </div>`;
  }
  function cmsToggleSeo() { const e = document.getElementById('cmsSeoEditor'); if (e) e.hidden = !e.hidden; }
  const CMS_SEO_FIELDS = [
    ['seoTitle', 'SEO гарчиг', 'text'], ['metaDescription', 'Тайлбар (meta description)', 'textarea'],
    ['canonical', 'Canonical холбоос', 'url'], ['ogImage', 'OG зураг (холбоос)', 'url'],
    ['ogTitle', 'OG гарчиг', 'text'], ['ogDescription', 'OG тайлбар', 'textarea'],
    ['twitterTitle', 'Twitter гарчиг', 'text'], ['twitterDescription', 'Twitter тайлбар', 'textarea']
  ];
  function cmsSeoEditorHtml(seo) {
    const rows = CMS_SEO_FIELDS.map(([k, lbl, t]) => {
      const v = seo[k] || '';
      if (t === 'textarea') return `<div class="cms-field"><label class="cms-label">${esc(lbl)}</label><textarea class="form-input" rows="2" oninput="cmsSeoInput('${k}', this.value)">${esc(v)}</textarea></div>`;
      return `<div class="cms-field"><label class="cms-label">${esc(lbl)}</label><input class="form-input" type="text" value="${esc(v)}" oninput="cmsSeoInput('${k}', this.value)" /></div>`;
    }).join('');
    return `<div style="padding:12px 16px;"><div class="cms-grid">${rows}</div>
      <label class="cms-field" style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <input type="checkbox" ${seo.noindex ? 'checked' : ''} onchange="cmsSeoInput('noindex', this.checked)" />
        <span class="cms-label" style="margin:0;">Хайлтын системд индексжүүлэхгүй (noindex)</span></label></div>`;
  }
  function cmsSeoInput(key, value) { _cmsSeoDraft = _cmsSeoDraft || cmsDefaultSeo(_cmsAdminPage); _cmsSeoDraft[key] = value; cmsMarkDirty(); }
  function cmsCleanSeo(seo) {
    seo = seo || {}; const out = {};
    ['seoTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription'].forEach(k => { if (typeof seo[k] === 'string') out[k] = seo[k].slice(0, 400).trim(); });
    ['canonical', 'ogImage'].forEach(k => { out[k] = cmsSafeUrl(seo[k] || ''); });
    out.noindex = seo.noindex === true;
    return out;
  }
  function cmsBlockHtml(block, i) {
    const meta = CMS_BLOCK_TYPES[block.type] || { label: block.type, fields: [] };
    const expanded = !!_cmsExpanded[block.id];
    return `<div class="cms-block ${block.visible === false ? 'cms-block-hidden' : ''}">
        <div class="cms-block-head">
          <div class="cms-block-title">${esc(meta.label)}${block.visible === false ? ' <span style="font-size:11px;color:var(--ink-3);">(нуусан)</span>' : ''}</div>
          <div class="cms-block-controls">
            <button class="cms-ctrl" title="Засах" onclick="cmsToggleExpand('${block.id}')">✎</button>
            <button class="cms-ctrl" title="Дээш" onclick="cmsMoveBlock(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="cms-ctrl" title="Доош" onclick="cmsMoveBlock(${i}, 1)" ${i === _cmsDraft.length - 1 ? 'disabled' : ''}>↓</button>
            ${!meta.system ? `<button class="cms-ctrl" title="${block.visible === false ? 'Харагдуулах' : 'Нуух'}" onclick="cmsToggleBlock(${i})">${block.visible === false ? '🚫' : '👁'}</button>` : ''}
            ${!meta.system ? `<button class="cms-ctrl cms-ctrl-danger" title="Устгах" onclick="cmsDeleteBlock(${i})">🗑</button>` : ''}
          </div>
        </div>
        ${expanded ? `<div class="cms-block-body">${cmsBlockEditorHtml(block)}</div>` : ''}
      </div>`;
  }
  function cmsBlockEditorHtml(block) {
    const meta = CMS_BLOCK_TYPES[block.type] || {};
    if (meta.kind === 'repeater') return cmsRepeaterEditorHtml(block, meta);
    if (meta.kind === 'fields') {
      if (!meta.fields || !meta.fields.length) return `<span style="font-size:12px;color:var(--ink-3);">Энэ хэсэг зөвхөн харагдац/эрэмбээр удирдагдана.</span>`;
      return meta.fields.map(f => cmsFieldHtml(block, f)).join('');
    }
    return '';
  }
  function cmsFieldHtml(block, f, itemIdx) {
    const [key, label, type] = f;
    const val = itemIdx == null ? ((block.content && block.content[key]) || '') : ((block.content.items[itemIdx] && block.content.items[itemIdx][key]) || '');
    const onin = itemIdx == null ? `cmsUpdateField('${block.id}','${key}', this.value)` : `cmsUpdateItemField('${block.id}', ${itemIdx}, '${key}', this.value)`;
    if (type === 'textarea') return `<div class="cms-field"><label class="cms-label">${esc(label)}</label><textarea class="form-input" rows="2" oninput="${onin}">${esc(val)}</textarea></div>`;
    if (type === 'align') return `<div class="cms-field"><label class="cms-label">${esc(label)}</label>
      <select class="form-input" onchange="${onin}">${['left', 'center', 'right'].map(a => `<option value="${a}" ${val === a ? 'selected' : ''}>${a === 'left' ? 'Зүүн' : a === 'center' ? 'Төв' : 'Баруун'}</option>`).join('')}</select></div>`;
    if (type === 'color') return `<div class="cms-field"><label class="cms-label">${esc(label)}</label>
      <div class="cms-theme-inputs"><input type="color" value="${cmsSafeHex(val) || '#000000'}" oninput="${onin}" /><input type="text" class="form-input" value="${esc(val)}" maxlength="7" oninput="${onin}" /></div></div>`;
    if (type === 'image') {
      const src = cmsSafeUrl(val);
      return `<div class="cms-field"><label class="cms-label">${esc(label)}</label>
        <div class="cms-img-row">
          ${src ? `<img class="cms-img-preview" src="${esc(src)}" alt="" onerror="this.style.display='none'">` : ''}
          <input type="text" class="form-input" placeholder="Зургийн холбоос" value="${esc(val)}" oninput="${onin}" />
          <label class="btn btn-ghost btn-sm cms-upload-btn">Зураг оруулах<input type="file" accept="image/*" hidden onchange="cmsHandleUpload(event, '${block.id}', ${itemIdx == null ? 'null' : itemIdx}, '${key}')"></label>
        </div></div>`;
    }
    return `<div class="cms-field"><label class="cms-label">${esc(label)}</label><input class="form-input" type="text" value="${esc(val)}" oninput="${onin}" /></div>`;
  }
  function cmsRepeaterEditorHtml(block, meta) {
    block.content = block.content || {}; block.content.items = Array.isArray(block.content.items) ? block.content.items : [];
    const labelField = block.type === 'banks' ? `<div class="cms-field"><label class="cms-label">Тайлбар мөр</label><input class="form-input" type="text" value="${esc(block.content.label || '')}" oninput="cmsUpdateField('${block.id}','label', this.value)" /></div>` : '';
    const items = block.content.items.map((it, idx) => `
      <div class="cms-item"><div class="cms-item-head"><span>${esc((it.name || it.title || ('Мөр ' + (idx + 1))))}</span>
        <div class="cms-block-controls">
          <button class="cms-ctrl" title="Дээш" onclick="cmsMoveItem('${block.id}', ${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="cms-ctrl" title="Доош" onclick="cmsMoveItem('${block.id}', ${idx}, 1)" ${idx === block.content.items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="cms-ctrl cms-ctrl-danger" title="Устгах" onclick="cmsDeleteItem('${block.id}', ${idx})">🗑</button>
        </div></div>
        <div class="cms-item-body">${meta.itemFields.map(f => cmsFieldHtml(block, f, idx)).join('')}</div></div>`).join('');
    return `${labelField}<div class="cms-items">${items || '<div style="font-size:12px;color:var(--ink-3);padding:6px 0;">Мөр алга.</div>'}</div>
      <button class="btn btn-ghost btn-sm" onclick="cmsAddItem('${block.id}')">+ Нэмэх</button>`;
  }

  function cmsToggleExpand(id) { _cmsExpanded[id] = !_cmsExpanded[id]; cmsRenderEditor(); }
  function cmsUpdateField(blockId, field, value) { const b = _cmsDraft.find(x => x.id === blockId); if (!b) return; b.content = b.content || {}; b.content[field] = value; cmsMarkDirty(); }
  function cmsUpdateItemField(blockId, idx, field, value) { const b = _cmsDraft.find(x => x.id === blockId); if (!b || !b.content || !b.content.items[idx]) return; b.content.items[idx][field] = value; cmsMarkDirty(); }
  function cmsMoveBlock(i, dir) { const j = i + dir; if (j < 0 || j >= _cmsDraft.length) return; const t = _cmsDraft[i]; _cmsDraft[i] = _cmsDraft[j]; _cmsDraft[j] = t; _cmsDraft.forEach((b, k) => b.order = k + 1); cmsMarkDirty(); cmsRenderEditor(); }
  function cmsToggleBlock(i) { const b = _cmsDraft[i]; const meta = CMS_BLOCK_TYPES[b.type] || {}; if (meta.system) return; b.visible = b.visible === false; cmsMarkDirty(); cmsRenderEditor(); }
  function cmsDeleteBlock(i) { const b = _cmsDraft[i]; const meta = CMS_BLOCK_TYPES[b.type] || {}; if (meta.system) { showToast('Энэ үндсэн хэсгийг устгах боломжгүй'); return; } if (!confirm('Энэ хэсгийг устгах уу?')) return; _cmsDraft.splice(i, 1); _cmsDraft.forEach((x, k) => x.order = k + 1); cmsMarkDirty(); cmsRenderEditor(); }
  function cmsAddItem(blockId) { const b = _cmsDraft.find(x => x.id === blockId); if (!b) return; b.content = b.content || {}; b.content.items = b.content.items || []; b.content.items.push({}); _cmsExpanded[blockId] = true; cmsMarkDirty(); cmsRenderEditor(); }
  function cmsDeleteItem(blockId, idx) { const b = _cmsDraft.find(x => x.id === blockId); if (!b || !b.content) return; if (!confirm('Энэ мөрийг устгах уу?')) return; b.content.items.splice(idx, 1); cmsMarkDirty(); cmsRenderEditor(); }
  function cmsMoveItem(blockId, idx, dir) { const b = _cmsDraft.find(x => x.id === blockId); if (!b || !b.content) return; const j = idx + dir; const items = b.content.items; if (j < 0 || j >= items.length) return; const t = items[idx]; items[idx] = items[j]; items[j] = t; cmsMarkDirty(); cmsRenderEditor(); }
  function cmsShowAddBlock() {
    const wrap = document.getElementById('cmsAddBlockWrap'); if (!wrap) return;
    if (wrap.innerHTML) { wrap.innerHTML = ''; return; }
    const addable = Object.keys(CMS_BLOCK_TYPES).filter(t => CMS_BLOCK_TYPES[t].addable);
    wrap.innerHTML = `<div class="cms-add-grid">${addable.map(t => `<button class="btn btn-ghost btn-sm" onclick="cmsAddBlock('${t}')">${esc(CMS_BLOCK_TYPES[t].label)}</button>`).join('')}</div>`;
  }
  function cmsAddBlock(type) {
    if (!CMS_BLOCK_TYPES[type] || !CMS_BLOCK_TYPES[type].addable) return;
    const id = type + '-' + Date.now().toString(36);
    _cmsDraft.push({ id, type, order: _cmsDraft.length + 1, visible: true, content: {} });
    _cmsExpanded[id] = true;
    const w = document.getElementById('cmsAddBlockWrap'); if (w) w.innerHTML = '';
    cmsMarkDirty(); cmsRenderEditor();
  }

  async function cmsHandleUpload(ev, blockId, itemIdx, key) {
    const file = ev.target && ev.target.files && ev.target.files[0]; if (!file) return;
    showToast('Зураг оруулж байна…');
    const url = await cmsUploadImage(file); if (!url) return;
    if (itemIdx == null || itemIdx === 'null') cmsUpdateField(blockId, key, url); else cmsUpdateItemField(blockId, Number(itemIdx), key, url);
    cmsRenderEditor(); showToast('Зураг орлоо', 'success');
  }
  async function cmsUploadImage(file) {
    if (!cmsRequireEditor()) return null;
    if (!file || !/^image\//.test(file.type)) { showToast('Зөвхөн зураг оруулна уу'); return null; }
    if (file.size > 12 * 1024 * 1024) { showToast('Зургийн хэмжээ 12MB-аас бага байх ёстой'); return null; }
    try {
      const path = 'cms-media/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const snap = await firebase.storage().ref().child(path).put(file);
      return await snap.ref.getDownloadURL();
    } catch (e) { console.error('cmsUploadImage failed:', e.code, e.message); showToast('Зураг оруулахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); return null; }
  }

  function cmsNormaliseDraft(sections) {
    return sections.map((b, idx) => ({ id: String(b.id), type: String(b.type), order: idx + 1, visible: b.visible !== false, content: cmsCleanContent(b.type, b.content) }));
  }
  function cmsCleanContent(type, content) {
    content = content || {}; const out = {};
    Object.keys(content).forEach(k => { const v = content[k]; if (k === 'items') return; if (typeof v === 'string') out[k] = v.slice(0, 6000); else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v; });
    Object.keys(out).forEach(k => { if (/url$/i.test(k) && typeof out[k] === 'string') out[k] = cmsSafeUrl(out[k]); });
    if (out.color) out.color = cmsSafeHex(out.color);
    if (Array.isArray(content.items)) {
      out.items = content.items.map(it => { const o = {}; Object.keys(it || {}).forEach(k => { const v = it[k]; if (typeof v === 'string') o[k] = v.slice(0, 2000); }); Object.keys(o).forEach(k => { if (/url$/i.test(k)) o[k] = cmsSafeUrl(o[k]); if (k === 'color') o[k] = cmsSafeHex(o[k]); }); return o; });
    }
    return out;
  }
  function cmsValidateDraft(sections) {
    const errs = [];
    sections.forEach(s => {
      const label = (CMS_BLOCK_TYPES[s.type] || {}).label || s.type; const c = s.content || {};
      if (s.type === 'image' && s.visible !== false && !cmsSafeUrl(c.imageUrl)) errs.push(`${label}: зураг оруулаагүй эсвэл холбоос буруу`);
      if (s.type === 'video' && s.visible !== false && !cmsVideoEmbed(c.videoUrl)) errs.push(`${label}: видео холбоос буруу (YouTube/Vimeo/MP4)`);
      if (s.type === 'cta' && s.visible !== false && (c.buttonText && !cmsSafeUrl(c.buttonUrl))) errs.push(`${label}: товчны холбоос буруу`);
    });
    return errs;
  }
  async function cmsSaveDraft(silent) {
    if (!cmsRequireEditor() || !_cmsAdminPage) return false;
    const sections = cmsNormaliseDraft(_cmsDraft);
    try {
      await db.collection('sitePages').doc(_cmsAdminPage).set({ title: (CMS_PAGES.find(p => p.id === _cmsAdminPage) || {}).title || _cmsAdminPage, slug: _cmsAdminPage, status: 'draft', draft: { sections }, seo: cmsCleanSeo(_cmsSeoDraft), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }, { merge: true });
      logAdminAction('cms_draft_save', 'sitePages', _cmsAdminPage, '');
      _cmsDirty = false; const f = document.getElementById('cmsDirtyFlag'); if (f) f.hidden = true;
      if (!silent) showToast('Ноорог хадгалагдлаа', 'success');
      return true;
    } catch (e) { console.error('cmsSaveDraft failed:', e.code, e.message); showToast('Хадгалахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); return false; }
  }
  function cmsPreviewCurrentDraft() {
    if (!_cmsAdminPage) return;
    const pageId = _cmsAdminPage;
    _cmsPreviewOverride = { pageId, sections: cmsNormaliseDraft(_cmsDraft) }; _cmsPublicCache[pageId] = null;
    showToast('Урьдчилан харах — зөвхөн танд харагдана');
    cmsGotoPublicPage(pageId);
  }
  async function cmsPreviewPage(pageId) { _cmsPreviewOverride = null; _cmsPublicCache[pageId] = null; _cmsPublicSeoCache[pageId] = null; cmsGotoPublicPage(pageId); }
  // Navigate the public site to a given CMS page and (re)render its CMS content.
  function cmsGotoPublicPage(pageId) {
    if (pageId === 'home') { showPage('home'); setTimeout(applySiteCms, 60); return; }
    if (pageId === 'newdev') { if (typeof showPage === 'function') showPage('newdev'); setTimeout(cmsApplyNewdev, 60); return; }
    if (CMS_INFO_PAGE_IDS[pageId] && typeof openInfoPage === 'function') { openInfoPage(pageId); return; }
  }
  async function cmsPublish() {
    if (!cmsRequireEditor() || !_cmsAdminPage) return;
    const sections = cmsNormaliseDraft(_cmsDraft);
    const errs = cmsValidateDraft(sections);
    if (errs.length) { showToast(errs.length + ' хэсэгт алдаа байна: ' + errs[0]); return; }
    if (!confirm('Энэ хуудсыг нийтлэх үү? Нийтэлсэн агуулга сайтад шууд харагдана.')) return;
    const pageId = _cmsAdminPage;
    try {
      let versions = [];
      try { const prev = await db.collection('sitePages').doc(pageId).get(); if (prev.exists && Array.isArray(prev.data().versions)) versions = prev.data().versions; } catch (e) {}
      versions = versions.concat([{ publishedAt: new Date().toISOString(), publishedBy: currentUser.email || currentUser.uid, status: 'published', sections }]).slice(-15);
      const batch = db.batch();
      const seo = cmsCleanSeo(_cmsSeoDraft);
      batch.set(db.collection('sitePagesPublic').doc(pageId), { sections, seo, publishedAt: firebase.firestore.FieldValue.serverTimestamp(), publishedBy: currentUser.uid });
      batch.set(db.collection('sitePages').doc(pageId), { title: (CMS_PAGES.find(p => p.id === pageId) || {}).title || pageId, slug: pageId, status: 'published', draft: { sections }, seo, versions, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }, { merge: true });
      await batch.commit();
      _cmsPreviewOverride = null; _cmsPublicCache[pageId] = null; _cmsPublicSeoCache[pageId] = null; _cmsDirty = false;
      logAdminAction('cms_publish', 'sitePages', pageId, '');
      showToast('Хуудас нийтлэгдлээ', 'success');
      if (pageId === 'home') setTimeout(applySiteCms, 60);
      else if (pageId === 'newdev') setTimeout(cmsApplyNewdev, 60);
      renderAdminCmsSection();
    } catch (e) { console.error('cmsPublish failed:', e.code, e.message); showToast('Нийтлэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); }
  }

  async function cmsShowVersions() {
    const wrap = document.getElementById('cmsVersionsWrap'); if (!wrap) return;
    if (wrap.innerHTML) { wrap.innerHTML = ''; return; }
    let versions = [];
    try { const snap = await db.collection('sitePages').doc(_cmsAdminPage).get(); if (snap.exists && Array.isArray(snap.data().versions)) versions = snap.data().versions; } catch (e) { console.error('cmsShowVersions failed:', e.code, e.message); }
    window.__cmsVersions = versions;
    if (!versions.length) { wrap.innerHTML = `<div style="padding:12px 16px;font-size:12.5px;color:var(--ink-3);">Хувилбар алга. Нийтэлсний дараа энд хадгалагдана.</div>`; return; }
    wrap.innerHTML = `<div class="admin-list-table" style="margin:0 16px 12px;">${versions.slice().reverse().map((v, ri) => {
      const idx = versions.length - 1 - ri; const when = v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—';
      return `<div class="admin-row"><div class="admin-row-body"><div class="admin-row-title">${esc(when)}</div><div class="admin-row-meta">${esc(v.publishedBy || '')} · ${esc(v.status || 'published')}</div></div><div class="admin-row-actions"><button class="btn btn-ghost btn-sm" onclick="cmsRestoreVersion(${idx})">Сэргээх</button></div></div>`;
    }).join('')}</div>`;
  }
  function cmsRestoreVersion(idx) {
    const v = (window.__cmsVersions || [])[idx]; if (!v || !Array.isArray(v.sections)) return;
    if (!confirm('Энэ хувилбарыг сэргээх үү? Ноорог болж сэргээгдэнэ, дараа нь Нийтлэх шаардлагатай.')) return;
    _cmsDraft = v.sections.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); _cmsExpanded = {}; cmsMarkDirty();
    cmsRenderEditor(); showToast('Хувилбар ноорог болж сэргээгдлээ — Нийтлэх товчийг дарна уу', 'success');
  }

  async function cmsSeedFromCurrentContent() {
    if (!cmsRequireEditor()) return;
    try {
      const orgSnap = await db.collection('siteSettings').doc('organization').get();
      if (!orgSnap.exists) await db.collection('siteSettings').doc('organization').set(Object.assign(cmsDefaultOrganization(), { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }));
      const themeSnap = await db.collection('siteSettings').doc('theme').get();
      if (!themeSnap.exists) await db.collection('siteSettings').doc('theme').set(Object.assign(cmsDefaultTheme(), { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid }));
      const homeSnap = await db.collection('sitePages').doc('home').get();
      if (!homeSnap.exists) {
        const sections = cmsDefaultHomeSections(); const batch = db.batch();
        batch.set(db.collection('sitePages').doc('home'), { title: 'Нүүр хуудас', slug: 'home', status: 'published', draft: { sections }, versions: [], updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid });
        batch.set(db.collection('sitePagesPublic').doc('home'), { sections, publishedAt: firebase.firestore.FieldValue.serverTimestamp(), publishedBy: currentUser.uid });
        await batch.commit();
      }
      showToast('CMS анхны агуулга үүсгэгдлээ', 'success'); renderAdminCmsSection();
    } catch (e) { console.error('cmsSeedFromCurrentContent failed:', e.code, e.message); showToast('Анхны агуулга үүсгэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')); }
  }
