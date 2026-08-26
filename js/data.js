  // ===== LISTINGS DATA =====
  let favorites = (function() {
    try { return JSON.parse(localStorage.getItem('bairxFavorites') || '[]'); } catch(e) { return []; }
  })();
  const listings = [
    {
      id: 2,
      cat: 'apartment',
      title: 'Олимп тауэр, Сүхбаатар, 3 өрөө',
      loc: 'Сүхбаатар, 1-р хороо · Төв',
      district: 'sukhbaatar',
      price: 605,
      pricePerSqm: 5.99,
      area: 101,
      rooms: 3,
      floor: '14/22',
      year: 2020,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' },
      badges: ['verified'],
      loanType: 'Тохиролцоно',
      monthly: 0,
      img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон, газар хөдлөлтийн 8 баллын тэсвэртэй',
      insulation: 'Гадна 120мм MW (эрдэс ноос)',
      heating: 'Төвлөрсөн халаалт + хувийн зохицуулалт',
      parking: '1 машины байр (үнэнд багтаагүй, 35 сая ₮)',
      elevator: '3 ширхэг лифт (нэг нь VIP)',
      utilityCost: '240,000 ₮/сар (зун) · 450,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл',
      cadastre: 'Кадастр шалгасан, хил зааг тодорхой',
      collateral: 'ХХБ-нд барьцаатай (бүтэн гэрээгээр)',
      taxDebt: 'Татварын өргүй (2024 он тушаасан)',
      condition: 'Үндсэн засвартай, угсралттай',
      legalNotes: 'Барьцаа чөлөөлсний дараа шилжүүлнэ (7-14 хоног)'
    },
    {
      id: 4,
      cat: 'apartment',
      title: 'Чингэлтэй, шинэ барилга, 2 өрөө',
      loc: 'Чингэлтэй, 4-р хороо',
      district: 'chingeltei',
      price: 248,
      pricePerSqm: 4.35,
      area: 57,
      rooms: 2,
      floor: '9/16',
      year: 2024,
      tag: { type: 'below', text: '↓ 6% доогуур' },
      badges: ['verified', 'new'],
      loanType: 'Тохиролцоно',
      monthly: 0,
      img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон',
      insulation: 'Гадна 100мм PIR (шинэ стандарт)',
      heating: 'Төвлөрсөн халаалт',
      parking: 'Хайс доорх 1 машины байр (15 сая ₮)',
      elevator: '2 ширхэг лифт',
      utilityCost: '140,000 ₮/сар (зун) · 260,000 ₮/сар (өвөл) - таамаг',
      ownership: 'Барилгын явц 95%, баримт нөхцөлд',
      cadastre: 'Шинэ барилга — кадастр гарч буй',
      collateral: 'Барьцаагүй (барилгын компанийн гэрээгээр)',
      taxDebt: 'Шинэ барилга — өргүй',
      condition: 'Засваргүй (white box)',
      legalNotes: 'ХХБ-тай гэрээтэй, барилгын зээл шилжүүлэх боломжтой'
    },
    {
      id: 6,
      cat: 'land',
      title: 'Налайх, барилгын зориулалттай газар',
      loc: 'Налайх дүүрэг · 6-р хороо',
      district: 'nalaikh',
      price: 145,
      pricePerSqm: 0.242,
      area: 600,
      rooms: '0.06 га',
      floor: 'Эзэмшил',
      year: 'Цахилгаан, ус татсан',
      tag: { type: 'below', text: '↓ 12% доогуур' },
      badges: ['verified'],
      loanType: 'Бэлэн мөнгө',
      monthly: '+18% / 5 жил',
      img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
      buildingType: 'Газар (барилгын зориулалттай)',
      insulation: 'Хамаарахгүй',
      heating: 'Дэд бүтэц татсан',
      parking: 'Талбай дотор боломжтой',
      elevator: 'Хамаарахгүй',
      utilityCost: 'Цахилгаан холболт хийсэн, ус ойролцоо',
      ownership: 'Хувийн эзэмшил (60 жил)',
      cadastre: 'Газрын кадастр шинэчилсэн, ангилал 2А',
      collateral: 'Барьцаагүй',
      taxDebt: 'Газрын татвар тушаасан',
      condition: 'Хашаатай, барилгын ажил эхлэх боломжтой',
      legalNotes: 'Газар эзэмшүүлэх гэрчилгээ (НА-009876) бэлэн'
    },
    {
      id: 8, cat: 'apartment', title: 'Чингэлтэй, 13-р хороо, 1 өрөө',
      loc: 'Чингэлтэй, 13-р хороо · Амгалан', district: 'chingeltei',
      price: 148, pricePerSqm: 3.7, area: 40, rooms: 1, floor: '3/5', year: 2015,
      tag: { type: 'below', text: '↓ 5% доогуур' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      buildingType: 'Хийц өрлөгийн (блок)', insulation: 'Гадна 80мм EPS', heating: 'Төвлөрсөн халаалт',
      parking: 'Байхгүй', elevator: 'Байхгүй', utilityCost: '120,000 ₮/сар (зун) · 220,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай, тавилгатай', legalNotes: 'Гэрчилгээ бэлэн, нэн даруй шилжүүлэх'
    },
    {
      id: 10, cat: 'apartment', title: 'Сонгинохайрхан, шинэ 2 өрөө',
      loc: 'Сонгинохайрхан, 20-р хороо', district: 'songinokhairkhan',
      price: 178, pricePerSqm: 3.56, area: 50, rooms: 2, floor: '4/9', year: 2023,
      tag: { type: 'below', text: '↓ 4% доогуур' }, badges: ['verified', 'new'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Гадна 100мм PIR', heating: 'Төвлөрсөн халаалт',
      parking: '1 машины байр (12 сая ₮)', elevator: '2 лифт', utilityCost: '150,000 ₮/сар (зун) · 270,000 ₮/сар (өвөл)',
      ownership: 'Барилгын явц 90%', cadastre: 'Гарч буй', collateral: 'Барьцаагүй',
      taxDebt: 'Шинэ барилга', condition: 'Засваргүй (white box)', legalNotes: 'Барилгын гэрээгээр'
    },
    {
      id: 12, cat: 'house', title: 'Хан-Уул, Зайсан, 4 өрөө хаус',
      loc: 'Хан-Уул, Зайсан 15-р хэсэг', district: 'khan-uul',
      price: 780, pricePerSqm: 3.25, area: 240, rooms: 4, floor: '0.06 га', year: 2020,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
      buildingType: 'Хийц өрлөгийн (керамзит блок)', insulation: 'Гадна 150мм EPS', heating: 'Хийн зуух + цахилгаан',
      parking: '2 машины хаалттай гараж', elevator: 'Байхгүй', utilityCost: 'Хий 250,000 · Цахилгаан 130,000 ₮/сар',
      ownership: 'Хувийн өмчлөл (газар + барилга)', cadastre: 'Газрын кадастр шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай, тавилгатай', legalNotes: 'Газрын гэрчилгээ бэлэн'
    },
    {
      id: 14, cat: 'office', title: 'Чингэлтэй, Б зэрэглэлийн оффис',
      loc: 'Чингэлтэй, 1-р хороо · Бизнес төв', district: 'chingeltei',
      price: 450, pricePerSqm: 5.6, area: 80, rooms: 'Б', floor: '3/8', year: 2019,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Хосолсон ханатай', heating: 'Кондиционер системтэй',
      parking: '1 машины байр', elevator: '2 лифт', utilityCost: '450,000 ₮/сар (бүгд багтсан)',
      ownership: 'ХХК-ийн өмчлөл', cadastre: 'Арилжааны зориулалт', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Premium засвартай', legalNotes: 'Зөвшөөрөл бэлэн'
    },
    {
      id: 16, cat: 'apartment', title: 'Баянгол, Ногоон нуур, 2 өрөө',
      loc: 'Баянгол, 19-р хороо · Ногоон нуур', district: 'bayangol',
      price: 255, pricePerSqm: 4.25, area: 60, rooms: 2, floor: '6/12', year: 2018,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Гадна 80мм EPS', heating: 'Төвлөрсөн халаалт',
      parking: 'Гадна талбай', elevator: '1 лифт', utilityCost: '170,000 ₮/сар (зун) · 300,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай', legalNotes: 'Гэрчилгээ бэлэн'
    },
    {
      id: 18, cat: 'apartment', title: 'Хан-Уул, Зайсан Тольт, 2 өрөө',
      loc: 'Хан-Уул, 15-р хороо · Зайсан Тольт', district: 'khan-uul',
      price: 380, pricePerSqm: 5.28, area: 72, rooms: 2, floor: '9/18', year: 2022,
      tag: { type: 'below', text: '↓ 3% доогуур' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Гадна 120мм EPS', heating: 'Төвлөрсөн + зохицуулалт',
      parking: '1 машины байр (30 сая ₮)', elevator: '2 лифт', utilityCost: '200,000 ₮/сар (зун) · 350,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай', legalNotes: 'Гэрчилгээ бэлэн, нэн даруй шилжүүлэх'
    },
    {
      id: 20, cat: 'house', title: 'Сонгинохайрхан, 2 давхар хаус',
      loc: 'Сонгинохайрхан, 32-р хороо', district: 'songinokhairkhan',
      price: 520, pricePerSqm: 2.6, area: 200, rooms: 4, floor: '0.08 га', year: 2019,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80',
      buildingType: 'Хийц өрлөгийн блок', insulation: 'Гадна 150мм EPS', heating: 'Хийн зуух',
      parking: '2 машины гараж', elevator: 'Байхгүй', utilityCost: 'Хий 220,000 · Цахилгаан 110,000 ₮/сар',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай, хэсэгчлэн тавилгатай', legalNotes: 'Газар + барилгын гэрчилгээ бэлэн'
    },
    {
      id: 22, cat: 'office', title: 'Баянгол, арилжааны зориулалт',
      loc: 'Баянгол, 4-р хороо · Олимп', district: 'bayangol',
      price: 680, pricePerSqm: 6.8, area: 100, rooms: 'А', floor: '5/10', year: 2020,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Хосолсон ханатай', heating: 'VRV системтэй кондиционер',
      parking: '2 машины байр (багтсан)', elevator: '3 лифт', utilityCost: '750,000 ₮/сар (бүгд)',
      ownership: 'ХХК-ийн өмчлөл', cadastre: 'Арилжааны зориулалт', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Premium засвартай', legalNotes: 'Зөвшөөрөл бэлэн'
    },
    {
      id: 24, cat: 'apartment', title: 'Хан-Уул, Зайсан Тольт, 3 өрөө',
      loc: 'Хан-Уул, 12-р хороо · Зайсан', district: 'khan-uul',
      price: 510, pricePerSqm: 5.1, area: 100, rooms: 3, floor: '11/18', year: 2022,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Гадна 120мм EPS', heating: 'Төвлөрсөн + зохицуулалт',
      parking: '1 машины байр (32 сая ₮)', elevator: '2 лифт', utilityCost: '280,000 ₮/сар (зун) · 490,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Гүйцэт засвартай, тавилгатай', legalNotes: 'Гэрчилгээ бэлэн'
    },
    {
      id: 26, cat: 'house', title: 'Чингэлтэй, орчин үеийн хаус',
      loc: 'Чингэлтэй, 3-р хороо · Дамбадаржаа', district: 'chingeltei',
      price: 645, pricePerSqm: 3.22, area: 200, rooms: 5, floor: '0.05 га', year: 2021,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      buildingType: 'Хийц өрлөгийн (AAC блок)', insulation: 'Гадна 150мм EPS', heating: 'Хийн зуух + дулааны шал',
      parking: '2 машины хаалттай гараж', elevator: 'Байхгүй', utilityCost: 'Хий 230,000 · Цахилгаан 120,000 ₮/сар',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай, тавилгатай', legalNotes: 'Гэрчилгээ бэлэн'
    },
    {
      id: 28, cat: 'apartment', title: 'Баянгол, Хорооллын гудамж, 3 өрөө',
      loc: 'Баянгол, 11-р хороо · Хорооллын гудамж', district: 'bayangol',
      price: 312, pricePerSqm: 4.45, area: 70, rooms: 3, floor: '8/14', year: 2020,
      tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Тохиролцоно', monthly: 0,
      img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      buildingType: 'Цутгамал төмөр бетон', insulation: 'Гадна 100мм EPS', heating: 'Төвлөрсөн халаалт',
      parking: 'Гадна талбай (8 сая ₮)', elevator: '2 лифт', utilityCost: '190,000 ₮/сар (зун) · 340,000 ₮/сар (өвөл)',
      ownership: 'Хувийн өмчлөл', cadastre: 'Шалгасан', collateral: 'Барьцаагүй',
      taxDebt: 'Өргүй', condition: 'Засвартай', legalNotes: 'Гэрчилгээ бэлэн'
    },
    {
      id: 30, cat: 'land', title: 'Хан-Уул, хөрөнгө оруулалтын газар',
      loc: 'Хан-Уул, 16-р хороо · Яармаг', district: 'khan-uul',
      price: 350, pricePerSqm: 0.5, area: 700, rooms: '0.07 га', floor: 'Эзэмшил',
      year: 'Бүрэн дэд бүтэц', tag: { type: 'normal', text: 'Зах зээлийн үнэ' }, badges: ['verified'],
      loanType: 'Бэлэн мөнгө', monthly: '+22% / 5 жил',
      img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
      buildingType: 'Газар (барилгын)', insulation: 'Хамаарахгүй', heating: 'Дэд бүтэц бэлэн',
      parking: 'Талбай дотор', elevator: 'Хамаарахгүй', utilityCost: 'Ус, цахилгаан, хий холбоотой',
      ownership: 'Хувийн эзэмшил (60 жил)', cadastre: 'Кадастр шинэчилсэн, хил тодорхой', collateral: 'Барьцаагүй',
      taxDebt: 'Татвар тушаасан', condition: 'Хашаатай, нэн даруй барилга эхлэх боломжтой', legalNotes: 'Гэрчилгээ бэлэн (ХА-002341)'
    },
    // ---- ТҮРЭЭС ----
    { id: 32, cat: 'rent', title: 'Сансар, 3 өрөө, бүрэн тавилгатай', loc: 'Сүхбаатар · Сансар', district: 'sukhbaatar',
      price: 2.5, pricePerSqm: 'Сарын түрээс', area: 90, rooms: 3, floor: '8/14', year: 2019,
      tag: { type: 'normal', text: 'Түрээс' }, badges: ['verified'],
      loanType: 'Хамаарахгүй', monthly: 2.5,
      img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      buildingType: 'Цутгамал', insulation: '120мм MW', heating: 'Төвлөрсөн',
      parking: '1 машины байр (нэмэлтээр)', elevator: '3 лифт', utilityCost: 'Нэмэлтээр',
      ownership: 'Хувийн', cadastre: 'Баталгаажсан', collateral: 'Хамаарахгүй', taxDebt: 'Хамаарахгүй',
      condition: 'Тавилгатай, угсралттай', legalNotes: '1 сарын барьцаа' },
    { id: 34, cat: 'rent', title: 'Баянзүрх, 2 өрөө цэмцгэр', loc: 'Баянзүрх · 17-р хороо', district: 'bayanzurkh',
      price: 1.2, pricePerSqm: 'Сарын түрээс', area: 58, rooms: 2, floor: '6/12', year: 2020,
      tag: { type: 'below', text: '↓ Хямд' }, badges: ['new'],
      loanType: 'Хамаарахгүй', monthly: 1.2,
      img: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800&q=80',
      buildingType: 'Цутгамал', insulation: '100мм EPS', heating: 'Төвлөрсөн', parking: 'Байхгүй',
      elevator: '2 лифт', utilityCost: 'Нэмэлтээр', ownership: 'Хувийн',
      cadastre: 'Баталгаажсан', collateral: 'Хамаарахгүй', taxDebt: 'Хамаарахгүй',
      condition: 'Засвартай', legalNotes: '2 сарын урьдчилгаа' },
    { id: 36, cat: 'rent', title: 'Их Тойруу, 3 өрөө VIP', loc: 'Сүхбаатар · Их Тойруу', district: 'sukhbaatar',
      price: 3.2, pricePerSqm: 'Сарын түрээс', area: 105, rooms: 3, floor: '12/18', year: 2023,
      tag: { type: 'normal', text: 'Түрээс · Шинэ' }, badges: ['verified', 'new'],
      loanType: 'Хамаарахгүй', monthly: 3.2,
      img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
      buildingType: 'Цутгамал монолит', insulation: '120мм MW', heating: 'Хувийн зохицуулалттай',
      parking: '2 машины байр', elevator: '3 лифт', utilityCost: 'Нэмэлтээр',
      ownership: 'Хувийн', cadastre: 'Баталгаажсан', collateral: 'Хамаарахгүй', taxDebt: 'Хамаарахгүй',
      condition: 'Брэнд шинэ, угсралттай', legalNotes: '2 сарын барьцаа' },
    { id: 38, cat: 'rent', title: 'Хан-Уул, 4 өрөө хаус түрээс', loc: 'Хан-Уул · Яармаг', district: 'khan-uul',
      price: 3.8, pricePerSqm: 'Сарын түрээс', area: 160, rooms: 4, floor: '2 давхар', year: 2018,
      tag: { type: 'normal', text: 'Хаус түрээс' }, badges: ['verified'],
      loanType: 'Хамаарахгүй', monthly: 3.8,
      img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      buildingType: 'Керамзитбетон блок', insulation: '100мм EPS', heating: 'Хувийн зуух',
      parking: '2 машины байр (хашаанд)', elevator: 'Хамаарахгүй', utilityCost: 'Нэмэлтээр',
      ownership: 'Хувийн', cadastre: 'Баталгаажсан', collateral: 'Хамаарахгүй', taxDebt: 'Хамаарахгүй',
      condition: 'Сайн засвартай', legalNotes: '2 сарын барьцаа + гэрээ' },
    { id: 40, cat: 'rent', title: 'Сүхбаатар, 2 өрөө цэвэрхэн', loc: 'Сүхбаатар · Энхтайваны өргөн чөлөө', district: 'sukhbaatar',
      price: 2.0, pricePerSqm: 'Сарын түрээс', area: 72, rooms: 2, floor: '7/15', year: 2022,
      tag: { type: 'normal', text: 'Түрээс' }, badges: ['verified', 'new'],
      loanType: 'Хамаарахгүй', monthly: 2.0,
      img: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
      buildingType: 'Цутгамал монолит', insulation: '110мм EPS', heating: 'Хувийн зохицуулалттай',
      parking: 'Подвал (нэмэлтээр)', elevator: '2 лифт', utilityCost: 'Нэмэлтээр',
      ownership: 'Хувийн', cadastre: 'Баталгаажсан', collateral: 'Хамаарахгүй', taxDebt: 'Хамаарахгүй',
      condition: 'Засвартай, хэсэгчлэн тавилгатай', legalNotes: '1 сарын барьцаа' }
  ];

  // Give every demo listing a stable synthetic owner id so chat treats them the same
  // real way as user-submitted listings — messages actually persist to Firestore instead
  // of a scripted fake compose box; a demo seller just never happens to reply.
  listings.forEach(function(l) { if (!l.ownerId) l.ownerId = 'demo-' + l.id; });

  // Explicit demo marker (rather than relying on the absence of userSubmitted) so this
  // seed set can be found and removed in one filter — listings.filter(l => l.isDemo) —
  // once real listings are ready for launch. Never set on real/Firestore-loaded listings.
  listings.forEach(function(l) { l.isDemo = true; });

  // Backfill khoroo/complex for demo listings from their loc string (e.g. "Хан-Уул, 15-р
  // хороо · Зайсан Тольт") so khoroo/complex search works against demo data too, not only
  // new listings submitted after these fields were added to the Add Listing form.
  listings.forEach(function(l) {
    if (!l.loc) return;
    if (l.khoroo == null) {
      const m = l.loc.match(/(\d+)-р хороо/);
      if (m) l.khoroo = parseInt(m[1], 10);
    }
    if (!l.complex) {
      const parts = l.loc.split('·').map(function(s) { return s.trim(); });
      const tail = parts[parts.length - 1];
      if (parts.length > 1 && tail && !/^\d+-р хороо$/.test(tail)) l.complex = tail;
    }
  });

  // Load any user-submitted listings from localStorage
  (function() {
    try {
      var saved = JSON.parse(localStorage.getItem('bairxUserListings') || '[]');
      saved.forEach(function(l) {
        if (!listings.find(function(x) { return x.id === l.id; })) {
          listings.push(l);
          if (l._gallery && l._gallery.length > 0) {
            listingExtras[l.id] = { coords: { x: 50, y: 50 }, gallery: l._gallery };
          }
        }
      });
    } catch(e) {}

    // Restore boost (vip) badges from localStorage
    try {
      var boosted = JSON.parse(localStorage.getItem('bairxBoostedListings') || '[]');
      boosted.forEach(function(id) {
        var l = listings.find(function(x) { return x.id === id; });
        if (l && !l.badges.includes('vip')) l.badges.push('vip');
      });
    } catch(e) {}

    // Restore seller data for user listings from localStorage
    try {
      var sellerSaved = JSON.parse(localStorage.getItem('bairxSellerData') || '{}');
      Object.keys(sellerSaved).forEach(function(id) {
        sellerData[parseInt(id, 10)] = sellerSaved[id];
      });
    } catch(e) {}
  })();

  // ===== PUBLIC LISTINGS FROM FIRESTORE =====
  // Everyone (logged in or not) needs to see every active real listing, not just their own —
  // this is what actually makes user-submitted listings visible across devices/accounts.
  // Paginated via limit()/startAfter() on the query's default (document-ID) ordering — no
  // .orderBy() on a separate field, since that would need a composite Firestore index that
  // isn't deployed anywhere in this repo (firestore.indexes.json doesn't exist); adding one
  // blind would 500 the live query until someone manually created it in the console.
  const PUBLIC_LISTINGS_PAGE_SIZE = 60;
  let _publicListingsCursor = null;
  let _publicListingsExhausted = false;
  async function loadPublicListings(loadMore) {
    if (loadMore && _publicListingsExhausted) return;
    try {
      let q = db.collection('listings').where('status', '==', 'active').limit(PUBLIC_LISTINGS_PAGE_SIZE);
      if (loadMore && _publicListingsCursor) q = q.startAfter(_publicListingsCursor);
      const snap = await q.get();
      if (snap.docs.length > 0) _publicListingsCursor = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < PUBLIC_LISTINGS_PAGE_SIZE) _publicListingsExhausted = true;
      let added = false;
      snap.forEach(doc => {
        if (listings.some(l => l.firestoreId === doc.id)) return;
        const d = doc.data();
        const numId = listings.reduce((m, l) => l.id > m ? l.id : m, 0) + 1;
        const feats = d.features || [];
        const entry = {
          id: numId, firestoreId: doc.id, ownerId: d.ownerId, sellerVerified: !!d.sellerVerified,
          phoneVerified: !!d.phoneVerified, listingVerified: !!d.listingVerified, reportCount: d.reportCount || 0,
          cat: d.category || 'apartment', propertyType: d.propertyType || d.category || 'apartment',
          title: d.title, loc: d.loc, district: d.district,
          khoroo: d.khoroo || null,
          geoLat: d.geoLat || null, geoLng: d.geoLng || null,
          price: d.price, area: d.area, rooms: d.rooms, floor: d.floor, year: d.year,
          bedrooms: d.bedrooms || null, bathrooms: d.bathrooms || null,
          buildingName: d.buildingName || '', complex: d.complex || '',
          buildingType: d.buildingType || '', insulation: d.insulation || '', windowDirection: d.windowDirection || '',
          hoaFee: d.hoaFee || null, heating: d.heating || '',
          parking: feats.includes('parking') ? 'Паркинг бий' : '', elevator: feats.includes('elevator') ? 'Лифттэй' : '',
          balcony: feats.includes('balcony') ? 'Тагттай' : '', basement: feats.includes('basement') ? 'Зоорьтой' : '',
          furniture: feats.includes('furnished') ? 'Тавилгатай' : '',
          landArea: d.landArea || null, usageType: d.usageType || '', barterOk: !!d.barterOk,
          deposit: d.deposit || null, minTerm: d.minTerm || '',
          condition: d.condition || '', features: feats,
          paymentTerms: d.paymentTerms || [], constructionProgress: d.constructionProgress || '',
          description: d.description || '',
          videoUrl: d.videoUrl || '', tourUrl: d.tourUrl || '', floorPlan: d.floorPlan || null,
          img: (d.images && d.images[0]) || d.img || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
          tag: { type: 'new', text: 'Шинэ зар' }, badges: d.badges || ['new', 'user'],
          loanType: 'Тохиролцоно', monthly: 0,
          userSubmitted: true, isDemo: false,
          // This query already only fetches status=='active' docs, so _inactive is false in
          // practice — kept as a real status check (not a hardcoded false) so this stays
          // correct if the query is ever loosened.
          status: d.status || 'active', rejectionReason: d.rejectionReason || '',
          _inactive: (d.status || 'active') !== 'active',
          viewCount: d.viewCount || 0, favoriteCount: d.favoriteCount || 0, contactCount: d.contactCount || 0,
          expiresAt: d.expiresAt || null, _bumpedAt: d.bumpedAt || numId,
          _createdAtMs: d.createdAt?.toMillis?.() || 0
        };
        listings.push(entry);
        if (d.images && d.images.length > 1) listingExtras[numId] = { coords: { x: 50, y: 50 }, gallery: d.images };
        sellerData[numId] = { phone: d.sellerPhone || '', name: d.sellerName || 'Хэрэглэгч', type: d.sellerType || 'Хувь хүн', company: d.sellerCompany || '', email: d.sellerEmail || '', photoURL: d.sellerPhotoURL || '' };
        added = true;
      });
      if (added) {
        if (typeof checkExpiredListings === 'function') checkExpiredListings();
        renderHomeListings(); renderListings(getFilteredListings()); updateCatPillCounts();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof checkNotificationTriggers === 'function') checkNotificationTriggers();
      }
      const loadMoreWrap = document.getElementById('loadMoreListingsWrap');
      if (loadMoreWrap) loadMoreWrap.style.display = _publicListingsExhausted ? 'none' : 'block';
    } catch(e) {}
  }

  async function loadMorePublicListings() {
    const btn = document.getElementById('loadMoreListingsBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Ачааллаж байна…'; }
    await loadPublicListings(true);
    if (btn) { btn.disabled = false; btn.textContent = 'Цааш үзэх'; }
  }
