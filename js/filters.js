  // ===== FILTER LISTINGS =====
  let currentCat = 'all';
  let currentSort = 'default';
  let searchText = '';
  let agentUidFilter = '';   // set by "Зарууд үзэх" on a featured-agent card; cleared on any category change

  // The one place that writes the chosen category. Three separate surfaces pick a
  // category — the home search bar's Ангилал <select>, the category shortcut tiles
  // under it, and the Listings page's .filter-pill rows — and each of them used to set
  // `currentCat` and repaint the pills on its own, with nothing keeping the <select> in
  // step. That is what made the dropdown look broken: choosing a category on one surface
  // left the others displaying something else, and the next Хайх press read the stale
  // <select> value and silently overwrote the user's actual choice.
  // Slugs are the shared contract here: 'all' | 'apartment' | 'house' | 'land' |
  // 'office' | 'rent' — the <option> values in index.html, the data-cat pill values, and
  // listing.cat (data.js maps it straight from the Firestore `category` field, which
  // my-listings.js writes as propertyTypeBucket()/'rent') all use exactly these.
  function setSearchCategory(cat) {
    const c = cat || 'all';
    currentCat = c;
    agentUidFilter = '';   // choosing a category clears any agent-scoped view
    const sel = document.getElementById('hSearchType');
    if (sel && sel.value !== c) sel.value = c;
    document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === c));
  }

  // Fired by the Ангилал <select>'s change event (index.html). Picking a category is an
  // instant filter — no Хайх press needed.
  //
  // Deliberately delegates to performSearch() instead of filtering here, so there stays
  // exactly one search implementation. performSearch() re-reads this select (through
  // setSearchCategory), the keyword box, the district and the advanced panel, so an
  // existing keyword still narrows the chosen category and an empty one shows the whole
  // category — and currentCat, the select, the active pill, the filter tags, the count
  // and the rendered list all end up synchronized by the same code path Хайх uses.
  function onHomeCategoryChange() {
    setSearchCategory(document.getElementById('hSearchType')?.value || 'all');
    if (typeof performSearch === 'function') performSearch();
  }

  function applyListingFilter() {
    const filtered = getFilteredListings();
    renderListings(filtered);
    renderFilterTags();
    updateFilterCount();
    if (mapViewOn) renderMiniMap(filtered);
  }

  function clearFilterTag(type, val) {
    if (type === 'district') { const el=document.getElementById('fDistrict'); if(el)el.value='all'; }
    else if (type === 'search') { searchText=''; const f=document.getElementById('fSearch'); if(f)f.value=''; }
    else if (type === 'cat') { setSearchCategory('all'); }
    else if (type === 'toggle') { const i=activeFilterToggles.indexOf(val); if(i>-1)activeFilterToggles.splice(i,1); document.querySelectorAll('.filter-toggle').forEach(el=>el.classList.toggle('active',activeFilterToggles.includes(el.dataset.ftoggle))); }
    else if (type === 'priceMin') { const el=document.getElementById('fPriceMin'); if(el)el.value=''; }
    else if (type === 'priceMax') { const el=document.getElementById('fPriceMax'); if(el)el.value=''; }
    else if (type === 'areaMin') { const el=document.getElementById('fAreaMin'); if(el)el.value=''; }
    else if (type === 'areaMax') { const el=document.getElementById('fAreaMax'); if(el)el.value=''; }
    else if (type === 'yearMin') { const el=document.getElementById('fYearMin'); if(el)el.value=''; }
    else if (type === 'yearMax') { const el=document.getElementById('fYearMax'); if(el)el.value=''; }
    else if (type === 'floorMin') { const el=document.getElementById('fFloorMin'); if(el)el.value=''; }
    else if (type === 'floorMax') { const el=document.getElementById('fFloorMax'); if(el)el.value=''; }
    else if (type === 'floorTotalMin') { const el=document.getElementById('fFloorTotalMin'); if(el)el.value=''; }
    else if (type === 'floorTotalMax') { const el=document.getElementById('fFloorTotalMax'); if(el)el.value=''; }
    applyListingFilter();
  }

  function renderFilterTags() {
    const wrap = document.getElementById('activeFilterTags');
    if (!wrap) return;
    const tags = [];
    const districtLabels2 = {'khan-uul':'Хан-Уул','sukhbaatar':'Сүхбаатар','chingeltei':'Чингэлтэй','bayanzurkh':'Баянзүрх','bayangol':'Баянгол','songinokhairkhan':'Сонгинохайрхан','nalaikh':'Налайх','bagakhangai':'Багахангай','baganuur':'Багануур'};
    const district = document.getElementById('fDistrict')?.value;
    if (district && district !== 'all') tags.push({ label: districtLabels2[district]||district, onclick: `clearFilterTag('district','${district}')` });
    const q = (searchText || document.getElementById('fSearch')?.value || '').trim();
    // The only tag label that is free user text rather than a fixed dictionary string --
    // it used to reach innerHTML unescaped below, so searching for `<img src=x onerror=...>`
    // executed it. esc() is applied at the render site so every label is covered, not just
    // this one.
    if (q) tags.push({ label: '"' + q + '"', onclick: `clearFilterTag('search','')` });
    if (currentCat && currentCat !== 'all') {
      // Canonical label (utils.js) so a subtype filter shows "Зуслан", never the raw
      // slug "cottage".
      tags.push({ label: catLabel(currentCat), onclick: `clearFilterTag('cat','')` });
    }
    const priceMin = document.getElementById('fPriceMin')?.value;
    const priceMax = document.getElementById('fPriceMax')?.value;
    if (priceMin) tags.push({ label: priceMin + '+сая ₮', onclick: `clearFilterTag('priceMin','')` });
    if (priceMax) tags.push({ label: '≤' + priceMax + 'сая ₮', onclick: `clearFilterTag('priceMax','')` });
    const areaMin = document.getElementById('fAreaMin')?.value;
    const areaMax = document.getElementById('fAreaMax')?.value;
    if (areaMin) tags.push({ label: areaMin + '+м²', onclick: `clearFilterTag('areaMin','')` });
    if (areaMax) tags.push({ label: '≤' + areaMax + 'м²', onclick: `clearFilterTag('areaMax','')` });
    const yearMin = document.getElementById('fYearMin')?.value;
    const yearMax = document.getElementById('fYearMax')?.value;
    if (yearMin) tags.push({ label: yearMin + 'оноос', onclick: `clearFilterTag('yearMin','')` });
    if (yearMax) tags.push({ label: yearMax + 'он хүртэл', onclick: `clearFilterTag('yearMax','')` });
    const floorMin = document.getElementById('fFloorMin')?.value;
    const floorMax = document.getElementById('fFloorMax')?.value;
    if (floorMin) tags.push({ label: floorMin + '+давхар', onclick: `clearFilterTag('floorMin','')` });
    if (floorMax) tags.push({ label: '≤' + floorMax + 'давхар', onclick: `clearFilterTag('floorMax','')` });
    const floorTotalMin = document.getElementById('fFloorTotalMin')?.value;
    const floorTotalMax = document.getElementById('fFloorTotalMax')?.value;
    if (floorTotalMin) tags.push({ label: floorTotalMin + '+нийт давхар', onclick: `clearFilterTag('floorTotalMin','')` });
    if (floorTotalMax) tags.push({ label: '≤' + floorTotalMax + 'нийт давхар', onclick: `clearFilterTag('floorTotalMax','')` });
    const toggleLabels = {new:'Шинэ барилга',verified:'Баталгаажсан',below:'Зах зээлийн хямд',loan:'Зээлд хамрагдах',parking:'Паркингтай',furnished:'Тавилгатай',vip:'⭐ VIP',withphoto:'Зурагтай',renovated:'Засвар хийсэн',barter:'Бартер сонсоно'};
    activeFilterToggles.forEach(t => tags.push({ label: toggleLabels[t]||t, onclick: `clearFilterTag('toggle','${t}')` }));
    if (tags.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = tags.map(t => `
      <span class="active-filter-chip" onclick="${t.onclick}">
        ${esc(t.label)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </span>
    `).join('') + `<button type="button" class="active-filter-clear-all" onclick="resetFilters()">Бүгдийг арилгах</button>`;
  }

