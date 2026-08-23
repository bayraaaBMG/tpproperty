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
  const banks = [
    {
      name: 'Голомт Банк', short: 'ГБ', color: '#E31E24',
      productName: 'Амины орон сууц худалдан авах зээл',
      annualRateText: '16.8–21.6%', downPaymentText: '40%-иас багагүй', loanTermText: '240 сар хүртэл',
      feeText: '10,000₮ хүсэлтийн хураамж + зээлийн дүнгийн 1%',
      verified: true, sourceUrl: 'https://www.golomtbank.com/retail/loans/786', lastUpdated: '2026-08-13'
    },
    {
      name: 'Хас Банк', short: 'ХБ', color: '#00A651',
      productName: 'Хөнгөлөлттэй хөтөлбөрийн орон сууцны зээл',
      annualRateText: '6%', downPaymentText: 'Тодорхойгүй', loanTermText: '240 сар хүртэл',
      feeText: 'Тодорхойгүй',
      verified: true, sourceUrl: 'https://xacbank.mn/mortgage', lastUpdated: '2026-08-13'
    },
    {
      name: 'Төрийн Банк', short: 'ТБ', color: '#FFB81C', dark: true,
      productName: 'Орон сууцны ипотекийн зээл',
      annualRateText: '6%', downPaymentText: 'Тодорхойгүй', loanTermText: 'Тодорхойгүй',
      feeText: 'Тодорхойгүй',
      verified: true, sourceUrl: 'https://www.statebank.mn/personal/product/10054', lastUpdated: '2026-08-13'
    },
    {
      name: 'Худалдаа Хөгжлийн Банк', short: 'ХХБ', color: '#003F87',
      productName: 'Орон сууц худалдан авах зээл',
      annualRateText: '18.60–20.40% (бодит өртөг 19.07–20.87%)', downPaymentText: '20%-иас багагүй (нэмэлт барьцаагүй тохиолдолд 40%+)',
      loanTermText: '240 сар хүртэл (20 жил)', feeText: 'Үйлчилгээний хураамж зээлийн дүнгийн 1% (дээд тал нь 1,500,000₮)',
      verified: true, sourceUrl: 'https://www.tdbm.mn/mn/retail/loans/oron-suutsnii-zeel/oron-suuc-khudaldan-avakh-zeel', lastUpdated: '2026-08-13'
    },
    {
      name: 'Богд Банк', short: 'ББ', color: '#0A1628',
      productName: 'Орон сууцны ипотекийн 6% зээл',
      annualRateText: '6%', downPaymentText: 'Тодорхойгүй', loanTermText: 'Тодорхойгүй', feeText: 'Тодорхойгүй',
      verified: true, sourceUrl: 'https://www.bogdbank.com/product/53', lastUpdated: '2026-08-13'
    },
    {
      name: 'Ариг Банк', short: 'АБ', color: '#FF6B35',
      productName: 'Ипотекийн зээл 6%',
      annualRateText: '6%', downPaymentText: 'Тодорхойгүй', loanTermText: 'Тодорхойгүй', feeText: 'Тодорхойгүй',
      verified: true, sourceUrl: 'https://www.arigbank.mn/mn/product/loan/26', lastUpdated: '2026-08-13'
    },
    {
      name: 'Хаан Банк', short: 'ХБ', color: '#0066B3',
      productName: 'Орон сууц худалдан авах зээл (5 жил тутам хувьсах хүүтэй)', annualRateText: 'Тодорхойгүй',
      downPaymentText: 'Тодорхойгүй', loanTermText: 'Тодорхойгүй', feeText: 'Тодорхойгүй',
      verified: false, sourceUrl: 'https://www.khanbank.com/personal/product/detail/39/', lastUpdated: '2026-08-13'
    },
    {
      name: 'Капитрон Банк', short: 'КБ', color: '#7B2CBF',
      productName: 'Орон сууцны зээл', annualRateText: 'Тодорхойгүй',
      downPaymentText: 'Тодорхойгүй', loanTermText: 'Тодорхойгүй', feeText: 'Тодорхойгүй',
      verified: false, sourceUrl: 'https://www.capitronbank.mn/c/%D0%BE%D1%80%D0%BE%D0%BD-%D1%81%D1%83%D1%83%D1%86%D0%BD%D1%8B-%D0%B7%D1%8D%D1%8D%D0%BB', lastUpdated: '2026-08-13'
    }
  ];

  let currentRate = 17.5;
  let currentLoanName = 'Энгийн ипотек ~17.5% (2026.04)';
  let currentLoanCap = null; // сая ₮ — зарим зээлийн төрөл (жиш. хөнгөлөлттэй 6% хөтөлбөр) улсын хөтөлбөрийн хэмжээгээр хязгаарлагддаг

  // Сайт даяар ганц стандарт орлогын дарамтын (DTI) аюулгүй дээд хязгаар — энэ тооцоолуур,
  // стресс тест, шаардлагатай орлогын тооцоо бүгд үүнийг л ашиглана. Өмнө нь 40%/45%/47.7%/50%
  // гэсэн 4 өөр тоо газар бүрт зөрүүтэй байсан.
  const SAFE_DTI = 40;

  function calculate() {
    const price = parseInt(document.getElementById('priceSlider').value);
    const downPct = parseInt(document.getElementById('downSlider').value);
    const income = parseInt(document.getElementById('incomeSlider').value);
    const term = parseInt(document.getElementById('termSlider').value);

    const downAmt = Math.round(price * downPct / 100);
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
    document.getElementById('priceVal').textContent = price >= 1000 ? (price/1000).toFixed(2) + ' тэрбум ₮' : price + ' сая ₮';
    document.getElementById('downVal').textContent = downAmt + ' сая ₮ (' + downPct + '%)';
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
      document.getElementById('bankList').innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.5); padding:20px; font-size:13px;">Бэлэн мөнгөөр худалдан авахад зээл шаардахгүй</div>';
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
    document.getElementById('totalPay').textContent = (totalPay / 1000000).toFixed(1) + ' сая ₮';
    document.getElementById('totalInterest').textContent = (totalInterest / 1000000).toFixed(1) + ' сая ₮';
    const dtiEl = document.getElementById('dti');
    dtiEl.textContent = dti.toFixed(1) + '%';
    dtiEl.className = 'small-result-amount ' + (dti < SAFE_DTI ? 'green' : dti < 50 ? 'warn' : 'danger');
    document.getElementById('loanAmt').textContent = loanAmt + ' сая ₮';

    // The results title now reflects the safety of THIS calculation (the loan type/terms the
    // user themselves picked), not a "best bank" — see the bank list below for why we stopped
    // ranking banks by a computed monthly payment: only 3 of 8 banks have a verified real rate,
    // and computing/ranking payments for the other 5 would mean inventing numbers for them.
    if (dti > SAFE_DTI) {
      document.getElementById('bestBankTitle').innerHTML = `⚠ <span style="color:var(--warning);">Орлогын дарамт өндөр байна (${dti.toFixed(0)}%)</span>`;
    } else {
      document.getElementById('bestBankTitle').textContent = `✓ Санхүүгийн дарамт аюулгүй түвшинд байна`;
    }

    // Bank list — informational only, not ranked or computed. Each bank's rate/terms are either
    // verified straight from that bank's own official page (verified:true, with source + date)
    // or explicitly marked "Тодорхойгүй" — never estimated or guessed. See the `banks` array
    // above for the full verification note.
    document.getElementById('bankList').innerHTML = banks.map(b => `
      <div class="bank-row ${b.verified ? 'verified' : 'unverified'}" onclick="window.open('${b.sourceUrl}', '_blank', 'noopener')" style="cursor:pointer;" title="${esc(b.name)} — банкны албан ёсны хуудас руу очих">
        <div class="bank-name">
          <div class="bank-logo" style="background:${b.color};${b.dark ? 'color:#0A1628;' : ''}">${b.short}</div>
          <div>
            <div>${esc(b.name)}</div>
            <div style="font-size:10.5px;color:rgba(255,255,255,0.45);font-weight:500;">${esc(b.productName)}</div>
          </div>
        </div>
        <div class="bank-rate">${b.verified ? esc(b.annualRateText) : 'Тодорхойгүй'}</div>
        <div class="bank-monthly" style="font-size:11px;color:rgba(255,255,255,0.55);">${b.verified ? 'Шалгасан: ' + b.lastUpdated : 'Банкны сайтаас шалгана уу'}</div>
        <div>${b.verified
          ? '<span class="best-tag" style="background:rgba(0,212,170,0.22);color:#00D4AA;">✓ Шалгасан</span>'
          : '<span class="best-tag" style="background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);">Шалгаагүй</span>'}</div>
      </div>
    `).join('') + '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.5);margin-top:12px;line-height:1.6;">Дээрх хүү, нөхцөл нь тухайн банкны албан ёсны вэбсайтаас шалгасан үзүүлэлт (эсвэл "Тодорхойгүй" гэж тэмдэглэсэн). Зээлийн хүү, шимтгэл болон бусад нөхцөл банкны шийдвэр, бүтээгдэхүүнээс хамаарч өөрчлөгдөж болно. Эцсийн нөхцөлийг тухайн банкнаас баталгаажуулна уу.</div>';

    // Update early payoff calculation
    calculateEarlyPayoff(loanAmt * 1000000, monthlyRate, monthly, months);
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

  document.querySelectorAll('.loan-type').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.loan-type').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentRate = parseFloat(t.dataset.rate);
      currentLoanName = t.dataset.name;
      currentLoanCap = t.dataset.cap ? parseFloat(t.dataset.cap) : null;
      calculate();
    });
  });

  // Two independent .filter-pill[data-cat] surfaces exist on the Listings page now (the
  // top category tabs and the sidebar's "Үл хөдлөхийн төрөл" list) — sync every element
  // sharing the clicked data-cat, not just the one actually clicked, the same pattern
  // already used everywhere else this state is set (home.js, search.js, saved-searches.js).
  document.querySelectorAll('.filter-pill[data-cat]').forEach(t => {
    t.addEventListener('click', () => {
      currentCat = t.dataset.cat;
      document.querySelectorAll('.filter-pill[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === currentCat));
      applyListingFilter();
    });
  });

  // The old hero's quick-filter chips (instant-apply, one navigate-to-Listings per
  // click) were replaced by the new home search bar's chip row (index.html) — those
  // now just mark themselves active/inactive and only take effect once "Хайх" is
  // pressed, via performSearch() in search.js.

  // ESC to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

