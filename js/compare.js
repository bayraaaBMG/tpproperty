  // ===== BUY vs RENT CALCULATOR =====
  function calculateCompare() {
    const priceM = parseInt(document.getElementById('cmpPrice').value);  // сая
    const rentK = parseInt(document.getElementById('cmpRent').value);    // мянга/сар
    const downPct = parseInt(document.getElementById('cmpDown').value);
    const loanRate = parseFloat(document.getElementById('cmpRate').value);
    const saveRate = parseFloat(document.getElementById('cmpSave').value);
    const years = parseInt(document.getElementById('cmpYears').value);
    const growth = parseFloat(document.getElementById('cmpGrowth').value);

    // Update display labels
    document.getElementById('cmpPriceVal').textContent = fmtPrice(priceM);
    document.getElementById('cmpRentVal').textContent = (rentK/1000).toFixed(1) + ' сая ₮';
    const downAmt = Math.round(priceM * downPct / 100);
    document.getElementById('cmpDownVal').textContent = downAmt + ' сая ₮ (' + downPct + '%)';
    document.getElementById('cmpRateVal').textContent = loanRate.toFixed(1) + '%';
    document.getElementById('cmpSaveVal').textContent = saveRate.toFixed(1) + '%';
    document.getElementById('cmpYearsVal').textContent = years + ' жил';
    document.getElementById('cmpGrowthVal').textContent = growth.toFixed(1) + '%';

    // === Scenario A: BUY ===
    const principal = (priceM - downAmt) * 1000000;
    const r = loanRate / 100 / 12;
    const n = years * 12;
    const monthlyMortgage = (principal * r * Math.pow(1+r,n)) / (Math.pow(1+r,n) - 1);
    const totalPaid = monthlyMortgage * n;
    const totalInterest = totalPaid - principal;
    // Property value after `years`
    const futureValue = priceM * Math.pow(1 + growth/100, years);
    // Equity = property value - remaining debt (which is 0 since fully paid in `years`)
    const buyEquity = futureValue * 1000000;
    // Net wealth: equity - total interest - downpayment (downpayment is yours but tied up)
    const buyNetGain = buyEquity - (priceM * 1000000) - totalInterest;
    // Total cash out: down + total payments
    const buyTotalCashOut = (downAmt * 1000000) + totalPaid;

    // === Scenario B: RENT + INVEST ===
    // Monthly rent grows with growth/2 (rent typically grows slower than property prices)
    let totalRentPaid = 0;
    let invested = downAmt * 1000000; // start by investing the would-be downpayment
    const monthlyR = saveRate / 100 / 12;
    let curRent = rentK * 1000;

    for (let m = 0; m < n; m++) {
      totalRentPaid += curRent;
      // Monthly savings = mortgage payment - rent (the difference you would save)
      const monthlyDiff = monthlyMortgage - curRent;
      // Grow investment
      invested = invested * (1 + monthlyR);
      if (monthlyDiff > 0) invested += monthlyDiff;
      // Rent increases yearly
      if ((m + 1) % 12 === 0) curRent *= (1 + growth/200); // half of property growth
    }
    const rentNetGain = invested - (downAmt * 1000000) - totalRentPaid;
    const rentTotalCashOut = totalRentPaid;

    // Determine winner
    const buyWins = buyNetGain > rentNetGain;
    const diff = Math.abs(buyNetGain - rentNetGain) / 1000000;

    // Render results
    let verdict, verdictDesc;
    if (buyWins) {
      verdict = 'Авах нь илүү ашигтай';
      verdictDesc = `${years} жилийн дараа байр авбал <strong>${(diff).toFixed(0)} сая ₮</strong>-аар илүү цэвэр баялагтай болно. Гэхдээ энэ нь үнийн өсөлт (${growth}%/жил) удаан үргэлжилнэ гэдэгт суурилсан. Зээл байгуулсан хүн орон сууцанд "хатуу бэхлэгдэх" нөхцөлтэй.`;
    } else {
      verdict = 'Түрээслэх нь илүү ашигтай';
      verdictDesc = `${years} жилийн дараа түрээслээд хадгаламж эзэмшсэн хүн <strong>${(diff).toFixed(0)} сая ₮</strong>-аар илүү баялагтай. Шилжих, өөр газар очих, ажил солих эрх чөлөөтэй ч үлдэнэ. Энэ тооцоолол нь таны оруулсан үнэ, түрээс, зээлийн хүү болон хугацаанд үндэслэсэн жишиг харьцуулалт юм.`;
    }

    document.getElementById('compareResults').innerHTML = `
      <div class="verdict-card ${buyWins ? '' : 'rent'}">
        <div class="verdict-label">Шийдвэр</div>
        <div class="verdict-title">${verdict}</div>
        <div class="verdict-amount">+${(diff).toFixed(0)} сая ₮ илүү</div>
        <div class="verdict-desc">${verdictDesc}</div>
      </div>

      <div class="compare-table">
        <div class="compare-row head">
          <div></div>
          <div style="text-align:right;">Авах</div>
          <div style="text-align:right;">Түрээслэх</div>
        </div>
        <div class="compare-row">
          <div class="compare-row-label">Анхдагч зардал</div>
          <div class="compare-row-val">${downAmt} сая ₮</div>
          <div class="compare-row-val">0 ₮</div>
        </div>
        <div class="compare-row">
          <div class="compare-row-label">Сар бүр</div>
          <div class="compare-row-val">${(monthlyMortgage/1000000).toFixed(2)} сая ₮</div>
          <div class="compare-row-val">${(rentK/1000).toFixed(1)} сая ₮</div>
        </div>
        <div class="compare-row">
          <div class="compare-row-label">${years} жил нийт төлсөн</div>
          <div class="compare-row-val">${(buyTotalCashOut/1000000).toFixed(0)} сая ₮</div>
          <div class="compare-row-val">${(rentTotalCashOut/1000000).toFixed(0)} сая ₮</div>
        </div>
        <div class="compare-row">
          <div class="compare-row-label">${years} жилийн дараах хөрөнгө</div>
          <div class="compare-row-val ${buyWins ? 'winner' : ''}">${(buyEquity/1000000).toFixed(0)} сая ₮</div>
          <div class="compare-row-val ${!buyWins ? 'winner' : ''}">${(invested/1000000).toFixed(0)} сая ₮</div>
        </div>
        <div class="compare-row" style="border-top:2px solid rgba(255,255,255,0.15); padding-top:14px; margin-top:6px;">
          <div class="compare-row-label" style="font-weight:700; color:white;">Цэвэр ашиг</div>
          <div class="compare-row-val ${buyWins ? 'winner' : 'loser'}" style="font-size:14px;">${(buyNetGain/1000000).toFixed(0)} сая ₮</div>
          <div class="compare-row-val ${!buyWins ? 'winner' : 'loser'}" style="font-size:14px;">${(rentNetGain/1000000).toFixed(0)} сая ₮</div>
        </div>
      </div>

      <div style="margin-top:18px; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px; font-size:12px; color:rgba(255,255,255,0.6); line-height:1.55;">
        <strong style="color:rgba(255,255,255,0.85);">Тооцооллын суурь:</strong> Зээлийн нэг суурь хүү, түрээс нь үнийн өсөлтийн талаар жил тутам нэмэгдэнэ, хадгаламжид сар бүр зөрүү дүн хийнэ. Бодит байдалд татвар, засвар, бусад зардал нөлөөлнө.
      </div>
    `;
  }

