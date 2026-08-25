  // ===== PERMISSIONS — single source of truth for the owner/admin/user role system =====
  // Mirrors firestore.rules exactly, and deliberately holds the ONE hardcoded copy of the
  // owner's email in the whole client (firestore.rules carries its own copy server-side —
  // that one, not this one, is what actually enforces anything). Every function here is
  // UI-ONLY: it decides what to show/hide, never what to allow. A user could open devtools
  // and flip every one of these checks and still hit a Firestore permission-denied on the
  // underlying read/write, because the real gate is always the matching rule in
  // firestore.rules (isOwner()/isAdmin()/isAdminOrOwner() there). If a check here and the
  // matching rule there ever disagree, the rule wins — that mismatch is a bug to fix, not a
  // security boundary to rely on either side of alone.
  const OWNER_EMAIL = 'bbayraaa20@gmail.com';

  function isOwnerEmail(email) {
    return !!email && email.toLowerCase() === OWNER_EMAIL;
  }
  function isOwnerUser(u) {
    u = u || (typeof currentUser !== 'undefined' ? currentUser : null);
    return !!u && isOwnerEmail(u.email);
  }
  function isAdminUser(u) {
    u = u || (typeof currentUser !== 'undefined' ? currentUser : null);
    return !!u && u.role === 'admin';
  }
  // Owner counts as having every admin permission, plus the admin-management ones only they
  // hold — every admin-gated UI check in the app should use this, not isAdminUser() alone.
  function isAdminOrOwnerUser(u) {
    return isOwnerUser(u) || isAdminUser(u);
  }
  function roleLabel(role) {
    return { owner: 'Owner', admin: 'Admin', user: 'Хэрэглэгч' }[role] || 'Хэрэглэгч';
  }

  // ===== ADMIN AUDIT LOG =====
  // Every privileged action (approve/reject/delete a listing, block/unblock a user, grant/
  // revoke admin, create/edit/delete an ad, moderate a project) calls this. Firestore rules
  // require actorUid to match the caller and forbid any update/delete afterward — this
  // function can only ever append, never edit history.
  async function logAdminAction(action, targetType, targetId, reason) {
    if (!currentUser || !isAdminOrOwnerUser()) return;
    try {
      await db.collection('adminAuditLogs').add({
        actorUid: currentUser.uid,
        actorEmail: currentUser.email || '',
        actorRole: isOwnerUser() ? 'owner' : 'admin',
        action,
        targetType,
        targetId: String(targetId),
        reason: reason || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.error('logAdminAction failed:', e.code, e.message);
    }
  }

  // ===== /admin ROUTE GUARD =====
  // Called by showPage('admin') before renderAdminDashboard() ever touches real data. Kept
  // separate from renderAdminDashboard() itself so the 403 state is a real, self-contained
  // page state — not a small message buried inside an otherwise-admin-styled shell.
  function guardAdminRoute() {
    const content = document.getElementById('adminContent');
    if (!content) return false;
    if (!isAdminOrOwnerUser()) {
      // Keep the normal site chrome (nav/footer) around the 403 message for anyone who
      // isn't actually authorized — the stripped-down admin-only header/chrome (see
      // css .admin-mode rules) only ever applies once guardAdminRoute() has passed.
      document.body.classList.remove('admin-mode');
      const header = document.getElementById('adminHeaderBar');
      if (header) header.innerHTML = '';
      content.innerHTML = render403();
      return false;
    }
    document.body.classList.add('admin-mode');
    return true;
  }

  // Auth state resolves asynchronously (Firebase restores a persisted session after the
  // page's own initial showPage() call has already run) — if the owner/admin loads
  // tpproperty.vercel.app/#admin directly, the very first guardAdminRoute() call can land before
  // currentUser is populated and show 403 for a moment. Called from auth.js's
  // onAuthStateChanged, both branches, right after currentUser is set/cleared — re-runs the
  // guard (and the real dashboard once it passes) only if the visitor is actually still on
  // the admin page when auth state settles.
  function refreshAdminPageIfActive() {
    const section = document.getElementById('admin');
    if (!section || !section.classList.contains('page-active')) return;
    if (guardAdminRoute() && typeof renderAdminDashboard === 'function') renderAdminDashboard();
  }

  function render403() {
    return `
      <div style="text-align:center;padding:100px 20px;max-width:440px;margin:0 auto;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,71,87,0.1);display:grid;place-items:center;margin:0 auto 20px;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div style="font-family:'Fraunces',serif;font-size:24px;font-weight:700;margin-bottom:10px;">403 — Танд энэ хэсэгт хандах эрх байхгүй</div>
        <div style="color:var(--ink-3);font-size:14px;line-height:1.6;margin-bottom:28px;">Энэ хуудас зөвхөн Owner болон Admin эрхтэй хэрэглэгчид зориулагдсан. Хэрэв алдаатай гэж бодож байвал сайтын эзэмшигчтэй холбогдоно уу.</div>
        <button class="btn btn-blue btn-lg" onclick="showPage('home')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Нүүр хуудас руу буцах
        </button>
      </div>
    `;
  }
