  // ===== COMPARE =====
  let compareList = [];

  function toggleCompare(id, btn) {
    const idx = compareList.indexOf(id);
    if (idx > -1) {
      compareList.splice(idx, 1);
      btn.classList.remove('active');
    } else {
      if (compareList.length >= 4) {
        showToast('Хамгийн ихдээ 4 байр харьцуулна');
        return;
      }
      compareList.push(id);
      btn.classList.add('active');
    }
    updateCompareBar();
  }

  function updateCompareBar() {
    const bar = document.getElementById('compareBar');
    const items = document.getElementById('compareBarItems');
    const btn = document.getElementById('compareBtn');
    const hint = document.getElementById('compareHint');

    if (compareList.length === 0) {
      bar.classList.remove('show');
      return;
    }
    bar.classList.add('show');
    items.innerHTML = compareList.map(id => {
      const l = listings.find(x => x.id === id);
      return `
        <div class="compare-bar-item">
          <img src="${l.img}" alt="" />
          <div class="compare-bar-item-info">
            <div class="compare-bar-item-title">${l.title.slice(0, 20)}${l.title.length > 20 ? '...' : ''}</div>
            <div class="compare-bar-item-price">${fmtPrice(l.price)}</div>
          </div>
          <button class="compare-bar-remove" onclick="removeFromCompare(${id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      `;
    }).join('');

    if (compareList.length >= 2) {
      btn.disabled = false;
      btn.style.opacity = '1';
      hint.textContent = `${compareList.length} байр сонгосон`;
    } else {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      hint.textContent = 'Дор хаяж 2 байр сонгоно уу';
    }
  }

  function removeFromCompare(id) {
    compareList = compareList.filter(x => x !== id);
    // Update card button state
    document.querySelectorAll('.listing-compare').forEach(b => {
      if (b.getAttribute('onclick').includes(`toggleCompare(${id},`)) b.classList.remove('active');
    });
    updateCompareBar();
  }

  function clearCompare() {
    compareList = [];
    document.querySelectorAll('.listing-compare').forEach(b => b.classList.remove('active'));
    updateCompareBar();
  }

  // Removing a listing from inside the open compare modal — re-renders the table with
  // the item gone, or closes back out once fewer than 2 remain (the modal has nothing
  // meaningful left to compare).
  function removeFromCompareModal(id) {
    removeFromCompare(id);
    if (compareList.length < 2) {
      closeModal();
      showToast('Харьцуулахын тулд дор хаяж 2 байр сонгоно уу');
    } else {
      openCompareModal();
    }
  }

  function openCompareModal() {
    const props = compareList.map(id => listings.find(x => x.id === id));

    // ---- Determine "best" value per metric across the selected properties ----
    const minPrice = Math.min(...props.map(p => p.price));
    const perSqmOf = p => (p.cat !== 'rent' && p.area && typeof p.price === 'number') ? (p.price * 1000000) / p.area : null;
    const perSqmVals = props.map(perSqmOf).filter(v => v != null);
    const minPricePerSqm = perSqmVals.length ? Math.min(...perSqmVals) : null;
    const maxArea = Math.max(...props.map(p => p.area));
    const yearVals = props.map(p => p.year).filter(y => typeof y === 'number');
    const maxYear = yearVals.length ? Math.max(...yearVals) : null;
    const hoaVals = props.map(p => p.hoaFee).filter(v => typeof v === 'number' && v > 0);
    const minHoa = hoaVals.length ? Math.min(...hoaVals) : null;
    const scores = props.map(p => propertyScore(p));
    const maxScore = Math.max(...scores);
    const loanEligible = p => Array.isArray(p.features) && p.features.includes('loan') || (p.loanType && !p.loanType.includes('Бэлэн'));

    // Boolean-style feature cell: check badge when present, dash when not.
    const boolCell = truthy => truthy
      ? '<span style="color:#009878; font-weight:700;">✓ Тийм</span>'
      : '<span style="color:var(--ink-3);">— Үгүй</span>';

    const rows = [
      { label: 'Үнэ', get: p => fmtPrice(p.price), best: p => p.price === minPrice },
      { label: '₮/м²', get: p => pricePerSqmText(p) || '—', best: p => perSqmOf(p) != null && perSqmOf(p) === minPricePerSqm },
      { label: 'Талбай', get: p => p.area + ' м²', best: p => p.area === maxArea },
      { label: 'Өрөө', get: p => p.rooms, best: () => false },
      { label: 'Давхар', get: p => p.floor, best: () => false },
      { label: 'Барилгын он', get: p => p.year, best: p => typeof p.year === 'number' && p.year === maxYear },
      { label: 'Байршил', get: p => esc(p.loc), best: () => false },
      { label: 'Паркинг', get: p => boolCell(!!p.parking), best: () => false },
      { label: 'Лифт', get: p => boolCell(!!p.elevator), best: () => false },
      { label: 'Тавилга', get: p => boolCell(!!p.furniture), best: () => false },
      { label: 'Ипотек', get: p => boolCell(loanEligible(p)), best: () => false },
      { label: 'СӨХ', get: p => typeof p.hoaFee === 'number' && p.hoaFee > 0 ? fmt(p.hoaFee) + ' ₮/сар' : '—', best: p => minHoa != null && p.hoaFee === minHoa },
      { label: 'Үнийн дүн шинжилгээ', get: p => {
          const v = aiVerdictFor(p);
          return `<span style="color:${v.color}; font-weight:700;">${v.verdict}</span>`;
        }, best: p => aiVerdictFor(p).verdict === 'Сонирхолтой санал' },
      { label: 'Property Score', get: p => {
          const s = propertyScore(p);
          const c = s >= 70 ? '#009878' : s >= 45 ? '#C77700' : '#FF4757';
          return `<span style="font-family:'JetBrains Mono',monospace; font-weight:700; color:${c};">${s}/100</span>`;
        }, best: p => propertyScore(p) === maxScore }
    ];

    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
          <div>
            <span class="al-eyebrow">Харьцуулалт</span>
            <div class="al-title" style="margin-bottom:0;">${props.length} байрны харьцуулалт</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn btn-ghost" style="font-size:12.5px; padding:8px 14px;" onclick="closeModal(); showPage('listings');">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Өөр зар нэмэх
            </button>
            <button type="button" class="btn btn-ghost" style="font-size:12.5px; padding:8px 14px; color:var(--danger); border-color:rgba(255,71,87,0.3);" onclick="clearCompare(); closeModal();">
              Бүгдийг цэвэрлэх
            </button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="compare-table-modal">
            <thead>
              <tr>
                <th class="row-label"></th>
                ${props.map(p => `
                  <th class="compare-prop-head">
                    <button type="button" class="compare-prop-remove" title="Харьцуулалтаас хасах" onclick="removeFromCompareModal(${p.id})">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                    <img class="compare-prop-img" src="${esc(p.img)}" alt="" />
                    <div class="compare-prop-title">${esc(p.title)}</div>
                    <div style="font-size:13px; font-weight:700; color:var(--primary); font-family:'Fraunces',serif;">${fmtPrice(p.price)}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td class="row-label">${row.label}</td>
                  ${props.map(p => `<td class="${row.best(p) ? 'compare-cell-best' : ''}">${row.get(p)}</td>`).join('')}
                </tr>
              `).join('')}
              <tr>
                <td class="row-label"></td>
                ${props.map(p => `<td><button class="btn btn-blue" style="width:100%; justify-content:center; font-size:12px; padding:8px;" onclick="closeModal(); setTimeout(() => openListing(${p.id}), 300)">Дэлгэрэнгүй</button></td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top:16px; font-size:12px; color:var(--ink-3); line-height:1.5;">
          ✓ тэмдэг нь тухайн үзүүлэлтээр хамгийн сайн сонголтыг харуулна.<br>
          <strong>Үнийн дүн шинжилгээ</strong> — үнийг дүүргийн зах зээлийн дунджтай харьцуулсан дүрэм-суурьтай тооцоолол (жинхэнэ AI/машин сургалт биш).<br>
          <strong>Property Score</strong> — үнийн шударга байдал, баталгаажилт, тоноглол, зурган баримтжуулалт зэргээс тооцсон 0-100 онооны нэгдсэн үзүүлэлт.
        </div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

