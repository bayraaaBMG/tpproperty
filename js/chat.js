  // ===== REAL CHAT SYSTEM (Firestore-backed) =====
  // Every listing — demo or user-submitted — has an ownerId (demo listings get a stable
  // synthetic 'demo-{id}'), so chatting works identically everywhere; a demo seller just
  // never happens to write back.
  // Schema: chats/{listingKey_uidA_uidB} { listingKey, listingTitle, listingImg,
  //   participants: [uid, uid], participantNames: {uid: name}, participantPhotos: {uid: url},
  //   lastMessage, lastMessageAt, unread: {uid: count}, blockedBy: {uid: true},
  //   closedBy: {uid: true} } and chats/{id}/messages/{msgId} { senderId, text, createdAt,
  //   type: 'text' }. blockedBy/closedBy/participantPhotos are all optional/additive — a
  //   chat written before this feature existed just behaves as never-blocked/never-closed/
  //   letter-avatar-only, no migration needed.
  let myChats = [];
  let activeChatId = null;
  let _chatListUnsub = null;
  let _chatMsgUnsub = null;
  // Set by openListingChat() right before it opens the auth modal for an anonymous visitor,
  // so the chat can resume automatically once login succeeds. No general "resume any action
  // after login" mechanism exists elsewhere in the app (every other login-gate just prompts
  // and stops) — this is deliberately narrow and chat-specific, not a new site-wide pattern.
  let pendingChatListingId = null;

  function subscribeMyChats() {
    if (_chatListUnsub) { _chatListUnsub(); _chatListUnsub = null; }
    if (!currentUser) { myChats = []; updateChatCount(); return; }
    _chatListUnsub = db.collection('chats').where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(snap => {
        myChats = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
        updateChatCount();
        if (document.getElementById('chatListItems')) renderChatListPanel();
      }, () => {});
  }

  function unsubscribeActiveChat() {
    if (_chatMsgUnsub) { _chatMsgUnsub(); _chatMsgUnsub = null; }
  }

  async function getOrCreateChat(l) {
    if (!currentUser || !l.ownerId || l.ownerId === currentUser.uid) return null;
    const listingKey = l.firestoreId ? ('fs-' + l.firestoreId) : ('local-' + l.id);
    const chatId = listingKey + '_' + [currentUser.uid, l.ownerId].sort().join('_');
    const ref = db.collection('chats').doc(chatId);
    try {
      const snap = await ref.get();
      const chatData = {
        listingKey, listingTitle: l.title, listingImg: l.img,
        participants: [currentUser.uid, l.ownerId],
        participantNames: { [currentUser.uid]: currentUser.name, [l.ownerId]: sellerData[l.id]?.name || 'Хэрэглэгч' },
        participantPhotos: { [currentUser.uid]: currentUser.photoURL || '', [l.ownerId]: sellerData[l.id]?.photoURL || '' },
        lastMessage: '', unread: { [currentUser.uid]: 0, [l.ownerId]: 0 }
      };
      if (!snap.exists) {
        await ref.set(Object.assign({}, chatData, { lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() }));
      }
      if (!myChats.some(c => c.id === chatId)) myChats.unshift(Object.assign({ id: chatId }, chatData));
      return chatId;
    } catch(e) {
      showToast('Чат нээхэд алдаа гарлаа');
      return null;
    }
  }

  async function openChat(listingLocalId) {
    if (!currentUser) { showToast('Чат ашиглахын тулд нэвтэрнэ үү'); openAuth(); return; }
    document.getElementById('modalContent').className = 'modal chat-modal';
    let targetChatId = null;
    if (listingLocalId) {
      const l = listings.find(x => x.id === listingLocalId);
      if (l) targetChatId = await getOrCreateChat(l);
    }
    if (!targetChatId) targetChatId = myChats[0]?.id || null;
    renderChatShell();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (targetChatId) openChatThread(targetChatId);
  }

  // Entry point from a "chat_message" notification click (js/notifications.js) — opens the
  // chat modal targeting one specific chat directly, rather than openChat()'s "first chat
  // in the list" fallback.
  function openChatById(chatId) {
    if (!currentUser) { showToast('Чат ашиглахын тулд нэвтэрнэ үү'); openAuth(); return; }
    if (!chatId) return;
    document.getElementById('modalContent').className = 'modal chat-modal';
    renderChatShell();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    openChatThread(chatId);
  }

  function renderChatShell() {
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()" style="z-index:20;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="chat-layout">
        <div class="chat-list" id="chatListPanel">
          <div class="chat-list-head"><h3>Зурвас</h3></div>
          <div class="chat-list-items" id="chatListItems"></div>
        </div>
        <div class="chat-main" id="chatMainPane">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);font-size:14px;padding:40px;text-align:center;">Зүүн талаас харилцагчаа сонгоно уу, эсвэл зарын дэлгэрэнгүй хуудаснаас "Чат бичих" товч дарж шинэ зурвас эхлүүлээрэй.</div>
        </div>
      </div>
    `;
    renderChatListPanel();
  }

  // Toggled by the "Хаагдсан зурвасууд" reveal link at the bottom of the list — session-
  // local UI state, not persisted (re-hidden on next chat-modal open, which is fine since
  // its only purpose is a quick peek at chats this participant closed for themselves).
  let showClosedChats = false;

  function chatAvatarHtml(name, photoURL, size) {
    const letter = esc(name[0] || 'Х');
    const dim = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.37)}px;` : '';
    if (!photoURL) return `<div class="chat-avatar" style="background:#1E5BFF;${dim}">${letter}</div>`;
    return `<div class="chat-avatar" style="background:#1E5BFF;${dim}overflow:hidden;padding:0;">
      <img src="${esc(photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="var p=this.parentElement;p.style.overflow='';p.textContent='${letter}';">
    </div>`;
  }

  function chatRowHtml(c) {
    const otherUid = c.participants.find(p => p !== currentUser.uid);
    const otherName = c.participantNames?.[otherUid] || 'Хэрэглэгч';
    const otherPhoto = c.participantPhotos?.[otherUid] || '';
    const unread = c.unread?.[currentUser.uid] || 0;
    const isClosed = c.closedBy?.[currentUser.uid] === true;
    const isBlockedBySelf = c.blockedBy?.[currentUser.uid] === true;
    const timeText = c.lastMessageAt ? fmtRelativeTime(c.lastMessageAt) : '';
    return `
      <div class="chat-list-item ${c.id === activeChatId ? 'active' : ''} ${unread > 0 ? 'unread' : ''}" onclick="${isClosed ? `reopenChat('${c.id}')` : `switchRealChat('${c.id}')`}">
        ${chatAvatarHtml(otherName, otherPhoto)}
        ${c.listingImg ? `<img class="chat-list-thumb" src="${esc(c.listingImg)}" alt="" onerror="this.style.visibility='hidden';">` : ''}
        <div class="chat-list-info">
          <div class="chat-list-name">${esc(otherName)}</div>
          <div class="chat-list-preview">${esc(c.lastMessage || c.listingTitle || '')}</div>
        </div>
        <div class="chat-list-meta">
          ${timeText ? `<div class="chat-list-time">${esc(timeText)}</div>` : ''}
          ${unread > 0 ? `<div class="chat-unread-badge">${unread}</div>` : ''}
        </div>
        ${isClosed ? `<button type="button" class="btn btn-ghost btn-sm" style="flex-shrink:0;" onclick="event.stopPropagation();reopenChat('${c.id}')">Дахин нээх</button>` : chatRowMenu(c.id, isBlockedBySelf)}
      </div>
    `;
  }

  function renderChatListPanel() {
    const el = document.getElementById('chatListItems');
    if (!el) return;
    if (myChats.length === 0) {
      el.innerHTML = `<div style="padding:24px;color:var(--ink-3);font-size:13px;text-align:center;">Одоогоор зурвас байхгүй байна.</div>`;
      return;
    }
    const open = myChats.filter(c => c.closedBy?.[currentUser.uid] !== true);
    const closed = myChats.filter(c => c.closedBy?.[currentUser.uid] === true);
    let html = open.length
      ? open.map(chatRowHtml).join('')
      : `<div style="padding:24px;color:var(--ink-3);font-size:13px;text-align:center;">Идэвхтэй зурвас байхгүй байна.</div>`;
    if (closed.length) {
      html += `<button type="button" class="chat-closed-toggle" onclick="showClosedChats=!showClosedChats;renderChatListPanel();">${showClosedChats ? 'Хаагдсан зурвасууд ▲' : `Хаагдсан зурвасууд (${closed.length}) ▼`}</button>`;
      if (showClosedChats) html += closed.map(chatRowHtml).join('');
    }
    el.innerHTML = html;
  }

  // 3-dot conversation menu — same trigger-toggles-list-click-outside-closes-all idiom as
  // admin.js's adminActionMenu()/toggleAdminMenu(), a chat-scoped copy rather than a shared
  // function since the two need different CSS (this one becomes a mobile bottom sheet).
  function chatRowMenu(chatId, isBlockedBySelf) {
    const actions = [
      { label: 'Уншсан болгох', onclick: `markChatRead('${chatId}')` },
      isBlockedBySelf
        ? { label: 'Блок цуцлах', onclick: `toggleBlockChat('${chatId}', false)` }
        : { label: 'Хэрэглэгчийг блоклох', onclick: `toggleBlockChat('${chatId}', true)`, danger: true },
      { label: 'Чат хаах', onclick: `closeChatForMe('${chatId}')`, danger: true }
    ];
    return `
      <div class="chat-menu">
        <button type="button" class="chat-menu-trigger" onclick="event.stopPropagation();toggleChatMenu(event, '${chatId}')" aria-label="Цэс">⋮</button>
        <div class="chat-menu-list" id="chatMenu-${chatId}">
          ${actions.map(a => `<button type="button" class="chat-menu-item${a.danger ? ' danger' : ''}" onclick="event.stopPropagation();closeAllChatMenus();${a.onclick}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>
    `;
  }
  function toggleChatMenu(e, id) {
    e.stopPropagation();
    const target = document.getElementById('chatMenu-' + id);
    const wasOpen = target?.classList.contains('open');
    closeAllChatMenus();
    if (target && !wasOpen) target.classList.add('open');
  }
  function closeAllChatMenus() {
    document.querySelectorAll('.chat-menu-list.open, .chat-menu-backdrop.open').forEach(el => el.classList.remove('open'));
  }
  document.addEventListener('click', closeAllChatMenus);

  function markChatRead(chatId) {
    if (!chatId) return;
    db.collection('chats').doc(chatId).update({ ['unread.' + currentUser.uid]: 0 }).catch(() => {});
  }

  function toggleBlockChat(chatId, block) {
    if (!chatId) return;
    const confirmMsg = block
      ? 'Энэ хэрэглэгчийг блоклох уу? Блоклосны дараа аль ч тал шинэ зурвас илгээх боломжгүй болно.'
      : 'Блокыг цуцлах уу?';
    if (!confirm(confirmMsg)) return;
    db.collection('chats').doc(chatId).update({ ['blockedBy.' + currentUser.uid]: block })
      .then(() => {
        showToast(block ? 'Хэрэглэгчийг блоклолоо' : 'Блок цуцлагдлаа', 'success');
        if (activeChatId === chatId) renderChatMainShell(chatId);
      })
      .catch(() => showToast('Алдаа гарлаа'));
  }

  function closeChatForMe(chatId) {
    if (!chatId) return;
    if (!confirm('Энэ чатыг хаах уу? Түүх устахгүй — дараа "Хаагдсан зурвасууд" хэсгээс дахин нээж болно.')) return;
    db.collection('chats').doc(chatId).update({ ['closedBy.' + currentUser.uid]: true })
      .then(() => {
        showToast('Чат хаагдлаа', 'success');
        if (activeChatId === chatId) {
          activeChatId = null;
          unsubscribeActiveChat();
          const pane = document.getElementById('chatMainPane');
          if (pane) pane.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);font-size:14px;padding:40px;text-align:center;">Зүүн талаас харилцагчаа сонгоно уу.</div>`;
        }
      })
      .catch(() => showToast('Алдаа гарлаа'));
  }

  function reopenChat(chatId) {
    if (!chatId) return;
    db.collection('chats').doc(chatId).update({ ['closedBy.' + currentUser.uid]: false })
      .then(() => { showToast('Чат дахин нээгдлээ', 'success'); switchRealChat(chatId); })
      .catch(() => showToast('Алдаа гарлаа'));
  }

  function switchRealChat(chatId) {
    openChatThread(chatId);
    renderChatListPanel();
  }

  function openChatThread(chatId, starterText) {
    activeChatId = chatId;
    unsubscribeActiveChat();
    renderChatMainShell(chatId, starterText);
    _chatMsgUnsub = db.collection('chats').doc(chatId).collection('messages').orderBy('createdAt', 'asc')
      .onSnapshot(snap => renderChatMessages(snap.docs.map(d => d.data())), () => {});
    db.collection('chats').doc(chatId).update({ ['unread.' + currentUser.uid]: 0 }).catch(() => {});
    // On mobile the list panel covers the whole modal (absolute-positioned) — whenever a
    // specific thread is opened, whether from the list or straight from a listing page,
    // switch to showing that conversation instead of leaving the list on top of it.
    if (window.innerWidth <= 640) {
      const panel = document.getElementById('chatListPanel');
      if (panel) panel.classList.add('hidden-mobile');
    }
  }

  function renderChatMainShell(chatId, starterText) {
    const chat = myChats.find(c => c.id === chatId);
    const pane = document.getElementById('chatMainPane');
    if (!chat || !pane) return;
    const otherUid = chat.participants.find(p => p !== currentUser.uid);
    const otherName = chat.participantNames?.[otherUid] || 'Хэрэглэгч';
    const otherPhoto = chat.participantPhotos?.[otherUid] || '';
    const blockedBySelf = chat.blockedBy?.[currentUser.uid] === true;
    const blockedByOther = chat.blockedBy?.[otherUid] === true;
    const isBlocked = blockedBySelf || blockedByOther;
    pane.innerHTML = `
      <div class="chat-header">
        <button class="chat-back-mobile" onclick="document.getElementById('chatListPanel').classList.remove('hidden-mobile')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        ${chatAvatarHtml(otherName, otherPhoto, 38)}
        <div class="chat-header-info">
          <div class="chat-header-name">${esc(otherName)}</div>
        </div>
        ${chatRowMenu(chatId, blockedBySelf)}
      </div>
      ${chat.listingKey ? `
        <div class="chat-property-ref" onclick="openChatListingRef('${chat.listingKey}')">
          <img src="${esc(chat.listingImg || '')}" alt="" onerror="this.style.visibility='hidden';" />
          <div class="chat-property-ref-info">
            <div class="chat-property-ref-title">${esc(chat.listingTitle || '')}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      ` : ''}
      <div class="chat-messages" id="chatMessages"></div>
      ${isBlocked ? `
        <div style="padding:10px 16px;font-size:12.5px;color:var(--danger);background:rgba(255,71,87,.08);text-align:center;">
          ${blockedBySelf ? 'Та энэ хэрэглэгчийг блоклосон тул зурвас илгээх боломжгүй.' : 'Энэ чат блоклогдсон тул зурвас илгээх боломжгүй.'}
        </div>
      ` : ''}
      <div class="chat-input-bar">
        <input type="text" class="chat-input" id="chatInput" placeholder="${isBlocked ? 'Зурвас илгээх боломжгүй' : 'Зурвас бичих...'}" value="${esc(starterText || '')}" onkeydown="if(event.key==='Enter') sendRealChatMessage()" ${isBlocked ? 'disabled' : ''} />
        <button class="chat-send" onclick="sendRealChatMessage()" ${isBlocked ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
    if (starterText) {
      const inputEl = document.getElementById('chatInput');
      if (inputEl) { inputEl.focus(); inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length); }
    }
  }

  function openChatListingRef(listingKey) {
    closeModal();
    setTimeout(() => {
      let ll = null;
      if (listingKey.startsWith('fs-')) ll = listings.find(x => x.firestoreId === listingKey.slice(3));
      else if (listingKey.startsWith('local-')) ll = listings.find(x => x.id === parseInt(listingKey.slice(6), 10));
      if (ll) openListing(ll.id);
    }, 300);
  }

  function renderChatMessages(msgs) {
    const el = document.getElementById('chatMessages');
    if (!el) return;
    el.innerHTML = msgs.map(m => `
      <div class="chat-msg ${m.senderId === currentUser.uid ? 'sent' : 'received'}">
        <div><div class="chat-bubble">${esc(m.text)}</div></div>
      </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  }

  async function sendRealChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || !activeChatId) return;
    const chat = myChats.find(c => c.id === activeChatId);
    const otherUid = chat?.participants.find(p => p !== currentUser.uid);
    // Client-side mirror of the server-side block check in firestore.rules — the rule is
    // what actually stops a blocked send, this just avoids a round-trip error/confusing
    // toast for a state the UI already knows about (composer is disabled while blocked too).
    if (chat && (chat.blockedBy?.[currentUser.uid] === true || chat.blockedBy?.[otherUid] === true)) {
      showToast('Энэ чат блоклогдсон тул зурвас илгээх боломжгүй');
      return;
    }
    input.value = '';
    try {
      await db.collection('chats').doc(activeChatId).collection('messages').add({
        senderId: currentUser.uid, text, type: 'text', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const update = { lastMessage: text, lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (otherUid) update['unread.' + otherUid] = firebase.firestore.FieldValue.increment(1);
      await db.collection('chats').doc(activeChatId).update(update);
      // Best-effort in-app notification for the recipient — fire-and-forget like the
      // existing saved-search/price-drop notifications (js/notifications.js), never blocks
      // or fails the send itself if it doesn't go through.
      if (otherUid) {
        db.collection('notifications').add({
          userId: otherUid, type: 'chat_message', chatId: activeChatId,
          text: `<strong>${esc(currentUser.name || 'Хэрэглэгч')}</strong>: ${esc(text.slice(0, 80))}`,
          read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
    } catch(e) {
      showToast('Зурвас илгээхэд алдаа гарлаа');
    }
  }

  function updateChatCount() {
    const badge = document.getElementById('chatCount');
    if (!badge) return;
    const totalUnread = currentUser ? myChats.reduce((s, c) => s + (c.closedBy?.[currentUser.uid] === true ? 0 : (c.unread?.[currentUser.uid] || 0)), 0) : 0;
    if (totalUnread > 0) { badge.textContent = totalUnread; badge.style.display = 'grid'; }
    else badge.style.display = 'none';
  }
