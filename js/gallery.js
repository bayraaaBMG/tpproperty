  // ===== GALLERY =====
  let galleryImages = [];
  let galleryIndex = 0;

  // In-modal carousel (different from fullscreen gallery)
  let mcImages = [];
  let mcIdx = 0;
  let mcListingId = 0;

  function mcUpdate() {
    const img = document.getElementById('mcMainImg');
    const counter = document.getElementById('mcCounter');
    const thumbs = document.querySelectorAll('.mc-thumb');
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        // Undo a previous onerror's display:none/background swap before loading the next
        // image — otherwise navigating away from a broken image leaves a valid one hidden.
        img.style.display = '';
        img.parentElement.style.background = '';
        img.src = mcImages[mcIdx];
        img.style.opacity = '1';
      }, 120);
    }
    if (counter) counter.textContent = (mcIdx + 1) + ' / ' + mcImages.length;
    thumbs.forEach((t, i) => t.classList.toggle('active', i === mcIdx));
  }
  function mcPrev() { mcIdx = (mcIdx - 1 + mcImages.length) % mcImages.length; mcUpdate(); }
  function mcNext() { mcIdx = (mcIdx + 1) % mcImages.length; mcUpdate(); }
  function mcGoto(i) { mcIdx = i; mcUpdate(); }

  function openGallery(id) {
    const extra = listingExtras[id];
    const l = listings.find(x => x.id === id);
    galleryImages = extra?.gallery || [l.img];
    galleryIndex = 0;
    renderGallery();
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function renderGallery() {
    document.getElementById('modalContent').className = 'modal gallery-modal';
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()" style="z-index:10;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="gallery-main" ontouchstart="swipeStart(event)" ontouchend="swipeEnd(event, galleryPrev, galleryNext)">
        <div class="gallery-counter">${galleryIndex + 1} / ${galleryImages.length}</div>
        <img src="${esc(galleryImages[galleryIndex])}" alt="" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1B2D4F, #1E5BFF)';" />
        ${galleryImages.length > 1 ? `
          <button class="gallery-nav prev" onclick="galleryPrev()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="gallery-nav next" onclick="galleryNext()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ` : ''}
      </div>
      <div class="gallery-thumbs">
        ${galleryImages.map((img, i) => `
          <img class="gallery-thumb ${i === galleryIndex ? 'active' : ''}" src="${esc(img)}" onclick="galleryGoto(${i})" alt="" onerror="this.style.visibility='hidden';" />
        `).join('')}
      </div>
    `;
  }

  function galleryPrev() { galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length; renderGallery(); }
  function galleryNext() { galleryIndex = (galleryIndex + 1) % galleryImages.length; renderGallery(); }
  function galleryGoto(i) { galleryIndex = i; renderGallery(); }

  // Desktop keyboard nav for both the fullscreen gallery and the listing-detail modal's
  // inline carousel — skipped while a form control has focus so it doesn't hijack normal
  // text-cursor/select arrow-key use.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (!document.getElementById('modal')?.classList.contains('open')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.querySelector('.gallery-modal')) {
      e.key === 'ArrowLeft' ? galleryPrev() : galleryNext();
    } else if (document.querySelector('.mc-wrap')) {
      e.key === 'ArrowLeft' ? mcPrev() : mcNext();
    }
  });

