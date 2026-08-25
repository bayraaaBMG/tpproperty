  // ===== SOCIAL FEED =====
  const feedPosts = [
    {
      id: 'p1', type: 'new',
      author: 'Болор Эстэйт', role: 'agent', avatar: 'Б', avatarColor: '#1E5BFF',
      time: '15 минутын өмнө', verified: true,
      text: 'Зайсанд шинэ зар орууллаа. Хүннү 2222 хороололд, өмнө зүгтээ задгай, наран гэрэлтэй. Засвар шинэхэн. Сонирхвол шууд холбогдоорой! #Зайсан #2өрөө',
      property: { id: 1, img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', price: '412 сая ₮', title: 'Зайсан, Хүннү 2222, 2 өрөө', meta: '78 м² · 2 өрөө · 8/16 давхар' },
      likes: 34, comments: 8, shares: 3, liked: false
    },
    {
      id: 'p2', type: 'price',
      author: 'Мөнхбат (эзэн)', role: 'owner', avatar: 'М', avatarColor: '#00D4AA',
      time: '1 цагийн өмнө', verified: true,
      text: 'Үнээ бууруулсан шүү! Яармаг дахь хаусаа 980 саяас 920 сая болголоо. Шуурхай зарах шаардлагатай болсон. Ярилцаж болно.',
      property: { id: 3, img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', price: '920 сая ₮', title: 'Яармаг, тусгай хаус', meta: '240 м² · 5 өрөө · 0.07 га' },
      likes: 56, comments: 23, shares: 12, liked: true, priceDropBadge: true
    },
    {
      id: 'p3', type: 'question',
      author: 'Сараа', role: 'owner', avatar: 'С', avatarColor: '#7B2CBF',
      time: '3 цагийн өмнө', verified: false,
      text: 'Хан-Уул дүүрэгт 2 өрөө байр авах гэж байна. 300-350 сая ₮ төсөвтэй. Аль хороолол хамгийн зөв вэ? Зайсан үнэтэй санагдаад байна. Туршлагатай хүмүүс зөвлөөч.',
      images: [],
      likes: 18, comments: 31, shares: 1, liked: false
    },
    {
      id: 'p4', type: 'new',
      author: 'МАК Констракшн', role: 'company', avatar: 'МАК', avatarColor: '#FFB81C',
      time: '5 цагийн өмнө', verified: true,
      text: 'Шинэ төслөө танилцуулж байна! Чингэлтэй дүүрэгт 16 давхар орон сууцны цогцолбор. 2025 онд ашиглалтад орно. Урьдчилгаа 30%, үлдсэнийг барилгын явцад. Захиалга авч эхэллээ.',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80'],
      likes: 127, comments: 45, shares: 34, liked: false
    },
    {
      id: 'p5', type: 'price',
      author: 'TP Property Зах зээл', role: 'company', avatar: 'TP', avatarColor: '#0A1628',
      time: '8 цагийн өмнө', verified: true,
      text: 'Долоо хоногийн тойм: үл хөдлөх хөрөнгийн үнэ дүүрэг, байршил, эрэлтээс шалтгаалан ялгаатай хэлбэлзсээр байна. Тодорхой байрны одоогийн үнийг харьцуулж үзэхийг хүсвэл холбогдох зарын "Үнийн өөрчлөлтийн талаар" хэсгээс үзнэ үү.',
      images: [],
      likes: 89, comments: 12, shares: 28, liked: false, isMarketReport: true
    }
  ];

  let currentFeedFilter = 'all';

  function renderFeed() {
    const container = document.getElementById('feedPosts');
    if (!container) return;
    let posts = [...feedPosts];
    if (currentFeedFilter === 'price') posts = posts.filter(p => p.type === 'price');
    else if (currentFeedFilter === 'new') posts = posts.filter(p => p.type === 'new');
    else if (currentFeedFilter === 'following') posts = posts.filter(p => p.role === 'agent' || p.role === 'company');
    else if (currentFeedFilter === 'saved') posts = posts.filter(p => p.liked);

    if (posts.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:60px; color:var(--ink-3); background:white; border-radius:16px; border:1px solid var(--line);">Энэ ангилалд пост алга байна</div>';
      return;
    }

    container.innerHTML = posts.map(p => {
      let mediaHtml = '';
      if (p.property) {
        // Feed posts are entirely scripted demo content — their embedded property preview
        // (img/price/title/meta) is baked into feedPosts itself, not looked up from a real
        // listings entry, so it's always demo regardless of what id it happens to carry.
        mediaHtml = `
          <div class="post-property" onclick="openFeedPropertyPreview(${p.property.id})">
            <div class="post-property-img">
              <img src="${p.property.img}" alt="" />
              <div class="post-property-price">${p.property.price}</div>
              <span class="badge demo" style="position:static;display:inline-block;margin-left:6px;">Жишээ</span>
            </div>
            <div class="post-property-body">
              <div class="post-property-title">${p.property.title}</div>
              <div class="post-property-meta">${p.property.meta}</div>
            </div>
          </div>
        `;
      } else if (p.images && p.images.length > 0) {
        const cls = p.images.length === 1 ? 'single' : p.images.length === 2 ? 'double' : 'triple';
        mediaHtml = `<div class="post-images ${cls}">${p.images.map(img => `<img src="${img}" alt="" onclick="showToast('Зураг томруулах')" />`).join('')}</div>`;
      }

      const roleLabels = { agent: 'Агент', company: 'Компани', owner: 'Эзэн' };

      return `
        <div class="feed-post">
          <div class="post-header">
            <div class="post-avatar" style="background:${p.avatarColor};">${p.avatar}</div>
            <div class="post-author-info">
              <div class="post-author">
                ${p.author}
                ${p.verified ? '<span class="post-verified"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}
                <span class="post-badge-role ${p.role}">${roleLabels[p.role]}</span>
              </div>
              <div class="post-time">${p.time}</div>
            </div>
            <button class="post-menu" onclick="showToast('Пост сонголт')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
          </div>
          <div class="post-text">${esc(p.text).replace(/#(\S+)/g, '<span class="tag">#$1</span>')}</div>
          ${mediaHtml}
          <div class="post-stats">
            <span>${p.likes} таалагдсан</span>
            <span>${p.comments} сэтгэгдэл · ${p.shares} хуваалцсан</span>
          </div>
          <div class="post-actions">
            <button class="post-action ${p.liked ? 'liked' : ''}" onclick="toggleLike('${p.id}', this)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${p.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
              Таалагдсан
            </button>
            <button class="post-action" onclick="showToast('Сэтгэгдэл бичих')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Сэтгэгдэл
            </button>
            <button class="post-action" onclick="shareFeedPost()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Хуваалцах
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Feed post property previews carry an id that's baked into the scripted post content,
  // not looked up from the listings array — most don't correspond to any real listing
  // (data.js's demo set uses different ids entirely). Only open the real detail modal if
  // that id genuinely exists; otherwise say so instead of trying to open a broken listing.
  function openFeedPropertyPreview(id) {
    if (listings.some(l => l.id === id)) { openListing(id); return; }
    showToast('Энэ бол жишээ пост');
  }

  function toggleLike(id, btn) {
    const post = feedPosts.find(p => p.id === id);
    if (!post) return;
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    btn.classList.toggle('liked');
    const svg = btn.querySelector('svg');
    svg.setAttribute('fill', post.liked ? 'currentColor' : 'none');
    // Update stats text
    const statsEl = btn.closest('.feed-post').querySelector('.post-stats span');
    statsEl.textContent = post.likes + ' таалагдсан';
  }

  // Feed posts have no per-post permalink route (only #listing-ID and #add are handled
  // in init.js), so this points at the real, working Feed page itself rather than a hash
  // that would silently go nowhere. Success is only ever shown once the copy actually
  // succeeds — same real-vs-fake distinction as shareListingModal() in listing-detail.js.
  function shareFeedPost() {
    const url = location.origin + location.pathname + '#feed';
    if (navigator.share) {
      navigator.share({ title: 'TP Property', url: url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => showToast('Холбоос хуулагдлаа', 'success'))
        .catch(() => showToast('Холбоос хуулж чадсангүй. Дахин оролдоно уу.'));
    } else {
      showToast('Холбоос: ' + url);
    }
  }

  // ===== COMPOSE POST =====
  function openComposePost(type) {
    const config = {
      text: { title: 'Шинэ пост', placeholder: 'Зах зээлийн тухай юу бодож байна?', eyebrow: 'Пост бичих' },
      price: { title: 'Үнийн мэдээ хуваалцах', placeholder: 'Жнь: Зайсанд 2 өрөөний дундаж үнэ 410 сая ₮ хүрлээ. Өнгөрсөн сараас 2% өслөө...', eyebrow: 'Үнийн мэдээ' },
      question: { title: 'Асуулт асуух', placeholder: 'Жнь: Хан-Уул дүүрэгт 300 сая ₮-р аль хороолол хамгийн зөв вэ?', eyebrow: 'Нийгэмлэгээс асуух' }
    };
    const c = config[type] || config.text;
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:32px;">
        <span class="al-eyebrow">${c.eyebrow}</span>
        <div class="al-title" style="margin-bottom:20px;">${c.title}</div>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:16px;">
          <div class="post-avatar" style="background:linear-gradient(135deg, var(--primary), var(--primary-deep));">Б</div>
          <div>
            <div style="font-weight:700; font-size:14px;">Болд</div>
            <div style="font-size:12px; color:var(--ink-3);">Нийтэд харагдана</div>
          </div>
        </div>
        <textarea class="form-textarea" id="composeText" rows="5" placeholder="${c.placeholder}" style="margin-bottom:16px; font-size:15px;"></textarea>
        ${type === 'price' ? `
          <div class="form-grid-2" style="margin-bottom:16px;">
            <div>
              <label class="form-label">Дүүрэг</label>
              <select class="form-select" id="composeDistrict">
                <option value="">Сонгох...</option>
                <option>Хан-Уул</option><option>Сүхбаатар</option><option>Чингэлтэй</option>
                <option>Баянзүрх</option><option>Баянгол</option><option>СХД</option>
              </select>
            </div>
            <div>
              <label class="form-label">Дундаж м² үнэ (сая ₮)</label>
              <input type="number" class="form-input" id="composePrice" placeholder="5.2" step="0.1" />
            </div>
          </div>
        ` : ''}
        <button class="btn btn-blue btn-lg" style="width:100%; justify-content:center;" onclick="submitPost('${type}')">
          Нийтлэх
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('composeText')?.focus(), 100);
  }

  function submitPost(type) {
    const text = document.getElementById('composeText').value.trim();
    if (!text || text.length < 5) {
      showToast('Постын агуулгыг бичнэ үү');
      return;
    }
    let fullText = text;
    if (type === 'price') {
      const district = document.getElementById('composeDistrict')?.value;
      const price = document.getElementById('composePrice')?.value;
      if (district && price) fullText += ` #${district} #${price}саяМ2`;
    }
    // Add to feed
    feedPosts.unshift({
      id: 'user' + Date.now(),
      type: type === 'question' ? 'question' : type === 'price' ? 'price' : 'new',
      author: 'Болд', role: 'owner', avatar: 'Б', avatarColor: '#1E5BFF',
      time: 'Дөнгөж сая', verified: false,
      text: fullText, images: [],
      likes: 0, comments: 0, shares: 0, liked: false
    });
    // Reset filter to show the new post
    currentFeedFilter = 'all';
    document.querySelectorAll('.feed-nav-item').forEach(x => x.classList.toggle('active', x.dataset.feed === 'all'));
    renderFeed();
    closeModal();
    showToast('Пост амжилттай нийтлэгдлээ', 'success');
    setTimeout(() => scrollToSection('feed'), 300);
  }

  // ===== CONTRACT TEMPLATE =====
  function openContractTemplate() {
    document.getElementById('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="info-page">
        <div class="info-page-eyebrow">Эрх зүйн загвар</div>
        <h2 class="info-page-title">Түрээсийн стандарт гэрээ</h2>
        <div class="info-page-body">
          <p>Түрээслүүлэгч болон түрээслэгч хоёр талын эрхийг тэнцвэртэй тусгахад зориулсан стандарт гэрээний загвар.</p>

          <h4>Гэрээнд багтах үндсэн заалтууд</h4>
          <ol class="step-list">
            <li><strong>Талуудын мэдээлэл.</strong> Түрээслүүлэгч, түрээслэгчийн овог нэр, регистр, утас, оршин суугаа хаяг.</li>
            <li><strong>Үл хөдлөх хөрөнгийн тодорхойлолт.</strong> Хаяг, талбай, өрөөний тоо, тоног төхөөрөмж, тавилгын жагсаалт (хүлээлгэн өгөх актаар).</li>
            <li><strong>Түрээсийн төлбөр.</strong> Сарын төлбөр, төлөх хугацаа, төлбөрийн арга, хугацаа хэтрэлтийн торгууль.</li>
            <li><strong>Барьцаа.</strong> Барьцааны хэмжээ (ихэвчлэн 1-2 сар), буцаах нөхцөл, хасалт хийх үндэслэл.</li>
            <li><strong>Гэрээний хугацаа.</strong> Эхлэх, дуусах огноо, сунгах журам, урьдчилан цуцлах нөхцөл (хоёр талын мэдэгдэх хугацаа).</li>
            <li><strong>Талуудын үүрэг.</strong> Засвар үйлчилгээ хэн хариуцах, нийтийн төлбөр, гэмтлийн хариуцлага.</li>
            <li><strong>Маргаан шийдвэрлэх.</strong> Талууд харилцан тохиролцох, шаардлагатай бол хуулийн байгууллага/шүүхийн журмаар.</li>
          </ol>

          <h4>Гэрээнд ихэвчлэн тусгадаг түрээслэгчийг хамгаалах заалтууд</h4>
          <p><strong>· Дур мэдэн хөөхгүй.</strong> Түрээслүүлэгч гэрээний хугацаанд хүчинтэй шалтгаангүйгээр түрээслэгчийг хөөх эрхгүй байхаар заана.</p>
          <p><strong>· Барьцаа буцаах нөхцөл.</strong> Гэрээ дуусаж, хохирол байхгүй бол тохирсон хугацаанд барьцааг бүрэн буцаах нөхцөлийг тодорхой тусгана.</p>
          <p><strong>· Төлбөрийн баримт хадгал.</strong> Шилжүүлгийн баримт, төлбөрийн түүхээ өөрөө хадгалж байвал маргаан гарахад нотолгоо болно.</p>

          <div style="margin-top:24px; padding:18px; background:var(--paper-2); border-radius:12px;">
            <div style="font-weight:700; margin-bottom:8px;">Загварыг авах</div>
            <div style="font-size:13px; color:var(--ink-3); margin-bottom:14px;">Энэ нь демо хувилбар. Бодит платформ дээр гэрээг PDF/Word форматаар татаж авах, эсвэл онлайнаар цахим гарын үсэг зурах боломжтой болно.</div>
            <button class="btn btn-blue btn-lg" style="width:100%; justify-content:center;" onclick="showToast('Гэрээний загвар татагдаж байна (демо)', 'success'); closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Гэрээний загвар татах
            </button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // Feed filter
  document.querySelectorAll('.feed-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.feed-nav-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
      currentFeedFilter = item.dataset.feed;
      renderFeed();
    });
  });

