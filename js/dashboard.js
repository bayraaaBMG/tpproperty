  // ===== DASHBOARD (real, per-logged-in-user data) =====
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // Shown instead of the real seller dashboard for a signed-in account that isn't yet an
  // approved agent (js/permissions.js isApprovedAgent()) — closed brokerage system, so
  // logging in alone no longer grants access to the listing-management dashboard.
  function renderAgentRestrictedDashboard() {
    return `
      <div style="text-align:center;padding:100px 20px;max-width:440px;margin:0 auto;">
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;margin-bottom:10px;">
          Таны бүртгэл Agent эрхээр батлагдаагүй байна
        </div>
        <div style="color:var(--ink-3);font-size:14px;line-height:1.6;margin-bottom:20px;">
          Зар нэмэх, удирдах боломжийг ашиглахын тулд TP Property-ийн админтай холбогдож
          Agent эрх аваарай.
        </div>
        <button class="btn btn-blue btn-lg" onclick="showPage('home')">Нүүр хуудас руу буцах</button>
      </div>
    `;
  }

  function renderDashboard() {
    if (!currentUser) return;
    if (typeof isApprovedAgent === 'function' && !isApprovedAgent(currentUser)) {
      const root = document.querySelector('#dashboard > .section-inner');
      if (root) root.innerHTML = renderAgentRestrictedDashboard();
      return;
    }
    const myListings = listings.filter(l => l.userSubmitted && l.ownerId === currentUser.uid);
    const activeListings = myListings.filter(l => !l._inactive);
    const totalContacts = myListings.reduce((s, l) => s + (l.contactCount || 0), 0);
    const totalFavorites = myListings.reduce((s, l) => s + (l.favoriteCount || 0), 0);
    // Single shared stats function (js/utils.js) — also used by js/admin.js's per-agent CRM
    // row/detail, so "active"/"this month"/"most viewed" can never quietly disagree between
    // the Agent's own dashboard and what Admin sees for the same account.
    const stats = computeAgentStats(myListings.map(l => ({ status: l.status || 'active', viewCount: l.viewCount || 0, createdAtMs: l._createdAtMs || 0, title: l.title, img: l.img, id: l.id })));

    setText('dashGreeting', `Сайн байна уу, ${currentUser.name}!`);
    setText('dashSub', myListings.length > 0
      ? `Танд ${activeListings.length} идэвхтэй зар байна. Нийт ${fmt(stats.totalViews)} үзэлт авсан байна.`
      : 'Та одоогоор зар нэмээгүй байна.');
    setText('dashStatViews', fmt(stats.totalViews));
    setText('dashStatContacts', fmt(totalContacts));
    setText('dashStatFavorites', fmt(totalFavorites));
    setText('dashStatActive', activeListings.length);
    setText('dashStatSold', stats.sold);
    setText('dashStatRented', stats.rented);
    setText('dashStatNewMonth', stats.thisMonthNew);
    setText('dashListingsSub', `Нийт ${myListings.length} зараас сүүлд нэмэгдсэн нь эхэнд`);

    const mostViewedEl = document.getElementById('dashMostViewed');
    if (mostViewedEl) {
      if (stats.mostViewed) {
        mostViewedEl.style.display = 'block';
        mostViewedEl.innerHTML = `Хамгийн их үзсэн зар: <b style="color:var(--ink);">${esc(stats.mostViewed.title)}</b> — ${fmt(stats.mostViewed.viewCount)} үзэлт`;
      } else {
        mostViewedEl.style.display = 'none';
      }
    }

    renderDashProfileCard();

    const list = document.getElementById('dashMyListingsList');
    if (list) {
      if (myListings.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--ink-3);">
          <div style="font-size:14px;margin-bottom:14px;">Та одоогоор зар нэмээгүй байна.</div>
          <button class="btn btn-blue" onclick="openAddListing()">Эхний зараа нэмэх</button>
        </div>`;
      } else {
        // Newest first — this panel doubles as "Сүүлийн нэмсэн зарууд" (index.html title).
        list.innerHTML = myListings.slice().sort((a, b) => (b._createdAtMs || 0) - (a._createdAtMs || 0)).slice(0, 5).map(l => `
          <div class="dash-listing" onclick="showPage('listings'); setTimeout(()=>openListing(${l.id}),150)" style="${l._inactive ? 'opacity:0.6;' : ''}">
            <img class="dash-listing-img" src="${esc(l.img)}" alt="" onerror="this.style.background='var(--paper-2)';this.removeAttribute('src');" />
            <div class="dash-listing-info">
              <div class="dash-listing-title">${esc(l.title)}</div>
              <div class="dash-listing-price">${fmtPrice(l.price)}</div>
              <div class="dash-listing-stats">
                <span class="dash-listing-stat">👁 ${l.viewCount || 0}</span>
                <span class="dash-listing-stat">♥ ${l.favoriteCount || 0}</span>
                <span class="dash-listing-stat">☎ ${l.contactCount || 0}</span>
              </div>
            </div>
            <span class="dash-listing-status ${l._inactive ? '' : 'active'}">${({ active: 'Нийтлэгдсэн', pending: 'Хянагдаж байна', rejected: 'Буцаагдсан', expired: 'Хаагдсан', sold: 'Зарагдсан', rented: 'Түрээслэгдсэн' })[l.status || 'active'] || 'Нийтлэгдсэн'}</span>
          </div>
        `).join('');
      }
    }

    const banner = document.getElementById('dashBoostBanner');
    if (banner) banner.style.display = activeListings.length > 0 ? 'block' : 'none';

    renderViewsChart(activeListings);
  }

  // ===== DASHBOARD PROFILE CARD ("Өөрийн profile мэдээлэл") =====
  // Read-only summary built entirely from currentUser — photo/name/email/verified-phone
  // already exist and are already editable via the real Миний тохиргоо flow
  // (openAccountSettings() below), so this just surfaces what's already there plus a
  // shortcut into that existing editor rather than building a second edit UI.
  function renderDashProfileCard() {
    const el = document.getElementById('dashProfileCard');
    if (!el || !currentUser) return;
    const contact = currentUser.isPhone ? (currentUser.phoneNumber || '') : (currentUser.email || '');
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, var(--primary), var(--primary-deep));display:grid;place-items:center;overflow:hidden;flex-shrink:0;font-size:20px;font-weight:700;color:#fff;">
          ${currentUser.photoURL ? `<img src="${esc(currentUser.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc(currentUser.letter || '?')}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:15px;">${esc(((currentUser.lastName || '') + ' ' + (currentUser.name || '')).trim())}</div>
          <div style="font-size:12.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(contact || '—')}</div>
          <span class="admin-role-pill" style="background:rgba(0,200,120,.12);color:#0a8a52;margin-top:4px;display:inline-block;">TP Property Agent</span>
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--ink-3);margin-bottom:12px;">
        Утас: ${currentUser.verifiedPhone ? `<b style="color:var(--ink);">+976 ${esc(currentUser.verifiedPhone)}</b> ✓` : '<span style="color:var(--ink-3);">баталгаажаагүй</span>'}
      </div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;border:1.5px solid var(--line-2);" onclick="openAccountSettings()">Тохиргоо засах</button>
    `;
  }

  // ===== DASHBOARD VIEWS CHART (real per-listing view counts) =====
  function renderViewsChart(myActiveListings) {
    const chart = document.getElementById('viewsChart');
    if (!chart) return;
    const list = (myActiveListings || []).slice(0, 7);
    if (list.length === 0) {
      chart.innerHTML = `<div style="width:100%;align-self:center;text-align:center;color:var(--ink-3);font-size:13px;">Идэвхтэй зар нэмэхэд статистик энд харагдана</div>`;
      return;
    }
    const max = Math.max(...list.map(l => l.viewCount || 0), 1);
    chart.innerHTML = list.map(l => `
      <div class="views-bar-col">
        <div class="views-bar" style="height:${((l.viewCount || 0) / max) * 100}%;" title="${esc(l.title)}: ${l.viewCount || 0} үзэлт"></div>
        <div class="views-bar-label" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:44px;">${esc((l.title || '').split(',')[0])}</div>
      </div>
    `).join('');
  }

  // ===== BOOST (dashboard entry point) =====
  // This used to build its own modal here — hardcoded plan prices, invented "3x/5x/8x
  // views" and "60-75% sells faster" figures with no source, a listing title that was
  // hardcoded regardless of which listing was actually being boosted, and a "confirm"
  // button that only closed the modal and showed a success toast with no Firestore write,
  // no badge, no expiresAt change — nothing was ever actually boosted. Removed all of
  // that; this now just routes into the one real boost flow (openBoostModal in
  // my-listings.js), which already writes the badge/expiresAt for a specific real
  // listing and already discloses "жишээ/demo төлбөрийн урсгал — бодит төлбөрийн систем
  // холбогдоогүй" up front.
  function openDashboardBoost() {
    if (!currentUser) return;
    const myActive = listings.filter(l => l.userSubmitted && l.ownerId === currentUser.uid && !l._inactive);
    if (myActive.length === 1) {
      openBoostModal(myActive[0].id);
    } else if (myActive.length > 1) {
      showPage('my-listings');
      if (typeof renderMyListings === 'function') renderMyListings('active');
      showToast('Аль зараа дээшлүүлэхээ доороос сонгоно уу');
    }
  }

  // ===== ACCOUNT SIDEBAR (support + quick links, shown on Dashboard / My Listings) =====
  const ACCT_SUPPORT_EMAIL = 'bbayraa20@gmail.com';
  const ACCT_SUPPORT_PHONE = '7211-9435';

  function renderAccountSidebar() {
    const html = `
      <div class="acct-support">
        <div class="acct-support-label">Техникийн тусламж</div>
        <div class="acct-support-phone">${ACCT_SUPPORT_PHONE}</div>
        <a class="acct-support-email" href="mailto:${ACCT_SUPPORT_EMAIL}">${ACCT_SUPPORT_EMAIL}</a>
      </div>
      <div class="acct-nav-list">
        <a onclick="showPage('my-listings')">Миний зарууд</a>
        <a onclick="openPaymentHistory()">Төлбөр</a>
        <a onclick="openAccountSettings()">Миний тохиргоо</a>
        <a onclick="openFavorites()">Таалагдсан зарууд <span class="acct-nav-count">${favorites.length}</span></a>
        <a onclick="openSavedSearches()">Таалагдсан хайлтууд <span class="acct-nav-count">${typeof savedSearchesCount !== 'undefined' ? savedSearchesCount : 0}</span></a>
      </div>
    `;
    ['acctSidebarDash', 'acctSidebarMyListings'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  // ===== МИНИЙ ТОХИРГОО (account settings) =====
  function openAccountSettings() {
    if (!currentUser) { showToast('Нэвтэрнэ үү'); openAuth(); return; }
    pendingProfilePhoto = null;
    const canChangePassword = !currentUser.isGoogle && !currentUser.isPhone;
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">Тохиргоо</span>
        <div class="al-title" style="margin-bottom:20px;">Миний тохиргоо</div>

        <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
          <div style="position:relative; width:72px; height:72px; flex-shrink:0;">
            <div id="acctPhotoPreview" style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-deep)); display:grid; place-items:center; overflow:hidden; font-size:26px; font-weight:700; color:#fff;">
              ${currentUser.photoURL ? `<img src="${esc(currentUser.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc(currentUser.letter)}
            </div>
            <label for="acctPhotoInput" style="position:absolute; bottom:-2px; right:-2px; width:26px; height:26px; border-radius:50%; background:var(--ink); display:grid; place-items:center; cursor:pointer; border:2px solid white;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </label>
            <input type="file" id="acctPhotoInput" accept="image/*" style="display:none" onchange="handleProfilePhotoUpload(event)" />
          </div>
          <div style="font-size:12px; color:var(--ink-3); line-height:1.5;">Профайл зураг<br>JPG, PNG зөвшөөрнө</div>
        </div>

        <div class="form-grid-2">
          <div>
            <label class="form-label">Овог</label>
            <input class="form-input" id="acctLastName" value="${esc(currentUser.lastName || '')}" />
          </div>
          <div>
            <label class="form-label">Нэр</label>
            <input class="form-input" id="acctFirstName" value="${esc(currentUser.name || '')}" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">Холбоо барих</label>
          <input class="form-input" value="${esc(currentUser.isPhone ? (currentUser.phoneNumber || '') : (currentUser.email || ''))}" disabled />
        </div>

        <div class="form-row" id="phoneVerifyRow">
          ${renderPhoneVerifyBlock()}
        </div>

        <div class="form-row">
          <label class="form-label">Хэрэглэгчийн төрөл <span class="hint">— зарын профайл дээр харагдана</span></label>
          <select class="form-select" id="acctType" onchange="document.getElementById('acctCompanyRow').style.display = this.value === 'owner' ? 'none' : ''">
            <option value="owner" ${(currentUser.accountType || 'owner') === 'owner' ? 'selected' : ''}>Үл хөдлөхийн эзэн</option>
            <option value="agent" ${currentUser.accountType === 'agent' ? 'selected' : ''}>Үл хөдлөхийн агент</option>
            <option value="company" ${currentUser.accountType === 'company' ? 'selected' : ''}>Барилгын компани</option>
          </select>
        </div>
        <div class="form-row" id="acctCompanyRow" style="display:${(currentUser.accountType === 'agent' || currentUser.accountType === 'company') ? '' : 'none'};">
          <label class="form-label">Агентлаг/Компанийн нэр <span class="hint">— заавал биш</span></label>
          <input class="form-input" id="acctCompanyName" placeholder="Жнь: Болор Эстэйт" value="${esc(currentUser.companyName || '')}" />
        </div>

        <button class="btn btn-blue btn-lg" style="width:100%;justify-content:center;margin-top:8px;" onclick="saveAccountSettings()">Хадгалах</button>

        ${canChangePassword ? `
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--line);">
          <div class="step-section-title" style="margin-bottom:12px;">Нууц үг солих</div>
          <div class="form-row"><label class="form-label">Одоогийн нууц үг</label><input class="form-input" type="password" id="acctCurPw" autocomplete="current-password" /></div>
          <div class="form-row"><label class="form-label">Шинэ нууц үг</label><input class="form-input" type="password" id="acctNewPw" placeholder="Хамгийн багадаа 6 тэмдэгт" autocomplete="new-password" /></div>
          <button class="btn btn-ghost" style="width:100%;justify-content:center;" onclick="changeAccountPassword()">Нууц үг солих</button>
        </div>` : ''}

        <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:20px;color:var(--danger);" onclick="closeModal(); logout();">Гарах</button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ===== ACCOUNT PHONE VERIFICATION (real Firebase Phone Auth — same OTP mechanism as
  // phone sign-in, but links the number to the current account with linkWithPhoneNumber
  // instead of signing in). This is what "Verified phone" on a listing actually checks —
  // not just "an account exists", but that this specific number received a real SMS code. =====
  let acctPhoneVerifyStep = 'idle';
  let acctPhoneVerifyNumber = '';
  let acctPhoneOtpConfirmation = null;
  let acctPhoneRecaptchaVerifier = null;
  let acctPhoneOtpCooldown = false;

  function renderPhoneVerifyBlock() {
    if (currentUser.verifiedPhone) {
      return `
        <label class="form-label">Утасны дугаарын баталгаажуулалт</label>
        <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;background:rgba(0,212,170,0.1);border-radius:10px;color:#009878;font-weight:700;font-size:13px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          +976 ${esc(currentUser.verifiedPhone)} дугаар баталгаажсан
        </div>
      `;
    }
    if (acctPhoneVerifyStep === 'otp') {
      return `
        <label class="form-label">Баталгаажуулах код</label>
        <div style="font-size:12px;color:var(--ink-3);margin-bottom:10px;">+976 ${esc(acctPhoneVerifyNumber)} дугаарт 6 оронтой код илгээлээ</div>
        <div class="otp-input-group">
          ${[0,1,2,3,4,5].map(i => `<input type="text" class="otp-input" maxlength="1" id="vphOtp${i}" aria-label="Кодын ${i+1}-р орон"/>`).join('')}
        </div>
        <button class="btn btn-blue" style="width:100%;justify-content:center;margin-top:10px;" onclick="confirmAcctPhoneOtp()">Баталгаажуулах</button>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px;" onclick="acctPhoneVerifyStep='idle'; document.getElementById('phoneVerifyRow').innerHTML = renderPhoneVerifyBlock();">Цуцлах</button>
        <div id="vphRecaptchaContainer"></div>
      `;
    }
    return `
      <label class="form-label">Утасны дугаар баталгаажуулах <span class="hint">— зар дээр "Утас баталгаажсан" тэмдэг харагдана</span></label>
      <div class="phone-input-group">
        <div class="phone-prefix">+976</div>
        <input type="tel" class="form-input" id="acctPhoneVerifyInput" placeholder="88112233" maxlength="8" />
      </div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px;" onclick="sendAcctPhoneOtp()">Код илгээх</button>
      <div id="vphRecaptchaContainer"></div>
    `;
  }

  async function sendAcctPhoneOtp() {
    if (!currentUser || !auth.currentUser) { showToast('Нэвтэрнэ үү'); return; }
    const input = document.getElementById('acctPhoneVerifyInput');
    const phone = (input?.value || '').replace(/\D/g, '');
    if (phone.length !== 8) { showToast('Утасны дугаар 8 оронтой байх ёстой'); return; }
    if (acctPhoneOtpCooldown) { showToast('Түр хүлээгээд дахин оролдоно уу'); return; }
    const fullNumber = '+976' + phone;
    try {
      if (!acctPhoneRecaptchaVerifier) {
        acctPhoneRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('vphRecaptchaContainer', { size: 'invisible' });
      }
      acctPhoneOtpConfirmation = await auth.currentUser.linkWithPhoneNumber(fullNumber, acctPhoneRecaptchaVerifier);
      acctPhoneVerifyNumber = phone;
      acctPhoneVerifyStep = 'otp';
      document.getElementById('phoneVerifyRow').innerHTML = renderPhoneVerifyBlock();
      acctPhoneOtpCooldown = true;
      setTimeout(() => { acctPhoneOtpCooldown = false; }, 30000);
      setTimeout(() => document.getElementById('vphOtp0')?.focus(), 100);
      showToast('Баталгаажуулах код илгээгдлээ', 'success');
    } catch(e) {
      const msgs = {
        'auth/invalid-phone-number': 'Утасны дугаар буруу байна',
        'auth/too-many-requests': 'Хэт олон оролдлого. Түр хүлээнэ үү.',
        'auth/credential-already-in-use': 'Энэ дугаар өөр бүртгэлд аль хэдийн ашиглагдсан байна',
        'auth/provider-already-linked': 'Утасны дугаар аль хэдийн холбогдсон байна'
      };
      console.error('sendAcctPhoneOtp failed:', e.code, e.message);
      showToast(msgs[e.code] || ('Код илгээхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')));
      if (acctPhoneRecaptchaVerifier) { acctPhoneRecaptchaVerifier.clear(); acctPhoneRecaptchaVerifier = null; }
    }
  }

  async function confirmAcctPhoneOtp() {
    const code = [0,1,2,3,4,5].map(i => document.getElementById('vphOtp' + i)?.value || '').join('');
    if (code.length !== 6 || !acctPhoneOtpConfirmation) { showToast('6 оронтой кодоо бүрэн оруулна уу'); return; }
    try {
      await acctPhoneOtpConfirmation.confirm(code);
    } catch(e) {
      const msgs = { 'auth/invalid-verification-code': 'Код буруу байна', 'auth/code-expired': 'Кодын хугацаа дууссан байна' };
      console.error('confirmAcctPhoneOtp failed:', e.code, e.message);
      showToast(msgs[e.code] || ('Баталгаажуулахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')));
      [0,1,2,3,4,5].forEach(i => {
        const el = document.getElementById('vphOtp' + i);
        if (el) { el.value = ''; el.classList.remove('filled'); }
      });
      document.getElementById('vphOtp0')?.focus();
      return;
    }
    try {
      await db.collection('users').doc(currentUser.uid).set({ verifiedPhone: acctPhoneVerifyNumber }, { merge: true });
      currentUser.verifiedPhone = acctPhoneVerifyNumber;
      acctPhoneVerifyStep = 'idle';
      const row = document.getElementById('phoneVerifyRow');
      if (row) row.innerHTML = renderPhoneVerifyBlock();
      showToast('Утасны дугаар баталгаажлаа', 'success');
    } catch(e) {
      showToast('Баталгаажуулалт амжилттай ч хадгалахад алдаа гарлаа');
    }
  }

  document.addEventListener('input', (e) => {
    if (!e.target.id || !e.target.id.startsWith('vphOtp')) return;
    const i = parseInt(e.target.id.replace('vphOtp', ''), 10);
    if (e.target.value.length === 1) {
      e.target.classList.add('filled');
      const next = document.getElementById('vphOtp' + (i + 1));
      if (next) next.focus(); else confirmAcctPhoneOtp();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!e.target.id || !e.target.id.startsWith('vphOtp')) return;
    if (e.key === 'Backspace' && !e.target.value) {
      const i = parseInt(e.target.id.replace('vphOtp', ''), 10);
      const prev = document.getElementById('vphOtp' + (i - 1));
      if (prev) prev.focus();
    }
  });

  let pendingProfilePhoto = null;
  function handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Зурган файл сонгоно уу'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('Зураг 8MB-аас бага байх ёстой'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize down to a small square so the base64 result stays well under
        // Firestore's 1MiB document limit regardless of the source photo size.
        const maxDim = 320;
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        pendingProfilePhoto = canvas.toDataURL('image/jpeg', 0.85);
        const preview = document.getElementById('acctPhotoPreview');
        if (preview) preview.innerHTML = `<img src="${pendingProfilePhoto}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveAccountSettings() {
    const firstName = document.getElementById('acctFirstName').value.trim();
    const lastName = document.getElementById('acctLastName').value.trim();
    if (!firstName) { showToast('Нэрээ оруулна уу'); return; }
    const accountType = document.getElementById('acctType')?.value || 'owner';
    const companyName = document.getElementById('acctCompanyName')?.value.trim() || '';
    try {
      const updateData = { firstName, lastName, accountType, companyName };
      if (pendingProfilePhoto) updateData.photoURL = pendingProfilePhoto;
      await db.collection('users').doc(currentUser.uid).set(updateData, { merge: true });
      if (auth.currentUser) await auth.currentUser.updateProfile({ displayName: firstName + (lastName ? ' ' + lastName : '') });
      currentUser.name = firstName;
      currentUser.lastName = lastName;
      currentUser.letter = firstName[0] || 'Х';
      currentUser.accountType = accountType;
      currentUser.companyName = companyName;
      if (pendingProfilePhoto) { currentUser.photoURL = pendingProfilePhoto; pendingProfilePhoto = null; }
      updateNavLoggedIn();
      showToast('Мэдээлэл шинэчлэгдлээ', 'success');
    } catch(e) {
      showToast('Хадгалахад алдаа гарлаа');
    }
  }

  async function changeAccountPassword() {
    const curPw = document.getElementById('acctCurPw').value;
    const newPw = document.getElementById('acctNewPw').value;
    if (!curPw || newPw.length < 6) { showToast('Нууц үгээ зөв оруулна уу (шинэ нь 6+ тэмдэгт)'); return; }
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, curPw);
      await auth.currentUser.reauthenticateWithCredential(cred);
      await auth.currentUser.updatePassword(newPw);
      showToast('Нууц үг солигдлоо', 'success');
      document.getElementById('acctCurPw').value = '';
      document.getElementById('acctNewPw').value = '';
    } catch(e) {
      const msgs = { 'auth/wrong-password': 'Одоогийн нууц үг буруу байна', 'auth/weak-password': 'Шинэ нууц үг хэт энгийн байна' };
      showToast(msgs[e.code] || 'Нууц үг солиход алдаа гарлаа');
    }
  }

  // ===== ТӨЛБӨР (payment / boost transaction history) =====
  async function openPaymentHistory() {
    if (!currentUser) { showToast('Нэвтэрнэ үү'); openAuth(); return; }
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px 28px;">
        <span class="al-eyebrow">Төлбөр</span>
        <div class="al-title" style="margin-bottom:20px;">Төлбөрийн түүх</div>
        <div id="paymentHistoryList" style="text-align:center;padding:40px;color:var(--ink-3);">Ачааллаж байна…</div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';

    let txns = [];
    try {
      const snap = await db.collection('transactions').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(50).get();
      txns = snap.docs.map(d => d.data());
    } catch(e) {
      try { txns = JSON.parse(localStorage.getItem('bairxTransactions') || '[]'); } catch(e2) {}
    }
    const list = document.getElementById('paymentHistoryList');
    if (!list) return;
    if (txns.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--ink-3);">Одоогоор төлбөрийн түүх алга байна. Зараа Boost хийхэд эндээс харагдана.</div>`;
      return;
    }
    list.innerHTML = txns.map(t => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--line);border-radius:12px;margin-bottom:10px;text-align:left;">
        <div>
          <div style="font-weight:700;font-size:14px;">${esc(t.plan)}</div>
          <div style="font-size:12px;color:var(--ink-3);">${esc(t.listingTitle || '')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;color:var(--primary);">${esc(t.price)}</div>
          <div style="font-size:11px;color:var(--ink-3);">Demo горим</div>
        </div>
      </div>
    `).join('');
  }

