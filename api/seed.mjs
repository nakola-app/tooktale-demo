// ข้อมูลตัวอย่างทั้งหมดเป็นของสมมุติ — ชื่อร้าน ชื่อแขก ราคา จุดรับส่ง จุดเที่ยว ไม่ใช่ของจริง
// วันที่อิงจากวันนี้เสมอ เพื่อให้เดโม่มีงาน "วันนี้" ทุกครั้งที่ reset

let seedState = 20261106;
const rand = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dayOffset = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const stamp = (offset, hour = 10, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const diffDays = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

const ANGLES = ['front', 'left', 'right', 'rear'];
const photoSet = (vehicle, at, extraDamage = null) =>
  ANGLES.map((angle) => ({
    angle,
    takenAt: at,
    damage: extraDamage?.angle === angle ? 'new' : vehicle.oldMark === angle ? 'old' : null,
  }));

// ใบตกลงของร้าน: EN บังคับ · langs = ภาษาที่ร้านเปิดไว้ (ร้านนี้มีจีนด้วย)
const rulesBaan = {
  langs: ['en', 'th', 'zh'],
  repairs: [
    { th: 'กระจกมองข้างแตก', en: 'Broken side mirror', zh: '后视镜破损', price: 400 },
    { th: 'รอยขีดข่วนชุดสี (ต่อชิ้น)', en: 'Scratched body panel (per panel)', zh: '车身面板刮伤（每块）', price: 800 },
    { th: 'ไฟหน้า/ไฟท้ายแตก', en: 'Broken head/tail light', zh: '前灯/尾灯破损', price: 600 },
    { th: 'กุญแจหาย', en: 'Lost key', zh: '钥匙丢失', price: 500 },
    { th: 'รถล้มหนัก ซ่อมตามใบเสร็จอู่', en: 'Major crash: repair at garage price', zh: '严重事故：按修车厂收据维修', price: null },
  ],
  returnTh: 'คืนที่ร้านเท่านั้น ห้ามจอดทิ้งไว้ที่โรงแรมหรือท่าเรือ ถ้าจะคืนที่จุดอื่นต้องเลือกบริการรับรถคืน',
  returnEn: 'Return to the shop only. Do not leave the bike at a hotel or pier. To return elsewhere, book the collection service.',
  returnZh: '只能在店里还车。不要把车留在酒店或码头。如需在其他地点还车，请预订上门取车服务。',
  abandonFee: 1000,
  holdTh: 'ถ่ายรูปพาสปอร์ต ไม่ยึดเล่ม',
  holdEn: 'We photograph your passport. We do not keep it.',
  holdZh: '我们会拍下您的护照照片，但不扣留护照。',
  lateFeePerHour: 100,
};

// ร้านนี้มีแค่ EN + ไทย → แขกจีนจะเห็นฉบับอังกฤษ
const rulesBreeze = {
  langs: ['en', 'th'],
  repairs: [
    { th: 'กระจกมองข้างแตก', en: 'Broken side mirror', price: 350 },
    { th: 'รอยขีดข่วนชุดสี (ต่อชิ้น)', en: 'Scratched body panel (per panel)', price: 700 },
    { th: 'กุญแจหาย', en: 'Lost key', price: 400 },
  ],
  returnTh: 'คืนที่ร้านภายในเวลาที่ตกลง',
  returnEn: 'Return to the shop by the agreed time.',
  abandonFee: 800,
  holdTh: 'ไม่ยึดเอกสาร',
  holdEn: 'We do not keep any documents.',
  lateFeePerHour: 80,
};

export function createSeed() {
  seedState = 20261106;

  const shops = [
    {
      id: 's1', slug: 'baan-talay-bike', name: 'บ้านทะเลไบค์', nameEn: 'Baan Talay Bike',
      area: 'เกาะยาวใหญ่ ฝั่งตะวันออก', areaEn: 'Koh Yao Yai, east side',
      aboutTh: 'ร้านครอบครัว รถเช็กทุกคันก่อนส่ง', aboutEn: 'Family-run. Every bike is checked before it goes out.',
      lineName: 'บังโต้ บ้านทะเล', phone: '08x-xxx-1111', status: 'active', rules: rulesBaan, mapX: 62, mapY: 48,
    },
    {
      id: 's2', slug: 'yao-breeze-rental', name: 'ยาวบรีซ เรนทัล', nameEn: 'Yao Breeze Rental',
      area: 'เกาะยาวใหญ่ ฝั่งเหนือ', areaEn: 'Koh Yao Yai, north side',
      aboutTh: 'รถน้อยแต่ดูแลถึงที่', aboutEn: 'A small fleet, looked after properly.',
      lineName: 'พี่นุช ยาวบรีซ', phone: '08x-xxx-2222', status: 'active', rules: rulesBreeze, mapX: 50, mapY: 20,
    },
    {
      id: 's3', slug: 'lom-le-bike', name: 'ลมเลไบค์', nameEn: 'Lom Le Bike',
      area: 'เกาะยาวใหญ่ ฝั่งใต้', areaEn: 'Koh Yao Yai, south side',
      aboutTh: 'ร้านใหม่ รอตรวจสอบ', aboutEn: 'New shop awaiting review.',
      lineName: 'อาหมัด ลมเล', phone: '08x-xxx-3333', status: 'pending', rules: rulesBreeze, mapX: 46, mapY: 80,
    },
  ];

  const v = (id, shopId, name, plate, color, colorName, colorNameEn, price, gear, cc, extra = {}) => ({
    id, shopId, name, plate, color, colorName, colorNameEn, pricePerDay: price, gear, cc,
    rentFrom: null, rentTo: null, active: true, oldMark: null, ...extra,
  });

  const vehicles = [
    v('v1', 's1', 'Honda Click 125i', 'กข 1024', '#F4F1EA', 'ขาว', 'White', 280, 'auto', 125, { oldMark: 'rear' }),
    v('v2', 's1', 'Honda Click 125i', 'กข 1025', '#2B2F33', 'ดำ', 'Black', 280, 'auto', 125),
    v('v3', 's1', 'Honda Scoopy i', 'กข 2210', '#8FD3C5', 'เขียวมิ้นต์', 'Mint', 250, 'auto', 110, { oldMark: 'left' }),
    v('v4', 's1', 'Yamaha Fino', 'กค 3381', '#D8452E', 'แดง', 'Red', 250, 'auto', 125),
    v('v5', 's1', 'Honda PCX 160', 'กง 7001', '#1F4E8C', 'น้ำเงิน', 'Blue', 450, 'auto', 160),
    v('v6', 's1', 'Yamaha Aerox 155', 'กง 7002', '#6B7280', 'เทา', 'Grey', 420, 'auto', 155),
    v('v7', 's1', 'Honda Wave 110i', 'กจ 4412', '#B3261E', 'แดงเลือดหมู', 'Maroon', 200, 'semi', 110),
    v('v8', 's1', 'Honda Scoopy i', 'กฉ 9090', '#7DB7E8', 'ฟ้า', 'Sky blue', 250, 'auto', 110, {
      rentFrom: dayOffset(9), rentTo: dayOffset(170), familyNote: 'รถครอบครัว ปล่อยเฉพาะไฮซีซั่น',
    }),
    v('v9', 's2', 'Honda Click 125i', 'ขน 5501', '#C9B48A', 'ทอง', 'Gold', 300, 'auto', 125),
    v('v10', 's2', 'Yamaha Grand Filano', 'ขน 5502', '#E8A0A8', 'ชมพู', 'Pink', 320, 'auto', 125),
    v('v11', 's2', 'Honda PCX 160', 'ขน 5503', '#20242A', 'ดำด้าน', 'Matte black', 480, 'auto', 160),
    v('v12', 's2', 'Honda Wave 110i', 'ขน 5504', '#2E7D5B', 'เขียว', 'Green', 220, 'semi', 110),
    v('v13', 's3', 'Honda Click 125i', 'ขอ 1001', '#F4F1EA', 'ขาว', 'White', 280, 'auto', 125),
  ];

  const points = [
    { id: 'p1', name: 'ลานจอดท่าเรือ (ตัวอย่าง)', nameEn: 'Pier car park (sample)', kind: 'parking', fee: 150, active: true, mapX: 74, mapY: 44 },
    { id: 'p2', name: 'โรงแรมฝั่งตะวันตก A (ตัวอย่าง)', nameEn: 'West Coast Hotel A (sample)', kind: 'hotel', fee: 250, active: true, mapX: 30, mapY: 42 },
    { id: 'p3', name: 'รีสอร์ตฝั่งเหนือ B (ตัวอย่าง)', nameEn: 'North Resort B (sample)', kind: 'hotel', fee: 200, active: true, mapX: 40, mapY: 16 },
    { id: 'p4', name: 'บังกะโลหาดใต้ C (ตัวอย่าง)', nameEn: 'South Beach Bungalow C (sample)', kind: 'hotel', fee: 200, active: true, mapX: 40, mapY: 74 },
  ];

  const runners = [
    { id: 'r1', name: 'ฟิตรี (ตัวอย่าง)', phone: '09x-xxx-1001', area: 'ทั้งเกาะ', status: 'active' },
    { id: 'r2', name: 'สมาน (ตัวอย่าง)', phone: '09x-xxx-1002', area: 'ฝั่งตะวันออก', status: 'active' },
    { id: 'r3', name: 'อารีฟ (ตัวอย่าง)', phone: '09x-xxx-1003', area: 'ฝั่งตะวันตก', status: 'inactive' },
  ];

  const spots = [
    {
      id: 'sp1', name: 'จุดชมพระอาทิตย์ตกปลายแหลม (ตัวอย่าง)', nameEn: 'Sunset cape viewpoint (sample)', kind: 'view',
      noteTh: 'มาก่อนพระอาทิตย์ตก 30 นาที มีม้านั่งไม้ของชาวบ้าน', noteEn: 'Arrive 30 minutes before sunset. Locals built the wooden bench.',
      roadTh: 'ลาดยางถึงจุด', roadEn: 'Paved all the way', roadLevel: 'easy',
      respectTh: 'ไม่จอดรถขวางทางเข้าบ้าน', respectEn: 'Do not block house entrances.',
      permitted: true, visibility: 'public', mapX: 22, mapY: 56,
    },
    {
      id: 'sp2', name: 'มัสยิดเก่ากลางหมู่บ้าน (ตัวอย่าง)', nameEn: 'Old village mosque (sample)', kind: 'culture',
      noteTh: 'ชมจากด้านนอกได้ เงียบช่วงเวลาละหมาด', noteEn: 'View it from outside. Keep quiet during prayer times.',
      roadTh: 'ลาดยาง', roadEn: 'Paved', roadLevel: 'easy',
      respectTh: 'แต่งกายสุภาพ ไม่ถ่ายรูปคนละหมาด', respectEn: 'Dress modestly. Do not photograph people praying.',
      permitted: true, visibility: 'public', mapX: 56, mapY: 34,
    },
    {
      id: 'sp3', name: 'ทางลัดสวนยางไปหาดเงียบ (ตัวอย่าง)', nameEn: 'Rubber-grove shortcut to a quiet beach (sample)', kind: 'beach',
      noteTh: 'ทางเล็ก ร่มตลอดทาง', noteEn: 'A small shaded track the whole way.',
      roadTh: 'ทางดิน ลื่นมากตอนฝนตก', roadEn: 'Dirt track, very slippery after rain', roadLevel: 'hard',
      respectTh: 'เป็นสวนของชาวบ้าน ใช้ทางเดิม ไม่เก็บผลผลิต', respectEn: 'This is a working farm. Stay on the track and leave the crops.',
      permitted: true, visibility: 'booked', mapX: 34, mapY: 30,
    },
    {
      id: 'sp4', name: 'ร้านกาแฟในบ้านชาวประมง (ตัวอย่าง)', nameEn: 'Coffee at a fisher family home (sample)', kind: 'food',
      noteTh: 'เปิดเช้าถึงเที่ยง ปิดวันศุกร์', noteEn: 'Open mornings until noon. Closed Fridays.',
      roadTh: 'ลาดยาง ช่วงสุดท้ายเป็นคอนกรีตแคบ', roadEn: 'Paved, then a narrow concrete lane', roadLevel: 'medium',
      respectTh: 'เป็นบ้านคน พูดเบาๆ', respectEn: 'It is a family home, so keep your voice down.',
      permitted: true, visibility: 'booked', mapX: 68, mapY: 62,
    },
    {
      id: 'sp5', name: 'ลานหาหอยตอนน้ำลด (ตัวอย่าง)', nameEn: 'Low-tide shell flats (sample)', kind: 'nature',
      noteTh: 'ไปได้เฉพาะตอนน้ำลด ถามร้านก่อนไป', noteEn: 'Low tide only. Ask the shop before you go.',
      roadTh: 'ลูกรัง จอดรถไว้บนฝั่ง', roadEn: 'Gravel. Park above the tide line.', roadLevel: 'medium',
      respectTh: 'เป็นแหล่งทำกินของชุมชน ไม่เก็บสัตว์น้ำ', respectEn: 'Locals fish here. Do not take anything.',
      permitted: true, visibility: 'booked', mapX: 52, mapY: 70,
    },
    {
      id: 'sp6', name: 'หาดหลังหมู่บ้าน (ตัวอย่าง รออนุญาต)', nameEn: 'Beach behind the village (sample, pending)', kind: 'beach',
      noteTh: 'ยังไม่ได้คุยกับผู้นำชุมชน', noteEn: 'Community leader not yet consulted.',
      roadTh: 'ทางดิน', roadEn: 'Dirt track', roadLevel: 'hard',
      respectTh: '-', respectEn: '-',
      permitted: false, visibility: 'booked', mapX: 28, mapY: 66,
    },
  ];

  const bookings = [];
  const handoffs = [];
  const jobs = [];
  const threads = [];
  const notifications = [];
  let n = 1000;
  // ค่าธรรมเนียมผู้เช่า: % เป็นค่าตัวอย่าง (ยังไม่เคาะ) · ทดลองฟรีถึงวันที่ trialUntil แล้วเริ่มเก็บ
  // ทดลองฟรีจบก่อนเดือนที่แล้ว → เดือนที่แล้วมีใบแจ้งยอดให้โชว์เสมอ
  // runnerEnabled: บริการส่งรถถึงจุดปิดไว้จนกว่าจะมี payment gateway
  const config = { runnerEnabled: false, feePct: 10, trialUntil: (() => { const d = new Date(); d.setDate(0); d.setDate(0); return iso(d); })() };

  const mk = (o) => {
    const vehicle = vehicles.find((x) => x.id === o.vehicleId);
    const shop = shops.find((x) => x.id === vehicle.shopId);
    const days = diffDays(o.from, o.to);
    const pickup = o.pickup || { mode: 'shop' };
    const dropoff = o.dropoff || { mode: 'shop' };
    const fee = (m) => (m.mode === 'point' ? points.find((p) => p.id === m.pointId).fee : 0);
    n += 1;
    const b = {
      id: `b${n}`, code: `TT-${n}`, token: `demo${n}`, shopId: shop.id, vehicleId: vehicle.id,
      from: o.from, to: o.to, pickupTime: o.pickupTime || '10:00', returnTime: o.returnTime || '17:00',
      guest: o.guest, lang: o.lang || 'en', pickup, dropoff, source: o.source || 'online', status: o.status,
      days, pricePerDay: vehicle.pricePerDay, rentTotal: days * vehicle.pricePerDay,
      deliveryFee: fee(pickup) + fee(dropoff),
      createdAt: o.createdAt || stamp(-3), threadId: null,
      // คำขอที่ร้านยังไม่ตอบ: ครบเวลาแล้วระบบยืนยันให้เอง
      autoConfirmAt: o.status === 'requested' ? new Date(new Date(o.createdAt).getTime() + Number(process.env.AUTO_CONFIRM_MIN || 15) * 60000).toISOString() : null,
      agreement: o.agreement || { status: 'none' }, damage: o.damage || null, closedAt: o.closedAt || null,
      events: [],
    };
    // จองออนไลน์หลังหมดช่วงทดลอง = มีค่าธรรมเนียม (แขกจ่ายร้าน ร้านเก็บแทน)
    b.feePct = b.source === 'online' && b.createdAt.slice(0, 10) > config.trialUntil ? config.feePct : 0;
    b.fee = Math.round((b.rentTotal * b.feePct) / 100);
    bookings.push(b);
    return b;
  };

  const countries = [
    ['Germany', 'de'], ['Germany', 'de'], ['Germany', 'de'], ['Sweden', 'se'], ['France', 'fr'],
    ['United Kingdom', 'uk'], ['Australia', 'au'], ['Thailand', 'th'], ['Netherlands', 'nl'],
  ];
  const first = ['Lena', 'Jonas', 'Mia', 'Felix', 'Sofia', 'Oskar', 'Chloé', 'Tom', 'Grace', 'Nattapong', 'Daan', 'Klara', 'Ben', 'Marie'];
  const guestFor = (name, country) => ({
    name,
    email: `${name.toLowerCase().split(' ')[0].normalize('NFD').replace(/[^a-z]/g, '')}@example.com`,
    whatsapp: '+00 000 000 000',
    license: `IDP-${Math.floor(100000 + rand() * 899999)}`,
    country,
  });

  // ประวัติย้อนหลัง 45 วัน เพื่อให้ analytics มีตัวเลข
  const fleetBusyUntil = {};
  for (const vehicle of vehicles.filter((x) => x.shopId !== 's3' && x.id !== 'v8')) {
    let cursor = -45 + Math.floor(rand() * 6);
    const eagerness = vehicle.shopId === 's1' ? 0.75 : 0.6;
    while (cursor < -2) {
      const len = 2 + Math.floor(rand() * 5);
      if (cursor + len >= -1) break;
      if (rand() < eagerness) {
        const [country] = pick(countries);
        const walkin = rand() < 0.42;
        const delivered = !walkin && rand() < 0.3;
        const point = pick(points).id;
        const b = mk({
          vehicleId: vehicle.id, from: dayOffset(cursor), to: dayOffset(cursor + len), status: 'completed',
          guest: guestFor(pick(first), country), source: walkin ? 'walkin' : 'online',
          pickup: delivered ? { mode: 'point', pointId: point } : { mode: 'shop' },
          dropoff: delivered ? { mode: 'point', pointId: point } : { mode: 'shop' },
          createdAt: stamp(cursor - 3),
          agreement: { status: 'accepted', acceptedAt: stamp(cursor, 10, 12), acceptedOn: 'guest_phone' },
          closedAt: stamp(cursor + len, 17, 30),
        });
        handoffs.push(
          { id: `h${b.id}a`, bookingId: b.id, stage: 'to_guest', by: 'shop', byName: 'ร้าน', fuel: 'full', photos: photoSet(vehicle, stamp(cursor, 10, 5)), at: stamp(cursor, 10, 5) },
          { id: `h${b.id}b`, bookingId: b.id, stage: 'from_guest', by: 'shop', byName: 'ร้าน', fuel: 'half', photos: photoSet(vehicle, stamp(cursor + len, 17, 10)), at: stamp(cursor + len, 17, 10) },
        );
      }
      cursor += len + 1 + Math.floor(rand() * 3);
    }
    fleetBusyUntil[vehicle.id] = cursor;
  }

  const addJob = (b, kind, status, runnerId = null, extra = {}) => {
    const leg = kind === 'deliver' ? b.pickup : b.dropoff;
    jobs.push({
      id: `j${jobs.length + 1}`, bookingId: b.id, shopId: b.shopId, kind, status, runnerId, pointId: leg.pointId,
      date: kind === 'deliver' ? b.from : b.to, time: kind === 'deliver' ? b.pickupTime : b.returnTime,
      createdAt: b.createdAt, shopConfirmedAt: null, ...extra,
    });
  };

  // เคสหลักฐาน: รอยใหม่โผล่ระหว่างแขกใช้รถ ปิดด้วยใบตกลง + รูป (direction-locked ข้อ 6)
  const noah = mk({
    vehicleId: 'v6', from: dayOffset(-5), to: dayOffset(-2), status: 'completed',
    guest: guestFor('Noah Keller', 'Germany'), createdAt: stamp(-8),
    pickup: { mode: 'point', pointId: 'p2' }, dropoff: { mode: 'point', pointId: 'p2' },
    agreement: { status: 'accepted', acceptedAt: stamp(-5, 10, 42), acceptedOn: 'guest_phone', rules: rulesBaan },
    damage: { items: [{ label: 'รอยขีดข่วนชุดสี (ต่อชิ้น)', labelEn: 'Scratched body panel (per panel)', price: 800 }], note: 'รอยใหม่ฝั่งขวา ไม่มีในรูปตอนส่ง แขกยอมจ่ายตามใบตกลง' },
    closedAt: stamp(-2, 18, 5),
  });
  const v6 = vehicles.find((x) => x.id === 'v6');
  handoffs.push(
    { id: 'hn1', bookingId: noah.id, stage: 'shop_runner', by: 'runner', byName: 'ฟิตรี (ตัวอย่าง)', fuel: 'full', photos: photoSet(v6, stamp(-5, 9, 50)), at: stamp(-5, 9, 50), confirmedAt: stamp(-5, 9, 53) },
    { id: 'hn2', bookingId: noah.id, stage: 'to_guest', by: 'runner', byName: 'ฟิตรี (ตัวอย่าง)', fuel: 'full', photos: photoSet(v6, stamp(-5, 10, 38)), at: stamp(-5, 10, 38) },
    { id: 'hn3', bookingId: noah.id, stage: 'from_guest', by: 'runner', byName: 'สมาน (ตัวอย่าง)', fuel: 'half', photos: photoSet(v6, stamp(-2, 16, 40), { angle: 'right' }), at: stamp(-2, 16, 40) },
    { id: 'hn4', bookingId: noah.id, stage: 'runner_shop', by: 'shop', byName: 'ร้าน', fuel: 'half', photos: photoSet(v6, stamp(-2, 17, 45), { angle: 'right' }), at: stamp(-2, 17, 45) },
  );
  addJob(noah, 'deliver', 'delivered', 'r1');
  addJob(noah, 'collect', 'delivered', 'r2');

  // งานของวันนี้
  mk({
    vehicleId: 'v5', from: dayOffset(2), to: dayOffset(6), status: 'requested', createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    guest: guestFor('Anna Schneider', 'Germany'),
  });
  mk({
    vehicleId: 'v2', from: dayOffset(1), to: dayOffset(3), status: 'requested', createdAt: new Date(Date.now() - 7 * 60000).toISOString(),
    guest: { ...guestFor('Nattapong Saetang', 'Thailand'), license: 'ใบขับขี่ไทย' }, lang: 'th',
  });
  mk({ vehicleId: 'v4', from: dayOffset(0), to: dayOffset(3), status: 'confirmed', guest: guestFor('Lukas Bauer', 'Germany'), createdAt: stamp(-2) });
  const emma = mk({
    vehicleId: 'v3', from: dayOffset(0), to: dayOffset(4), status: 'confirmed', guest: guestFor('Emma Lindqvist', 'Sweden'), createdAt: stamp(-1),
    pickupTime: '14:00', returnTime: '11:00',
  });

  const hannah = mk({
    vehicleId: 'v1', from: dayOffset(-3), to: dayOffset(0), status: 'active', guest: guestFor('Hannah Vogel', 'Germany'), createdAt: stamp(-6),
    agreement: { status: 'accepted', acceptedAt: stamp(-3, 10, 15), acceptedOn: 'guest_phone', rules: rulesBaan },
  });
  const v1 = vehicles.find((x) => x.id === 'v1');
  handoffs.push({ id: 'hh1', bookingId: hannah.id, stage: 'to_guest', by: 'shop', byName: 'ร้าน', fuel: 'full', photos: photoSet(v1, stamp(-3, 10, 8)), at: stamp(-3, 10, 8) });

  const marcus = mk({
    vehicleId: 'v7', from: dayOffset(-2), to: dayOffset(1), status: 'active', guest: guestFor('Marcus Hill', 'United Kingdom'), createdAt: stamp(-5),
    agreement: { status: 'accepted', acceptedAt: stamp(-2, 9, 40), acceptedOn: 'shop_phone', rules: rulesBaan, selfie: { simulated: true, takenAt: stamp(-2, 9, 39) } },
  });
  const v7 = vehicles.find((x) => x.id === 'v7');
  handoffs.push({ id: 'hm1', bookingId: marcus.id, stage: 'to_guest', by: 'shop', byName: 'ร้าน', fuel: 'full', photos: photoSet(v7, stamp(-2, 9, 35)), at: stamp(-2, 9, 35) });

  const claire = mk({
    vehicleId: 'v10', from: dayOffset(1), to: dayOffset(4), status: 'confirmed', guest: guestFor('Claire Dubois', 'France'), createdAt: stamp(-1),
  });

  const blocks = [
    { id: 'bl1', vehicleId: 'v6', from: dayOffset(3), to: dayOffset(4), reason: 'เข้าศูนย์เปลี่ยนน้ำมัน' },
  ];

  threads.push({
    id: 't1', token: 'demothread1', shopId: 's1', guestName: 'Mia', bookingId: null, lang: 'en', unreadShop: 1, unreadGuest: 0,
    messages: [
      { id: 'm1', from: 'guest', text: 'Hi! Do you have an automatic bike for 2 people next weekend?', at: stamp(0, 7, 48) },
    ],
  });
  // แขกจีน: ปุ่มตอบด่วนฝั่งร้านจะส่งเป็นภาษาจีนให้
  threads.push({
    id: 't2', token: 'demothread2', shopId: 's1', guestName: 'Chen Jie', bookingId: null, lang: 'zh', unreadShop: 1, unreadGuest: 0,
    messages: [
      { id: 'm2', from: 'guest', text: '你好！明天有自动挡的摩托车吗？我们两个人。', at: stamp(0, 8, 31) },
    ],
  });

  // ทีมงานร้าน: เจ้าของ = คนที่ลงทะเบียนร้าน · บ้านทะเลไบค์มีแอดมินตัวอย่าง 1 คน
  const members = [
    { id: 'm1', shopId: 's1', name: 'บังโต้ (ตัวอย่าง)', lineName: 'บังโต้ บ้านทะเล', role: 'owner', active: true, addedAt: stamp(-60), addedBy: null },
    { id: 'm2', shopId: 's1', name: 'ฟ้า (ตัวอย่าง)', lineName: 'ฟ้า', role: 'admin', active: true, addedAt: stamp(-20), addedBy: 'm1' },
    { id: 'm3', shopId: 's2', name: 'พี่นุช (ตัวอย่าง)', lineName: 'พี่นุช ยาวบรีซ', role: 'owner', active: true, addedAt: stamp(-50), addedBy: null },
    { id: 'm4', shopId: 's3', name: 'อาหมัด (ตัวอย่าง)', lineName: 'อาหมัด ลมเล', role: 'owner', active: true, addedAt: stamp(-2), addedBy: null },
  ];

  // ใบแจ้งยอดเดือนก่อน: ยาวบรีซโอนแล้ว · บ้านทะเลไบค์ยังไม่โอน (ไว้โชว์แจ้งโอน)
  const lastMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return iso(d).slice(0, 7); })();
  const billing = [{ shopId: 's2', period: lastMonth, status: 'paid', reportedAt: stamp(-5, 11), reportedBy: 'พี่นุช (ตัวอย่าง)', slip: { simulated: true, takenAt: stamp(-5, 11) }, paidAt: stamp(-4, 9), sentAt: stamp(-8, 9) }];

  return { shops, vehicles, points, runners, spots, bookings, handoffs, jobs, threads, blocks, notifications, members, invites: [], config, billing, seq: n };
}
