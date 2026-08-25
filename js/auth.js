  // ===== AUTH SYSTEM =====
  let currentUser = null;
  let authCurrentEmail = '';

  // onAuthStateChanged — page load болгонд Firebase session сэргээнэ
  auth.onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      // Set currentUser from the Firebase Auth user object FIRST, unconditionally.
      // Everything below (Firestore profile/favorites/listings) is enrichment —
      // if Firestore rules block a read, login must not silently roll back to
      // "not logged in" just because a secondary fetch failed.
      const isPhone = fbUser.providerData.some(p => p.providerId === 'phone');
      const isGoogle = fbUser.providerData.some(p => p.providerId === 'google.com');
      const fallbackFirst = fbUser.displayName?.split(' ')[0] || 'Хэрэглэгч';
      const fallbackLast = fbUser.displayName?.split(' ').slice(1).join(' ') || '';
      currentUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        phoneNumber: fbUser.phoneNumber,
        emailVerified: fbUser.emailVerified,
        name: fallbackFirst,
        lastName: fallbackLast,
        letter: fallbackFirst[0] || 'Х',
        photoURL: fbUser.photoURL || null,
        accountType: 'owner',
        companyName: '',
        role: 'user',
        verifiedPhone: isPhone ? normalizePhone(fbUser.phoneNumber) : null,
        isGoogle,
        isPhone
      };
      updateNavLoggedIn();
      // isOwnerUser() only needs the email (already known here, before the Firestore role
      // fetch below resolves) — re-checking now lets the owner's direct #admin link resolve
      // immediately instead of waiting on that fetch; a plain admin still needs it, and gets
      // the second refreshAdminPageIfActive() call further down once role loads.
      if (typeof refreshAdminPageIfActive === 'function') refreshAdminPageIfActive();

      // Email verify banner (not applicable to phone-only accounts, which have no email)
      const banner = document.getElementById('emailVerifyBanner');
      if (banner) {
        if (!fbUser.emailVerified && !isGoogle && !isPhone) {
          banner.style.display = 'flex';
        } else {
          banner.style.display = 'none';
        }
      }

      // Profile name override from Firestore — best-effort only
      try {
        const snap = await db.collection('users').doc(fbUser.uid).get();
        const data = snap.data();
        if (data) {
          currentUser.name = data.firstName || currentUser.name;
          currentUser.lastName = data.lastName || currentUser.lastName;
          currentUser.letter = currentUser.name[0] || 'Х';
          if (data.photoURL) currentUser.photoURL = data.photoURL;
          currentUser.accountType = data.accountType || 'owner';
          currentUser.companyName = data.companyName || '';
          // 'admin' can only ever be granted by the owner through the Users management page
          // (js/admin.js grantAdminRole()), which writes through the one privileged
          // firestore.rules path for it — never settable by the user themselves.
          currentUser.role = data.role || 'user';
          // Phone-auth accounts are always verified via their sign-in number even if this
          // predates verifiedPhone being stored on the profile doc (older accounts).
          currentUser.verifiedPhone = data.verifiedPhone || (isPhone ? normalizePhone(fbUser.phoneNumber) : null);
          updateNavLoggedIn();
          if (typeof refreshAdminPageIfActive === 'function') refreshAdminPageIfActive();
        }
      } catch(e) {
        showToast('Профайл мэдээлэл татахад алдаа гарлаа (Firestore зөвшөөрөл шалгана уу)');
      }

      // Favorites-г Firestore-с татах
      try {
        const fsnap = await db.collection('favorites').where('userId', '==', fbUser.uid).get();
        const fsIds = [];
        fsnap.forEach(doc => { const d = doc.data(); if (d.listingId != null) fsIds.push(d.listingId); });
        if (fsIds.length > 0) {
          fsIds.forEach(id => { if (!favorites.includes(id)) favorites.push(id); });
          try { localStorage.setItem('bairxFavorites', JSON.stringify(favorites)); } catch(e) {}
          updateFavCount();
        }
      } catch(e) {}

      // Firestore-с хэрэглэгчийн зарнуудыг татаж авна
      try {
        const lsnap = await db.collection('listings').where('ownerId', '==', fbUser.uid).get();
        lsnap.forEach(doc => {
          if (listings.some(l => l.firestoreId === doc.id)) return;
          const d = doc.data();
          const numId = listings.reduce((m, l) => l.id > m ? l.id : m, 0) + 1;
          const feats = d.features || [];
          const entry = {
            id: numId, firestoreId: doc.id, ownerId: d.ownerId, sellerVerified: !!d.sellerVerified,
            phoneVerified: !!d.phoneVerified, listingVerified: !!d.listingVerified, reportCount: d.reportCount || 0,
            cat: d.category || 'apartment', propertyType: d.propertyType || d.category || 'apartment',
            title: d.title, loc: d.loc,
            district: d.district, khoroo: d.khoroo || null, geoLat: d.geoLat || null, geoLng: d.geoLng || null, price: d.price, area: d.area, rooms: d.rooms,
            floor: d.floor, year: d.year,
            bedrooms: d.bedrooms || null, bathrooms: d.bathrooms || null,
            buildingName: d.buildingName || '', complex: d.complex || '',
            buildingType: d.buildingType || '', insulation: d.insulation || '', windowDirection: d.windowDirection || '',
            hoaFee: d.hoaFee || null, heating: d.heating || '',
            parking: feats.includes('parking') ? 'Паркинг бий' : '', elevator: feats.includes('elevator') ? 'Лифттэй' : '',
            balcony: feats.includes('balcony') ? 'Тагттай' : '', basement: feats.includes('basement') ? 'Зоорьтой' : '',
            furniture: feats.includes('furnished') ? 'Тавилгатай' : '',
            landArea: d.landArea || null, usageType: d.usageType || '', barterOk: !!d.barterOk,
            deposit: d.deposit || null, minTerm: d.minTerm || '',
            condition: d.condition || '', features: feats, description: d.description || '',
            videoUrl: d.videoUrl || '', tourUrl: d.tourUrl || '', floorPlan: d.floorPlan || null,
            img: (d.images && d.images[0]) || d.img || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
            tag: { type: 'new', text: 'Шинэ зар' }, badges: d.badges || ['user'],
            loanType: 'Тохиролцоно', monthly: 0,
            userSubmitted: true, isDemo: false,
            // Unlike the public query (which only ever fetches status=='active' docs), this
            // one fetches ALL of the signed-in owner's own listings regardless of status —
            // so _inactive here has to be derived from the real status, not assumed false,
            // or a pending/rejected/sold listing would leak into the public home/search grid
            // on the owner's own browser.
            status: d.status || 'active', rejectionReason: d.rejectionReason || '',
            _inactive: (d.status || 'active') !== 'active',
            viewCount: d.viewCount || 0, favoriteCount: d.favoriteCount || 0, contactCount: d.contactCount || 0,
            expiresAt: d.expiresAt || null, _bumpedAt: d.bumpedAt || numId,
            _createdAtMs: d.createdAt?.toMillis?.() || 0
          };
          listings.push(entry);
          if (d.images && d.images.length > 0) listingExtras[numId] = { coords: { x: 50, y: 50 }, gallery: d.images };
          sellerData[numId] = { phone: d.sellerPhone || '', name: d.sellerName || 'Хэрэглэгч', type: d.sellerType || 'Хувь хүн', company: d.sellerCompany || '' };
        });
        renderMyListings(); renderHomeListings(); renderListings(getFilteredListings());
        if (typeof renderDashboard === 'function') renderDashboard();
      } catch(e) {}

      if (typeof subscribeMyChats === 'function') subscribeMyChats();
      if (typeof refreshSavedSearchesCount === 'function') refreshSavedSearchesCount();
      if (typeof renderAccountSidebar === 'function') renderAccountSidebar();
      if (typeof subscribeNotifications === 'function') subscribeNotifications();
      if (typeof checkNotificationTriggers === 'function') checkNotificationTriggers();
    } else {
      currentUser = null;
      const loginBtn = document.getElementById('loginBtn');
      const userAvatarWrap = document.getElementById('userAvatarWrap');
      const userAvatar = document.getElementById('userAvatar');
      if (loginBtn) loginBtn.style.display = '';
      if (userAvatar) userAvatar.style.display = 'none';
      if (userAvatarWrap) userAvatarWrap.style.display = 'none';
      const banner = document.getElementById('emailVerifyBanner');
      if (banner) banner.style.display = 'none';
      const adminLink = document.getElementById('adminNavLink');
      if (adminLink) adminLink.style.display = 'none';
      if (typeof subscribeMyChats === 'function') subscribeMyChats();
      if (typeof refreshSavedSearchesCount === 'function') refreshSavedSearchesCount();
      if (typeof renderAccountSidebar === 'function') renderAccountSidebar();
      if (typeof subscribeNotifications === 'function') subscribeNotifications();
      if (typeof refreshAdminPageIfActive === 'function') refreshAdminPageIfActive();
    }
  });

  let verifyEmailCooldown = false;
  async function sendVerificationEmail() {
    if (!auth.currentUser) { showToast('Эхлээд нэвтэрнэ үү'); return; }
    if (verifyEmailCooldown) { showToast('Хэтэрхий олон удаа илгээлээ. Түр хүлээнэ үү.'); return; }
    try {
      await auth.currentUser.sendEmailVerification();
      verifyEmailCooldown = true;
      setTimeout(() => { verifyEmailCooldown = false; }, 60000);
      const btn = document.getElementById('sendVerifyBtn');
      if (btn) { btn.textContent = 'Илгээгдлээ ✓'; btn.disabled = true; setTimeout(() => { btn.textContent = 'Дахин илгээх'; btn.disabled = false; }, 60000); }
      showToast('Баталгаажуулах линк ' + (currentUser?.email || '') + ' рүү илгээгдлээ', 'success');
    } catch(e) {
      showToast('И-мэйл илгээхэд алдаа гарлаа');
    }
  }

  function openAuth() {
    goToAuthStep(1);
    document.getElementById('authModal').classList.add('open');
    setTimeout(() => document.getElementById('authEmail')?.focus(), 200);
  }

  function closeAuth() {
    document.getElementById('authModal').classList.remove('open');
  }

  function goToAuthStep(step) {
    ['authStep1','authStep3Login','authStep3Register','authStepForgot','authStepPhone','authStepPhoneOtp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const map = { 1:'authStep1', '3login':'authStep3Login', '3register':'authStep3Register', 'forgot':'authStepForgot', 'phone':'authStepPhone', 'phoneOtp':'authStepPhoneOtp' };
    const target = document.getElementById(map[step]);
    if (target) { target.style.display = 'flex'; target.style.animation = 'none'; void target.offsetWidth; target.style.animation = ''; }
  }

  // ===== PHONE-NUMBER AUTH (real Firebase Phone Authentication) =====
  let authRecaptchaVerifier = null;
  let authConfirmationResult = null;
  let authPhoneOtpCooldown = false;

  function getAuthRecaptcha() {
    if (!authRecaptchaVerifier) {
      authRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('authRecaptchaContainer', { size: 'invisible' });
    }
    return authRecaptchaVerifier;
  }

  async function sendAuthPhoneOtp(isResend) {
    const phone = document.getElementById('authPhoneNumber').value.trim();
    if (phone.length !== 8) { showToast('Утасны дугаар 8 оронтой байх ёстой'); return; }
    if (authPhoneOtpCooldown) { showToast('Түр хүлээгээд дахин оролдоно уу'); return; }
    const fullNumber = '+976' + phone;
    try {
      authConfirmationResult = await auth.signInWithPhoneNumber(fullNumber, getAuthRecaptcha());
      document.getElementById('authPhoneDisplay').textContent = phone;
      goToAuthStep('phoneOtp');
      authPhoneOtpCooldown = true;
      setTimeout(() => { authPhoneOtpCooldown = false; }, 30000);
      setTimeout(() => document.getElementById('authOtp0')?.focus(), 100);
      showToast(isResend ? 'Код дахин илгээгдлээ' : 'Баталгаажуулах код илгээгдлээ', 'success');
    } catch(e) {
      const msgs = {
        'auth/invalid-phone-number': 'Утасны дугаар буруу байна',
        'auth/too-many-requests': 'Хэт олон оролдлого. Түр хүлээнэ үү.'
      };
      showToast(msgs[e.code] || 'Код илгээхэд алдаа гарлаа');
      if (authRecaptchaVerifier) { authRecaptchaVerifier.clear(); authRecaptchaVerifier = null; }
    }
  }

  async function confirmAuthPhoneOtp() {
    const code = ['authOtp0','authOtp1','authOtp2','authOtp3','authOtp4','authOtp5'].map(id => document.getElementById(id).value).join('');
    if (code.length !== 6 || !authConfirmationResult) { showToast('6 оронтой кодоо бүрэн оруулна уу'); return; }
    let fbUser;
    try {
      const cred = await authConfirmationResult.confirm(code);
      fbUser = cred.user;
    } catch(e) {
      const msgs = { 'auth/invalid-verification-code': 'Код буруу байна', 'auth/code-expired': 'Кодын хугацаа дууссан байна' };
      console.error('Phone OTP confirm failed:', e.code, e.message);
      showToast(msgs[e.code] || ('Баталгаажуулахад алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')));
      ['authOtp0','authOtp1','authOtp2','authOtp3','authOtp4','authOtp5'].forEach(id => {
        const el = document.getElementById(id);
        el.value = ''; el.classList.remove('filled');
      });
      document.getElementById('authOtp0')?.focus();
      return;
    }
    // The code was actually correct and the phone sign-in succeeded — confirm it
    // regardless of whether the Firestore profile-doc write below works or not.
    closeAuth();
    showToast('Амжилттай нэвтэрлээ!', 'success');
    try {
      const userDoc = await db.collection('users').doc(fbUser.uid).get();
      if (!userDoc.exists) {
        await db.collection('users').doc(fbUser.uid).set({
          uid: fbUser.uid,
          firstName: 'Хэрэглэгч',
          lastName: '',
          phoneNumber: fbUser.phoneNumber,
          // Signing in via phone OTP already proves this number — no separate
          // verification step needed for phone-auth accounts.
          verifiedPhone: normalizePhone(fbUser.phoneNumber),
          role: 'user',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch(e) {
      console.error('Phone profile doc write failed:', e.code, e.message);
    }
  }

  document.addEventListener('input', (e) => {
    if (!e.target.id || !e.target.id.startsWith('authOtp')) return;
    const i = parseInt(e.target.id.replace('authOtp', ''), 10);
    if (e.target.value.length === 1) {
      e.target.classList.add('filled');
      const next = document.getElementById('authOtp' + (i + 1));
      if (next) next.focus(); else confirmAuthPhoneOtp();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!e.target.id || !e.target.id.startsWith('authOtp')) return;
    if (e.key === 'Backspace' && !e.target.value) {
      const i = parseInt(e.target.id.replace('authOtp', ''), 10);
      const prev = document.getElementById('authOtp' + (i - 1));
      if (prev) prev.focus();
    }
  });

  async function submitEmail() {
    const email = (document.getElementById('authEmail')?.value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Зөв имэйл хаяг оруулна уу'); return; }
    authCurrentEmail = email;
    // fetchSignInMethodsForEmail always resolves to an empty array on projects with Email
    // Enumeration Protection (the current Firebase default) — it can no longer tell an
    // existing account from a new one, so branching on it routed every returning user into
    // the registration form instead of login. Go straight to login (the common case for a
    // live product); authStep3Login carries a "Бүртгүүлэх" escape hatch for genuinely new
    // emails, and createAccount() already handles auth/email-already-in-use if someone
    // still lands on registration with an existing address.
    const el = document.getElementById('loginEmailDisplay');
    if (el) el.textContent = email;
    goToAuthStep('3login');
    setTimeout(() => document.getElementById('authPassword')?.focus(), 100);
  }

  // Login step's "Бүртгүүлэх" link — switches to the registration step for the same email
  // (for a genuinely new address that has no password to log in with yet).
  function goToAuthRegisterFromLogin() {
    const email = authCurrentEmail || (document.getElementById('authEmail')?.value || '').trim().toLowerCase();
    const el = document.getElementById('regEmailDisplay');
    if (el) el.textContent = email;
    goToAuthStep('3register');
    setTimeout(() => document.getElementById('authLastName')?.focus(), 100);
  }

  async function loginWithEmail() {
    const pw = document.getElementById('authPassword')?.value;
    if (!pw) { showToast('Нууц үг оруулна уу'); return; }
    try {
      await auth.signInWithEmailAndPassword(authCurrentEmail, pw);
      closeAuth();
      showToast('Тавтай морилно уу!', 'success');
    } catch(e) {
      // Enumeration protection also collapses "wrong password" and "no such account" into
      // the same auth/invalid-credential code — the message below covers both since we can
      // no longer distinguish them, and the login step's "Бүртгүүлэх" link is the recovery
      // path for the latter case.
      const msgs = {
        'auth/wrong-password': 'Нууц үг буруу байна',
        'auth/invalid-credential': 'Нууц үг буруу эсвэл энэ имэйлээр бүртгэл байхгүй байна',
        'auth/user-not-found': 'Энэ имэйлээр бүртгэл олдсонгүй. Доорх "Бүртгүүлэх" холбоосыг дарна уу.',
        'auth/too-many-requests': 'Хэт олон оролдлого. Түр хүлээнэ үү.',
        'auth/user-disabled': 'Энэ бүртгэл хаагдсан байна'
      };
      showToast(msgs[e.code] || 'Нэвтрэхэд алдаа гарлаа');
    }
  }

  async function createAccount() {
    const lastName = (document.getElementById('authLastName')?.value || '').trim();
    const firstName = (document.getElementById('authFirstName')?.value || '').trim();
    const pw = document.getElementById('authNewPassword')?.value || '';
    const pw2 = document.getElementById('authNewPassword2')?.value || '';
    if (!lastName || !firstName) { showToast('Овог нэрээ оруулна уу'); return; }
    if (pw.length < 6) { showToast('Нууц үг хамгийн багадаа 6 тэмдэгт байна'); return; }
    if (pw !== pw2) { showToast('Нууц үгнүүд таарахгүй байна'); return; }
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(authCurrentEmail, pw);
    } catch(e) {
      const msgs = {
        'auth/email-already-in-use': 'Энэ имэйл аль хэдийн бүртгэлтэй байна',
        'auth/weak-password': 'Нууц үг хэтэрхий энгийн байна'
      };
      console.error('createAccount failed:', e.code, e.message);
      showToast(msgs[e.code] || ('Бүртгэл үүсгэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : '')));
      return;
    }
    // Account creation itself succeeded — close the modal regardless of the profile-doc write below
    closeAuth();
    showToast(`Бүртгэл амжилттай! Тавтай морилно уу, ${firstName}!`, 'success');
    // The one hardcoded owner address bootstraps itself as role:'owner' the moment it first
    // creates a profile doc — firestore.rules' create rule only accepts 'owner' here from
    // this exact email (isOwner(), checked off the verified ID token) and only 'user' from
    // anyone else, so this line can't be used to self-elevate under any other address.
    const bootstrapRole = isOwnerEmail(authCurrentEmail) ? 'owner' : 'user';
    try {
      await cred.user.updateProfile({ displayName: firstName + ' ' + lastName });
      await db.collection('users').doc(cred.user.uid).set({
        uid: cred.user.uid,
        firstName,
        lastName,
        email: authCurrentEmail,
        role: bootstrapRole,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // onAuthStateChanged (top of this file) already ran by this point, off the Auth user
      // object alone — displayName wasn't set yet when it fired, so currentUser.name (and,
      // for the owner, currentUser.role) landed on the generic pre-Firestore defaults. Patch
      // both now that we actually know them, rather than leaving them wrong until reload.
      if (currentUser && currentUser.uid === cred.user.uid) {
        currentUser.name = firstName;
        currentUser.lastName = lastName;
        currentUser.letter = firstName[0] || 'Х';
        currentUser.role = bootstrapRole;
        updateNavLoggedIn();
      }
    } catch(e) {
      console.error('createAccount profile write failed:', e.code, e.message);
      showToast('Профайл мэдээлэл хадгалахад алдаа гарлаа (Firestore зөвшөөрөл шалгана уу)');
    }
  }

  async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    let fbUser;
    try {
      const result = await auth.signInWithPopup(provider);
      fbUser = result.user;
    } catch(e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in failed:', e.code, e.message);
        showToast('Google нэвтрэхэд алдаа гарлаа' + (e.code ? ' (' + e.code + ')' : ''));
      }
      return;
    }
    // The actual Google sign-in already succeeded — close the modal and confirm it
    // regardless of whether the Firestore profile-doc write below works or not.
    closeAuth();
    showToast('Google-ээр нэвтэрлээ. Тавтай морилно уу!', 'success');
    try {
      const userDoc = await db.collection('users').doc(fbUser.uid).get();
      if (!userDoc.exists) {
        const parts = (fbUser.displayName || 'Хэрэглэгч').split(' ');
        // See the matching comment in createAccount() above — this is the one address
        // firestore.rules will accept role:'owner' from at doc-creation time.
        const bootstrapRole = isOwnerEmail(fbUser.email) ? 'owner' : 'user';
        await db.collection('users').doc(fbUser.uid).set({
          uid: fbUser.uid,
          firstName: parts[0] || 'Хэрэглэгч',
          lastName: parts.slice(1).join(' ') || '',
          email: fbUser.email,
          role: bootstrapRole,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (currentUser && currentUser.uid === fbUser.uid) {
          currentUser.role = bootstrapRole;
          updateNavLoggedIn();
        }
      }
    } catch(e) {
      console.error('Google profile doc write failed:', e.code, e.message);
    }
  }

  function startForgotPassword() {
    if (!authCurrentEmail) { showToast('Эхлээд имэйл хаягаа оруулна уу'); goToAuthStep(1); return; }
    const el = document.getElementById('forgotEmailDisplay');
    if (el) el.textContent = authCurrentEmail;
    goToAuthStep('forgot');
  }

  async function sendPasswordReset() {
    try {
      await auth.sendPasswordResetEmail(authCurrentEmail);
      closeAuth();
      showToast('Нууц үг сэргээх линк имэйлд илгээгдлээ', 'success');
    } catch(e) {
      showToast('Имэйл илгээхэд алдаа гарлаа');
    }
  }

  function updateNavLoggedIn() {
    const loginBtn = document.getElementById('loginBtn');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarWrap = document.getElementById('userAvatarWrap');
    const userDropName = document.getElementById('userDropName');
    const userDropPhone = document.getElementById('userDropPhone');
    if (loginBtn) loginBtn.style.display = 'none';
    if (userAvatarWrap) userAvatarWrap.style.display = '';
    if (userAvatar) {
      userAvatar.style.display = 'grid';
      const letterEl = document.getElementById('userAvLetter');
      const imgEl = document.getElementById('userAvImg');
      if (currentUser.photoURL) {
        if (imgEl) { imgEl.src = currentUser.photoURL; imgEl.style.display = 'block'; }
        if (letterEl) letterEl.style.display = 'none';
      } else {
        if (imgEl) imgEl.style.display = 'none';
        if (letterEl) { letterEl.style.display = ''; letterEl.textContent = currentUser.letter; }
      }
    }
    if (userDropName) userDropName.textContent = (currentUser.lastName ? currentUser.lastName + ' ' : '') + currentUser.name;
    if (userDropPhone) userDropPhone.textContent = currentUser.isGoogle ? 'Google хэрэглэгч' : (currentUser.isPhone ? (currentUser.phoneNumber || '') : (currentUser.email || ''));
    const adminLink = document.getElementById('adminNavLink');
    if (adminLink) adminLink.style.display = isAdminOrOwnerUser(currentUser) ? '' : 'none';
  }

  function toggleUserMenu(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('open');
  }

  async function logout() {
    try {
      await auth.signOut();
      const dd = document.getElementById('userDropdown');
      if (dd) dd.classList.remove('open');
      showToast('Амжилттай гарлаа');
    } catch(e) {}
  }

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatar');
    if (dd && av && !av.contains(e.target) && !dd.contains(e.target)) dd.classList.remove('open');
  });

