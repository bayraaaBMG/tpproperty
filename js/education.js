  // ===== FIRST-TIME BUYER: DOCUMENT CHECKLIST =====
  const buyerDocs = [
    {
      title: 'Эзэмшлийн гэрчилгээ (эх хувь)',
      note: 'Эзний нэртэй таарч буй эсэхийг нягтлах',
      link: 'https://e-mongolia.mn/service/property-certificate',
      linkLabel: 'e-Mongolia',
      tip: 'Гэрчилгээ дээрх эзэн, худалдагчийн иргэний үнэмлэхтэй яг таарч байх ёстой. Зөрүүтэй бол итгэмжлэл шаарда.'
    },
    {
      title: 'Кадастрын зураг',
      note: 'Талбайн хэмжээ, байршил баримттай тохирч буй эсэх',
      link: 'https://e-mongolia.mn/service/cadastral-map',
      linkLabel: 'e-Mongolia',
      tip: 'Зарын болон гэрчилгээний м² тоо кадастрын зургийн талбайтай тохирч байх ёстой.'
    },
    {
      title: 'Улсын бүртгэлийн лавлагаа',
      note: 'Барьцаа, хориг, маргаан байгаа эсэх',
      link: 'https://burtgel.gov.mn',
      linkLabel: 'УБЕГ',
      tip: 'Улсын бүртгэлийн ерөнхий газараас "хөдлөхгүй хөрөнгийн лавлагаа" авна. Барьцаатай байр авбал банк таны зээлийг хаах эрхтэй.'
    },
    {
      title: 'Татварын тодорхойлолт',
      note: 'Үл хөдлөхийн татварын өргүй эсэх',
      link: 'https://etax.mta.mn',
      linkLabel: 'eTax МТА',
      tip: 'Татварын өр дамжих тохиолдол бий. e-Tax дээр хөрөнгийн дугаараар лавлана.'
    },
    {
      title: 'Эзний иргэний үнэмлэх',
      note: 'Гэрчилгээн дээрх нэртэй биечлэн тулгах',
      link: 'https://e-mongolia.mn/service/identity-verification',
      linkLabel: 'e-Mongolia',
      tip: 'Биечлэн тулгах боломжгүй бол нотариатаар баталгаажсан хуулбар шаарда. Зүгээр зургаас хэзээ ч итгэж болохгүй.'
    },
    {
      title: 'Нийтийн төлбөрийн лавлагаа',
      note: 'Дулаан, ус, цахилгааны өргүй эсэх',
      link: 'https://www.ulaanbaatar.mn/content/3046',
      linkLabel: 'УБ хот',
      tip: 'УБДС, МЦС, ДДҮХ-ийн өр шилжихгүй гэсэн баталгаа авна. Эзэнийг биечлэн авчруулж тулгах нь дээр.'
    },
    {
      title: 'Гэр бүлийн зөвшөөрөл',
      note: 'Хамтран өмчлөгч байвал нотариатаар баталгаажуулсан',
      link: 'https://notariat.mn',
      linkLabel: 'Нотариат',
      tip: 'Гэрлэсэн хүний байр бол эхнэр/нөхрийн нотариатаар баталгаажуулсан зөвшөөрөл заавал хэрэгтэй.'
    },
    {
      title: 'Итгэмжлэл (агент болон зуучаар зарж байгаа бол)',
      note: 'Нотариатаар баталгаажсан, хугацаа хүчинтэй эсэх',
      link: 'https://notariat.mn',
      linkLabel: 'Нотариат',
      tip: 'Итгэмжлэл хязгаарлагдмал эрхтэй байдаг. "Зарах эрхтэй" гэдгийг тусгайлан заасан байх ёстой.'
    },
    {
      title: 'Барилгын ашиглалтад оруулах актын хуулбар',
      note: 'Шинэ барилга бол заавал байх ёстой',
      link: 'https://mcud.gov.mn',
      linkLabel: 'ГХБХБГ',
      tip: 'Ашиглалтад оруулаагүй барилга хууль ёсны дагуу шилжүүлэх боломжгүй. Барилгын явц дуусаад акт гаргуулах ёстой.'
    },
    {
      title: 'Худалдах-худалдан авах гэрээ',
      note: 'Нотариатаар батлуулсан, хоёр талын гарын үсэгтэй',
      link: 'https://notariat.mn',
      linkLabel: 'Нотариат',
      tip: 'Нотариатын баталгаагүй гэрээ хууль хүчгүй. Хэлцэл хийхийн өмнө өмгөөлөгч эсвэл нотариатаар шалгуул.'
    },
    {
      title: 'Зээлийн урьдчилсан зөвшөөрөл',
      note: 'Зээлээр авах бол банкнаас урьдчилан авсан байх',
      link: 'https://www.mongolbank.mn/mn/r/1099',
      linkLabel: 'Монголбанк',
      tip: 'Урьдчилсан зөвшөөрөлгүй гэрээ хийгдвэл зээл орохгүй болох тохиолдол гардаг. Банкаар эхлэн зэрэгцүүл.'
    }
  ];

  function renderBuyerDocs() {
    const container = document.getElementById('docChecklist');
    if (!container) return;
    container.innerHTML = buyerDocs.map((d, i) => `
      <div class="doc-item" onclick="toggleDocCheck(this, event)">
        <div class="doc-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="doc-body">
          <h4 class="doc-label">${i + 1}. ${d.title}</h4>
          <div class="doc-note">${d.note}</div>
          ${d.tip ? `<div class="doc-tip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>${d.tip}</div>` : ''}
        </div>
        <a class="doc-link-btn" href="${d.link}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${d.linkLabel} дээр шалгах">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>
          <span>${d.linkLabel}</span>
        </a>
      </div>
    `).join('');
  }

  function toggleDocCheck(el, event) {
    if (event.target.closest('.doc-link-btn')) return;
    el.classList.toggle('checked');
    const checked = document.querySelectorAll('#docChecklist .doc-item.checked').length;
    const total = buyerDocs.length;
    const counter = document.getElementById('docCounter');
    const fill = document.getElementById('docProgressFill');
    if (counter) {
      counter.textContent = checked + '/' + total;
      counter.style.color = checked === total ? 'var(--accent)' : 'var(--primary)';
    }
    if (fill) fill.style.width = ((checked / total) * 100) + '%';
    if (checked === total) showToast('Бүх баримтыг шалгасан! Та бэлэн байна.', 'success');
  }

  // ===== EDUCATION TABS (building / economics) =====
  document.querySelectorAll('.edu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.edu;
      document.querySelectorAll('.edu-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.edu-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.eduPanel === target);
      });
    });
  });

