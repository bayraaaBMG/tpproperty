  // ===== CALCULATOR =====
  // Суурь хүү (currentRate, доор) Монголбанкны нийтлэдэг арилжааны банкуудын орон сууцны
  // ипотекийн зээлийн жигнэсэн дундаж хүүний тайланд (stat.mongolbank.mn/finance, 2026 оны
  // 4-р сарын мэдээллээр) үндэслэсэн ойролцоо тоо. Энэ статистикийн хуудас JavaScript-аар
  // рендерлэгддэг тул script-ээр шинэчилж чадаагүй — 2026-08-13-нд дахин шалгахыг оролдоход
  // ч шинэ мэдээлэл олдоогүй тул огноог UI дээр тодорхой харуулж байна (доорх сануулга).
  //
  // ЭХ СУРВАЛЖИЙН ТАЙЛБАР (сүүлд шалгасан: 2026-08-13): доорх банк бүрийн хүү/нөхцөл ЗӨВХӨН
  // тухайн банкны албан ёсны вэбсайтаас шууд уншиж баталгаажуулсан утга (verified: true) эсвэл
  // "Тодорхойгүй" гэж илэрхий тэмдэглэсэн (verified: false). Зарим банкны вэбсайт JavaScript-аар
  // рендерлэгддэг тул зөвхөн хуудасны гарчиг/навигацид байгаа мэдээлэл (ж: бүтээгдэхүүний нэр,
  // "6%" гэсэн гарчигт байгаа хүү) шууд уншигдсан бол verified:true, харин дэлгэрэнгүй нөхцөл
  // (урьдчилгаа, хугацаа, шимтгэл) уншигдаагүй бол тухайн талбарууд "Тодорхойгүй" хэвээр —
  // ямар ч тоо ЗОХИОГООГҮЙ. Хуучирсан эсвэл өөрчлөгдсөн байж болзошгүй тул эцсийн шийдвэр
  // гаргахын өмнө sourceUrl-аар орж баталгаажуулна уу.
  // Банкны нөхцөл (хэрэглэгчийн өгсөн, zary.mn-ийн 2026 оны ойролцоо утгуудаас). Банк сонгоход
  // calculate() эдгээрийг ашиглана: rate = жилийн хүү (%), down = доод урьдчилгаа (%),
  // term = дээд хугацаа (сар), cap = зээлийн дээд хязгаар (сая ₮, байхгүй бол null),
  // monthly = картан дээр харуулах "Сарын хүү" текст, phone = холбоо барих дугаар (байхгүй
  // бол sourceUrl-аар орлоно). Range байвал доод утгыг default хүү болгосон. ЭДГЭЭР нь
  // ойролцоо тоо — банк байнга өөрчилдөг тул эцсийн нөхцөлийг тухайн банкнаас шалгана уу.
  const banks = [
    { id: 'mik', name: 'Хөнгөлөлттэй ипотек (6%)', short: '6%', color: '#00A651',
      monthly: '0.5%', rate: 6, down: 30, term: 360, cap: 150, phone: '', note: 'Улсын хөтөлбөр · МИК',
      logo: '/assets/bank-logos/mik.png', sourceUrl: 'https://www.mik.mn' },
    { id: 'golomt', name: 'Голомт банк', short: 'ГБ', color: '#E31E24',
      monthly: '1.4–1.8%', rate: 16.8, down: 20, term: 240, cap: null, phone: '1800-1646',
      logo: '/assets/bank-logos/golomt.png', sourceUrl: 'https://www.golomtbank.com/retail/loans/786' },
    { id: 'khan', name: 'Хаан банк', short: 'ХАН', color: '#0066B3',
      monthly: '1.7–1.8%', rate: 20.5, down: 20, term: 300, cap: null, phone: '1800-1917',
      sourceUrl: 'https://www.khanbank.com/personal/product/detail/39/' },
    { id: 'tdb', name: 'Худалдаа Хөгжлийн Банк', short: 'ХХБ', color: '#003F87',
      monthly: '1.45–1.6%', rate: 17.4, down: 20, term: 240, cap: null, phone: '1800-1977',
      logo: '/assets/bank-logos/tdb.png', sourceUrl: 'https://www.tdbm.mn/mn/retail/loans/oron-suutsnii-zeel/oron-suuc-khudaldan-avakh-zeel' },
    { id: 'state', name: 'Төрийн банк', short: 'ТБ', color: '#FFB81C', dark: true,
      monthly: '1.7–1.8%', rate: 20.4, down: 30, term: 240, cap: null, phone: '1800-1888',
      logo: '/assets/bank-logos/state.png', sourceUrl: 'https://www.statebank.mn/personal/product/10054' },
    { id: 'xac', name: 'ХасБанк', short: 'ХАС', color: '#00A651',
      monthly: '1.5%', rate: 18, down: 25, term: 240, cap: null, phone: '1800-1888',
      sourceUrl: 'https://xacbank.mn/mortgage' },
    { id: 'mbank', name: 'М банк', short: 'М', color: '#E4002B',
      monthly: '1.4–1.55%', rate: 16.8, down: 20, term: 360, cap: 1000, phone: '1800-2929',
      logo: '/assets/bank-logos/mbank.png', sourceUrl: 'https://www.mbank.mn' },
    { id: 'capitron', name: 'Капитрон банк', short: 'КБ', color: '#7B2CBF',
      monthly: '1.7–2.0%', rate: 20.5, down: 30, term: 120, cap: null, phone: '11-328373',
      sourceUrl: 'https://www.capitronbank.mn' },
    { id: 'bogd', name: 'Богд банк', short: 'ББ', color: '#0A1628',
      monthly: '1.85–2.1%', rate: 22.2, down: 30, term: 240, cap: null, phone: '7577-1199',
      sourceUrl: 'https://www.bogdbank.com/product/53' },
    { id: 'arig', name: 'Ариг банк', short: 'АБ', color: '#FF6B35',
      monthly: '1.6–1.8%', rate: 19.2, down: 20, term: 240, cap: null, phone: '7013-3060',
      logo: '/assets/bank-logos/arig.png', sourceUrl: 'https://www.arigbank.mn/mn/product/loan/26' },
    { id: 'cash', name: 'Бэлэн мөнгө', short: '₮', color: '#64748B',
      monthly: '—', rate: 0, down: 30, term: 240, cap: null, phone: '', note: 'Зээлгүй · шууд худалдан авалт' }
  ];

  let selectedBankId = 'mik';
  let currentRate = 6;
  let currentLoanName = 'Хөнгөлөлттэй ипотек (6%)';
  let currentLoanCap = 150; // сая ₮ — зээлийн дээд хязгаар (6% хөтөлбөр ~150 сая); банк сонгоход шинэчлэгдэнэ

  // Сайт даяар ганц стандарт орлогын дарамтын (DTI) аюулгүй дээд хязгаар — энэ тооцоолуур,
  // стресс тест, шаардлагатай орлогын тооцоо бүгд үүнийг л ашиглана. Өмнө нь 40%/45%/47.7%/50%
  // гэсэн 4 өөр тоо газар бүрт зөрүүтэй байсан.
  const SAFE_DTI = 40;

  // Format a сая ₮ amount for display: keep up to 3 decimals (thousands precision) with
  // thousands separators, trimming trailing zeros (120 -> "120", 139.825 -> "139.825").
  function fmtMln(n) { return (+Number(n).toFixed(3)).toLocaleString('en-US'); }

  function calculate() {
    const price = parseFloat(document.getElementById('priceSlider').value);
    const downPct = parseFloat(document.getElementById('downSlider').value);
    const income = parseInt(document.getElementById('incomeSlider').value);
    const term = parseInt(document.getElementById('termSlider').value);

    // Keep the down payment and loan at full precision (fractional сая ₮). Rounding the down
    // payment to whole millions (old Math.round) distorted the principal, which threw off the
    // monthly payment, total paid and total interest. Display is rounded; the maths is exact.
    const downAmt = price * downPct / 100;
    const neededLoan = price - downAmt;
    // Some loan products (e.g. the 6% government-backed program) are capped by the program's own
    // limit, not by what the buyer needs — if the needed amount exceeds that cap, only the
    // capped amount is actually financed; the rest is a real gap the buyer must cover from
    // savings or a second loan, so it's surfaced explicitly rather than silently shown as
    // if the whole purchase were financed at that rate.
    const capShortfall = (currentLoanCap && neededLoan > currentLoanCap) ? neededLoan - currentLoanCap : 0;
    const loanAmt = capShortfall > 0 ? currentLoanCap : neededLoan;

    const capNotice = document.getElementById('loanCapNotice');
    if (capNotice) {
      if (capShortfall > 0) {
        document.getElementById('loanCapNoticeText').textContent =
          `Танд ${fmt(neededLoan)} сая ₮ санхүүжилт хэрэгтэй, гэвч "${currentLoanName}" дээд тал нь ${fmt(currentLoanCap)} сая ₮ хүртэл олгодог тул үлдэгдэл ~${fmt(capShortfall)} сая ₮-ийг өөр эх үүсвэрээс (бэлэн мөнгө/нэмэлт зээл) бүрдүүлэх шаардлагатай.`;
        capNotice.style.display = 'flex';
      } else {
        capNotice.style.display = 'none';
      }
    }

    // Update slider value displays
    document.getElementById('priceVal').textContent = fmtPrice(price);
    document.getElementById('downVal').textContent = fmtMln(downAmt) + ' сая ₮ (' + downPct + '%)';
    document.getElementById('incomeVal').textContent = fmt(income * 1000) + ' ₮';
    document.getElementById('termVal').textContent = term + ' жил';

    // ===== AUTO: Required income calculation =====
    // Calculate required income for THIS price at the site-wide safe DTI threshold
    if (currentRate > 0) {
      const r = currentRate / 100 / 12;
      const n = term * 12;
      const reqMonthly = (loanAmt * 1000000 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const reqIncome = reqMonthly / (SAFE_DTI / 100);

      const reqIncomeEl = document.getElementById('requiredIncome');
      const incomeHintEl = document.getElementById('incomeHint');
      const autoCard = document.querySelector('.auto-card');

      reqIncomeEl.textContent = '~ ' + fmt(reqIncome) + ' ₮';

      // Compare with user's actual income
      const userIncome = income * 1000;
      const incomeRatio = userIncome / reqIncome;

      if (incomeRatio >= 1.2) {
        autoCard.classList.remove('warn');
        incomeHintEl.innerHTML = `Таны орлого <strong>${(incomeRatio * 100).toFixed(0)}%</strong> хангалттай. Эрсдэлгүй сонголт.`;
      } else if (incomeRatio >= 1) {
        autoCard.classList.remove('warn');
        incomeHintEl.innerHTML = `Таны орлого <strong>яг таарч</strong> байна. Орлогын ${((reqMonthly / userIncome) * 100).toFixed(0)}% нь зээлийн төлбөрт зарцуулагдана.`;
      } else if (incomeRatio >= 0.8) {
        autoCard.classList.add('warn');
        incomeHintEl.innerHTML = `Таны орлого <strong>${((1 - incomeRatio) * 100).toFixed(0)}%-р дутаж</strong> байна. Урьдчилгаа нэмэх эсвэл хямд байр сонгох нь зүйтэй.`;
      } else {
        autoCard.classList.add('warn');
        incomeHintEl.innerHTML = `Орлого <strong>хангалтгүй</strong>. Энэ үнэтэй байр авахад сард <strong>${fmt(reqIncome)} ₮</strong> орлого хэрэгтэй.`;
      }
    } else {
      // Cash purchase
      document.getElementById('requiredIncome').textContent = price + ' сая ₮ бэлэн мөнгө';
      document.getElementById('incomeHint').textContent = 'Бэлэн мөнгөөр худалдан авахад зээл шаардлагагүй';
      document.querySelector('.auto-card').classList.remove('warn');
    }

    if (currentRate === 0) {
      // Cash purchase
      document.getElementById('monthlyAmt').textContent = '0';
      document.getElementById('totalPay').textContent = price + ' сая ₮';
      document.getElementById('totalInterest').textContent = '0 ₮';
      document.getElementById('dti').textContent = '0%';
      document.getElementById('loanAmt').textContent = '0 ₮';
      document.getElementById('bestBankTitle').textContent = 'Бэлэн мөнгөөр';
      // Leave the bank comparison list in place (it is the persistent bank selector now).
      // Hide early payoff for cash
      document.querySelector('.early-payoff').style.opacity = '0.4';
      document.querySelector('.early-payoff').style.pointerEvents = 'none';
      return;
    } else {
      document.querySelector('.early-payoff').style.opacity = '1';
      document.querySelector('.early-payoff').style.pointerEvents = 'auto';
    }

    const monthlyRate = currentRate / 100 / 12;
    const months = term * 12;
    const monthly = (loanAmt * 1000000 * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPay = monthly * months;
    const totalInterest = totalPay - loanAmt * 1000000;
    const dti = (monthly / (income * 1000)) * 100;

    document.getElementById('monthlyAmt').textContent = fmt(monthly);
    document.getElementById('totalPay').textContent = (totalPay / 1000000).toFixed(2) + ' сая ₮';
    document.getElementById('totalInterest').textContent = (totalInterest / 1000000).toFixed(2) + ' сая ₮';
    const dtiEl = document.getElementById('dti');
    dtiEl.textContent = dti.toFixed(1) + '%';
    dtiEl.className = 'small-result-amount ' + (dti < SAFE_DTI ? 'green' : dti < 50 ? 'warn' : 'danger');
    document.getElementById('loanAmt').textContent = fmtMln(loanAmt) + ' сая ₮';

    // The results title now reflects the safety of THIS calculation (the loan type/terms the
    // user themselves picked), not a "best bank" — see the bank list below for why we stopped
    // ranking banks by a computed monthly payment: only 3 of 8 banks have a verified real rate,
    // and computing/ranking payments for the other 5 would mean inventing numbers for them.
    if (dti > SAFE_DTI) {
      document.getElementById('bestBankTitle').innerHTML = `⚠ <span style="color:var(--warning);">Орлогын дарамт өндөр байна (${dti.toFixed(0)}%)</span>`;
    } else {
      document.getElementById('bestBankTitle').textContent = `✓ Санхүүгийн дарамт аюулгүй түвшинд байна`;
    }

    // The bank comparison list (results panel) is highlighted for the selected bank and is
    // rendered by renderBankComparison() on select — not here, so slider drags don't rebuild it.

    // Update early payoff calculation
    calculateEarlyPayoff(loanAmt * 1000000, monthlyRate, monthly, months);
  }

  // ===== BANK SELECTOR =====
  function bankById(id) { return banks.find(b => b.id === id) || banks[0]; }
  // Clean a phone for a tel: link ("1800-1917" -> "18001917", "+976 7000" -> "+9767000").
  function bankTel(phone) { return String(phone || '').replace(/[^0-9+]/g, ''); }

  // Apply a bank's terms to the calculator: rate, down payment and term switch to that bank's
  // official нөхцөл, the selected-bank card + comparison highlight update, and we recalculate.
  function selectBank(id) {
    const b = bankById(id);
    selectedBankId = b.id;
    currentRate = b.rate;
    currentLoanName = b.name;
    currentLoanCap = b.cap || null;
    // Move the sliders to the bank's terms (values only — the slider ranges/marks stay, so the
    // user can still explore around the bank's baseline).
    const down = document.getElementById('downSlider');
    const term = document.getElementById('termSlider');
    if (down) down.value = Math.min(Math.max(b.down, +down.min), +down.max);
    if (term) term.value = Math.min(Math.max(Math.round(b.term / 12), +term.min), +term.max);
    renderBankSelector();
    renderBankDetail(b);
    renderBankComparison();
    calculate();
  }

  // Logo badge markup for a bank: a real logo image (assets/bank-logos/*) when available,
  // otherwise the coloured short-text square as a fallback (banks whose logo we don't have yet).
  function _bankLogo(b, cls) {
    if (b.logo) return `<span class="${cls} ${cls}-img"><img src="${esc(b.logo)}" alt="${esc(b.name)}" loading="lazy"></span>`;
    return `<span class="${cls}" style="background:${esc(b.color)};${b.dark ? 'color:#0A1628;' : ''}">${esc(b.short)}</span>`;
  }

  function renderBankSelector() {
    const row = document.getElementById('bankSelectRow'); if (!row) return;
    row.innerHTML = banks.map(b => `
      <button type="button" class="bank-chip ${b.id === selectedBankId ? 'active' : ''}" data-bank="${esc(b.id)}" title="${esc(b.name)}" aria-label="${esc(b.name)}" aria-pressed="${b.id === selectedBankId}">
        ${_bankLogo(b, 'bank-chip-logo')}
      </button>`).join('');
  }

  // The selected-bank card (zary.mn style): name + Сарын хүү / Урьдчилгаа / Хугацаа + contact.
  function renderBankDetail(b) {
    const card = document.getElementById('bankDetailCard'); if (!card) return;
    const years = Math.round(b.term / 12);
    const tel = bankTel(b.phone);
    const contact = tel
      ? `<a class="bank-contact" href="tel:${esc(tel)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${esc(b.phone)} · Холбогдох</span></a>`
      : (b.sourceUrl ? `<a class="bank-contact" href="${esc(b.sourceUrl)}" target="_blank" rel="noopener nofollow"><span>Албан ёсны сайт →</span></a>` : '');
    card.innerHTML = `
      <div class="bank-detail-head">
        ${_bankLogo(b, 'bank-chip-logo')}
        <div class="bank-detail-name">${esc(b.name)}${b.note ? `<span class="bank-detail-note">${esc(b.note)}</span>` : ''}</div>
      </div>
      <div class="bank-detail-terms">
        <div><span class="bd-label">Сарын хүү</span><span class="bd-val">${esc(b.monthly)}</span></div>
        <div><span class="bd-label">Урьдчилгаа</span><span class="bd-val">${esc(String(b.down))}%</span></div>
        <div><span class="bd-label">Хугацаа</span><span class="bd-val">${b.rate === 0 ? '—' : esc(String(years)) + ' жил'}</span></div>
      </div>
      ${contact ? `<div class="bank-detail-contact">${contact}</div>` : ''}`;
    card.hidden = false;
  }

  function renderBankComparison() {
    const list = document.getElementById('bankList'); if (!list) return;
    list.innerHTML = banks.filter(b => b.id !== 'cash').map(b => `
      <div class="bank-row ${b.id === selectedBankId ? 'active' : ''}" data-bank="${esc(b.id)}" style="cursor:pointer;" title="${esc(b.name)} — сонгох">
        <div class="bank-name">
          ${_bankLogo(b, 'bank-logo')}
          <div>
            <div>${esc(b.name)}</div>
            <div style="font-size:10.5px;color:rgba(255,255,255,0.45);font-weight:500;">Урьдчилгаа ${esc(String(b.down))}% · ${esc(String(Math.round(b.term / 12)))} жил</div>
          </div>
        </div>
        <div class="bank-rate">${esc(b.monthly)}</div>
        <div class="bank-monthly">жилийн ${esc(String(b.rate))}%</div>
        <div>${b.id === selectedBankId
          ? '<span class="best-tag" style="background:rgba(0,212,170,0.22);color:#00D4AA;">✓ Сонгосон</span>'
          : '<span class="best-tag" style="background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);">Сонгох</span>'}</div>
      </div>`).join('') + '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.5);margin-top:12px;line-height:1.6;">Дээрх хүү, урьдчилгаа, хугацаа нь 2026 оны ойролцоо үзүүлэлт. Банкууд нөхцөлөө байнга өөрчилдөг тул эцсийн нөхцөлийг тухайн банкнаас заавал шалгаж баталгаажуулна уу.</div>';
  }

  // ===== EARLY PAYOFF SIMULATOR =====
  function calculateEarlyPayoff(principal, monthlyRate, baseMonthly, baseMonths) {
    const extraK = parseInt(document.getElementById('extraSlider').value); // in thousands
    const extra = extraK * 1000;

    document.getElementById('extraVal').textContent = extra === 0 ? '0 ₮' : '+ ' + fmt(extra) + ' ₮';

    if (extra === 0) {
      document.getElementById('savedInterest').textContent = '0 ₮';
      document.getElementById('savedTime').textContent = '0 сар';
      document.getElementById('earlySummary').innerHTML = 'Сар бүр илүү дүн төлвөл хэдий хэмжээний хүү хэмнэх, хэдэн жилээр зээлийн хугацаа богиносохыг харуулна. <strong>Slider-ийг хөдөлгөж туршаарай!</strong>';
      return;
    }

    // Simulate amortization with extra payments
    const newMonthly = baseMonthly + extra;
    let balance = principal;
    let months = 0;
    let totalInterestPaid = 0;
    const maxMonths = baseMonths * 2; // safety limit

    while (balance > 0 && months < maxMonths) {
      const interestThisMonth = balance * monthlyRate;
      const principalThisMonth = newMonthly - interestThisMonth;

      if (principalThisMonth <= 0) break; // safety

      totalInterestPaid += interestThisMonth;

      if (balance <= principalThisMonth) {
        // Last payment
        totalInterestPaid -= interestThisMonth;
        const finalInterest = balance * monthlyRate;
        totalInterestPaid += finalInterest;
        months += 1;
        balance = 0;
      } else {
        balance -= principalThisMonth;
        months += 1;
      }
    }

    const baseTotalInterest = (baseMonthly * baseMonths) - principal;
    const savedInterest = baseTotalInterest - totalInterestPaid;
    const savedMonths = baseMonths - months;

    const savedYears = Math.floor(savedMonths / 12);
    const savedMonthsRemainder = savedMonths % 12;
    const newYears = Math.floor(months / 12);
    const newMonthsRemainder = months % 12;

    const formatTime = (y, m) => {
      if (y === 0 && m === 0) return '0 сар';
      if (y === 0) return m + ' сар';
      if (m === 0) return y + ' жил';
      return y + ' жил ' + m + ' сар';
    };

    document.getElementById('savedInterest').textContent = (savedInterest / 1000000).toFixed(1) + ' сая ₮';
    document.getElementById('savedTime').textContent = formatTime(savedYears, savedMonthsRemainder);

    document.getElementById('earlySummary').innerHTML = `
      Сар бүр <strong>${fmt(extra)} ₮</strong> илүү төлвөл, та зээлээсээ
      <strong style="color:var(--accent);">${formatTime(newYears, newMonthsRemainder)}-нд</strong> бүрэн салах ба нийт
      <strong style="color:var(--accent);">${(savedInterest / 1000000).toFixed(1)} сая ₮</strong> хүү хэмнэнэ.
      <br><span style="font-size:12px; color:rgba(255,255,255,0.6); display:inline-block; margin-top:6px;">
      ${baseMonths} сар → ${months} сар (${formatTime(savedYears, savedMonthsRemainder)} богиносно)
      </span>
    `;
  }

  // ===== AFFORDABILITY =====
  // Live, human-readable echo of the two big number inputs so the user can tell at a glance
  // what they typed (e.g. 85000000 -> "85,000,000 ₮ · 85 сая") and which field is which.
  function _affMln(v) {
    const n = Math.max(0, parseInt(v, 10) || 0);
    if (!n) return '';
    const m = n / 1000000;
    const mTxt = (m >= 10 ? Math.round(m) : +m.toFixed(1)).toLocaleString('en-US');
    return fmt(n) + ' ₮ · ' + mTxt + ' сая';
  }
  function updateAffordHints() {
    const ih = document.getElementById('affIncomeHint');
    const dh = document.getElementById('affDownHint');
    if (ih) ih.textContent = _affMln(document.getElementById('affIncome').value);
    if (dh) dh.textContent = _affMln(document.getElementById('affDown').value);
  }

  function calculateAfford() {
    const income = parseInt(document.getElementById('affIncome').value) || 0;
    const down = parseInt(document.getElementById('affDown').value) || 0;
    const history = document.getElementById('affHistory').value;
    const otherDebt = parseInt(document.getElementById('affOther').value) || 0;

    // Same site-wide safe DTI threshold as calculate() above, minus other debts
    const maxMonthly = (income * SAFE_DTI / 100) - otherDebt;

    // Adjust for credit history
    const historyMult = history === 'A' ? 1.0 : history === 'B' ? 0.9 : history === 'C' ? 0.75 : 0.6;
    const adjMonthly = maxMonthly * historyMult;

    // Uses the same loan rate currently selected in the calculator above (currentRate) instead
    // of a second, unreconciled hardcoded rate — one page, one user-adjustable rate.
    const r = currentRate / 100 / 12;
    const n = 240;
    const maxLoan = r === 0 ? adjMonthly * n : adjMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));

    const maxPriceLow = (maxLoan + down) / 1000000;
    const maxPriceHigh = maxPriceLow * 1.12;

    document.getElementById('affResultAmt').textContent = `${Math.round(maxPriceLow)} — ${Math.round(maxPriceHigh)} сая ₮`;
    const affDetailEl = document.getElementById('affResultDetail');
    if (affDetailEl) affDetailEl.textContent = `${currentRate}% хүү (${currentLoanName}, дээрх тооцоолуурын сонголт), 20 жилийн хугацаатай. Орлогын ${SAFE_DTI}% хүртэл сар бүрийн төлбөр гэж тооцов.`;
    document.getElementById('affMaxLoan').textContent = `${Math.round(maxLoan / 1000000)} сая ₮`;
    document.getElementById('affMonthly').textContent = `${(adjMonthly / 1000000).toFixed(2)} сая ₮`;
    document.getElementById('affDownDisp').textContent = `${Math.round(down / 1000000)} сая ₮`;

    let risk, riskColor, advice;
    const downPct = (down / (maxPriceLow * 1000000)) * 100;
    if (downPct >= 30 && history === 'A') { risk = 'Бага'; riskColor = 'var(--accent)'; }
    else if (downPct >= 20) { risk = 'Дунд'; riskColor = 'var(--warning)'; }
    else { risk = 'Өндөр'; riskColor = 'var(--danger)'; }
    document.getElementById('affRisk').textContent = risk;
    document.getElementById('affRisk').style.color = riskColor;

    if (maxPriceLow >= 400) advice = `Таны нөхцөл хангалттай сайн! ${Math.round(maxPriceLow)}-${Math.round(maxPriceHigh)} сая ₮ үнийн хязгаарт тохирох заруудыг Listings хэсгээс үнэ, талбай, байршлаар шүүж үзээрэй.`;
    else if (maxPriceLow >= 200) advice = `Сайн сонголтууд бий. ${Math.round(maxPriceLow)} сая ₮-н орчмын байрыг Listings хэсгээс хайж үзээрэй.`;
    else if (maxPriceLow >= 100) advice = `Эхэлж буй хүний хувьд сайн боломж. Байршлын сонголтыг тухайн үеийн бодит зарын үнэ, дэд бүтэц, замын нөхцөлтэй харьцуулж сонгоорой.`;
    else advice = `Илүү их урьдчилгаа төлбөр, эсвэл хадгаламжтай болсны дараа хайх нь зүйтэй.`;
    document.getElementById('affAdvice').textContent = advice;

    showToast('Үнэлгээ амжилттай хийгдлээ', 'success');
  }

  // ===== EVENT LISTENERS =====
  ['priceSlider', 'downSlider', 'incomeSlider', 'termSlider', 'extraSlider'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculate);
  });

  // Bank selection (logo row + comparison list) — both delegate to selectBank(), which
  // switches the rate/down/term and recalculates. One handler via event delegation.
  function _bankClickHandler(e) {
    const el = e.target.closest('[data-bank]'); if (!el) return;
    selectBank(el.dataset.bank);
  }
  const bankRow = document.getElementById('bankSelectRow');
  const bankListEl = document.getElementById('bankList');
  if (bankRow) bankRow.addEventListener('click', _bankClickHandler);
  if (bankListEl) bankListEl.addEventListener('click', _bankClickHandler);
  // Initial paint: select the default (6%) bank so the selector, detail card and comparison
  // all render and the calculator starts on the program's terms.
  selectBank(selectedBankId);
  // Fill the affordability input hints for the default values.
  updateAffordHints();

  // Two independent .filter-pill[data-cat] surfaces exist on the Listings page now (the
  // top category tabs and the sidebar's "Үл хөдлөхийн төрөл" list) — sync every element
  // sharing the clicked data-cat, not just the one actually clicked, the same pattern
  // already used everywhere else this state is set (home.js, search.js, saved-searches.js).
  document.querySelectorAll('.filter-pill[data-cat]').forEach(t => {
    t.addEventListener('click', () => {
      setSearchCategory(t.dataset.cat);
      applyListingFilter();
    });
  });

  // The old hero's quick-filter chips (instant-apply, one navigate-to-Listings per
  // click) were replaced by the new home search bar's chip row (index.html) — those
  // now just mark themselves active/inactive and only take effect once "Хайх" is
  // pressed, via performSearch() in search.js.

