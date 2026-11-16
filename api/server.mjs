// mock API ของเดโม่ tooktale — ฐานข้อมูลคือไฟล์ JSON ไฟล์เดียว ไม่มี auth จริง
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSeed, iso } from './seed.mjs';

const PORT = Number(process.env.PORT || 4105);
const DATA_FILE = process.env.DATA_FILE || './data/db.json';
const LAN_IP = process.env.LAN_IP || '';
// ร้านไม่ปฏิเสธภายในกี่นาที = ยืนยันให้อัตโนมัติ (decisions/auto-confirm-2026-11-09)
const AUTO_CONFIRM_MIN = Number(process.env.AUTO_CONFIRM_MIN || 15);

// ---------- store ----------
let db;
function load() {
  if (existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
      // ข้อมูลเก่าก่อนมีทีมงานร้าน: เติมสมาชิกจาก seed
      if (!db.members) { db.members = createSeed().members; db.invites = []; }
      // ข้อมูลเก่าก่อนมีค่าธรรมเนียม/ใบแจ้งยอด
      if (!db.config) { const s = createSeed(); db.config = s.config; db.billing = s.billing; }
      if (db.config.runnerEnabled === undefined) db.config.runnerEnabled = false;
      return;
    } catch { /* เสียก็ seed ใหม่ */ }
  }
  db = createSeed();
  persist();
}
function persist() {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db));
}
load();

// ---------- realtime (SSE) ----------
const clients = new Set();
function broadcast(payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(line);
}
function changed() {
  persist();
  broadcast({ type: 'change' });
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

// ---------- helpers ----------
const uid = (p) => `${p}${randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();
const today = () => iso(new Date());
const byId = (list, id) => list.find((x) => x.id === id);
const diffDays = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const overlaps = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const need = (cond, status, message) => { if (!cond) fail(status, message); };

function notify(role, id, channel, title, body, link = null, extra = {}) {
  const n = { id: uid('n'), role, targetId: id, channel, title, body, link, at: now(), ...extra };
  db.notifications.unshift(n);
  db.notifications = db.notifications.slice(0, 300);
  broadcast({ type: 'notify', notification: n });
}
// ทีมงานร้าน: เจ้าของ (คนที่ลงทะเบียนร้าน) 1 คน + แอดมินที่เจ้าของเชิญ · แอดมินทำได้ทุกอย่าง ยกเว้นตัวเลข/รายงานร้าน และจัดการทีม
let currentMember = null;
const isOwner = () => currentMember?.role === 'owner';
const logEvent = (b, th, en = th) => b.events.push({ at: now(), th, en, by: currentMember ? currentMember.name : undefined });

// ---------- ภาษาแขก: EN เป็นฐาน · อีเมลถึงแขกใช้ภาษาที่แขกใช้ตอนจอง ----------
const LANG_CODES = ['en', 'th', 'zh'];
const cleanLang = (l) => (LANG_CODES.includes(l) ? l : 'en');
const kindText = { deliver: { en: 'delivery', th: 'ส่งรถ', zh: '送车' }, collect: { en: 'collection', th: 'รับรถคืน', zh: '上门取车' } };
const GUEST_MSG = {
  requested: {
    en: (v) => ['Booking request sent', `${v.shop} will confirm soon. Keep this link to check your booking.`],
    th: (v) => ['ส่งคำขอจองแล้ว', `${v.shop} จะยืนยันเร็วๆ นี้ เก็บลิงก์นี้ไว้ดูการจอง`],
    zh: (v) => ['预订请求已发送', `${v.shop} 会尽快确认。请保存此链接查看预订。`],
  },
  confirmed: {
    en: (v) => ['Your booking is confirmed', `${v.shop} confirmed ${v.code}.`],
    th: (v) => ['ร้านยืนยันการจองแล้ว', `${v.shop} ยืนยัน ${v.code} แล้ว`],
    zh: (v) => ['您的预订已确认', `${v.shop} 已确认 ${v.code}。`],
  },
  rejected: {
    en: (v) => ['The shop could not take this booking', v.reason || 'Please try other dates.'],
    th: (v) => ['ร้านรับการจองนี้ไม่ได้', v.reason || 'ลองเลือกวันอื่น'],
    zh: (v) => ['店家无法接受此预订', v.reason || '请尝试其他日期。'],
  },
  agreement: {
    en: () => ['Your rental agreement is ready', 'Review the rules and bike photos, then accept to start your rental.'],
    th: () => ['ใบตกลงพร้อมแล้ว', 'อ่านกติกาและดูรูปรถ แล้วกดยอมรับเพื่อเริ่มเช่า'],
    zh: () => ['租车协议已准备好', '请查看规则和车辆照片，然后接受即可开始租车。'],
  },
  returned: {
    en: () => ['Bike returned', 'Compare the pick-up and return photos on your booking page.'],
    th: () => ['คืนรถแล้ว', 'เทียบรูปตอนรับกับตอนคืนได้ในหน้าการจอง'],
    zh: () => ['已还车', '可在预订页面对比取车和还车时的照片。'],
  },
  closedDamage: {
    en: () => ['Damage recorded on your rental', 'See the photos and the agreed repair price on your booking page.'],
    th: () => ['มีบันทึกความเสียหาย', 'ดูรูปและค่าซ่อมที่ตกลงกันไว้ในหน้าการจอง'],
    zh: () => ['您的租车记录了损坏', '请在预订页面查看照片和约定的维修价格。'],
  },
  closedOk: {
    en: () => ['Rental complete. Thank you!', 'No damage was recorded.'],
    th: () => ['จบการเช่าแล้ว ขอบคุณ', 'ไม่พบความเสียหาย'],
    zh: () => ['租车已完成，谢谢！', '没有记录任何损坏。'],
  },
  message: {
    en: (v) => [`Message from ${v.shop}`, v.text],
    th: (v) => [`ข้อความจาก ${v.shop}`, v.text],
    zh: (v) => [`来自 ${v.shop} 的消息`, v.text],
  },
  runner: {
    en: (v) => ['A runner is assigned', `Your ${kindText[v.kind].en} has a runner.`],
    th: (v) => ['มีคนเดินรถรับงานแล้ว', `งาน${kindText[v.kind].th}ของคุณมีคนรับแล้ว`],
    zh: (v) => ['已安排送车员', `您的${kindText[v.kind].zh}已安排送车员。`],
  },
  onWay: {
    en: () => ['Your bike is on the way', 'The runner has picked up your bike.'],
    th: () => ['รถกำลังไปหาคุณ', 'คนเดินรถรับรถจากร้านแล้ว'],
    zh: () => ['车辆正在送往您处', '送车员已从店里取车。'],
  },
  acceptedOnDevice: {
    en: (v) => ['Rental agreement accepted', `It was accepted on the ${v.who === 'runner' ? 'runner\'s' : 'shop\'s'} phone, not yours. If this was not you, open your booking and tap "I didn’t accept this".`],
    th: (v) => ['ใบตกลงถูกกดยอมรับแล้ว', `กดจากเครื่องของ${v.who === 'runner' ? 'คนเดินรถ' : 'ร้าน'} ไม่ใช่เครื่องคุณ ถ้าคุณไม่ได้กดเอง เปิดหน้าการจองแล้วกด "ฉันไม่ได้กดยอมรับ"`],
    zh: (v) => ['租车协议已被接受', `是在${v.who === 'runner' ? '送车员' : '店家'}的手机上接受的，不是您的手机。如果不是您本人操作，请打开预订页面并点击“不是我接受的”。`],
  },
  shopCancelled: {
    en: (v) => ['The shop cancelled your booking', v.reason || 'The bike is no longer available. Please book another bike.'],
    th: (v) => ['ร้านยกเลิกการจองของคุณ', v.reason || 'รถคันนี้ไม่ว่างแล้ว ลองจองคันอื่น'],
    zh: (v) => ['店家取消了您的预订', v.reason || '这辆车已无法出租，请预订其他车辆。'],
  },
  swapped: {
    en: (v) => ['Your bike has changed', `The shop gave you a ${v.vehicle} instead. ${v.cheaper ? `New lower price: ฿${v.price}/day.` : 'Same price.'}`],
    th: (v) => ['ร้านเปลี่ยนรถให้คุณ', `ร้านเปลี่ยนเป็น ${v.vehicle} ${v.cheaper ? `ราคาลดเป็น ฿${v.price}/วัน` : 'ราคาเดิม'}`],
    zh: (v) => ['您的车辆已更换', `店家为您换成了 ${v.vehicle}。${v.cheaper ? `价格降为 ฿${v.price}/天。` : '价格不变。'}`],
  },
  collected: {
    en: () => ['Bike collected', 'Thanks! Your return photos are on your booking page.'],
    th: () => ['รับรถคืนแล้ว', 'ขอบคุณ ดูรูปตอนคืนได้ในหน้าการจอง'],
    zh: () => ['已取回车辆', '谢谢！还车照片在您的预订页面。'],
  },
};
// x = booking หรือ thread (มี token กับ lang)
function notifyGuest(x, key, vars = {}, link = null) {
  const lang = cleanLang(x.lang);
  const shop = byId(db.shops, x.shopId);
  const v = { shop: lang === 'th' ? shop.name : shop.nameEn, ...vars };
  const [title, body] = (GUEST_MSG[key][lang] || GUEST_MSG[key].en)(v);
  notify('guest', x.token, 'email', title, body, link);
}

// ใบตกลงของร้าน: EN บังคับ ภาษาอื่นเลือกเพิ่มได้
function rulesProblem(r) {
  if (!r || typeof r !== 'object') return 'ไม่มีกติกา';
  if (!r.repairs?.length) return 'ใส่ค่าซ่อมอย่างน้อย 1 รายการ';
  if (r.repairs.some((x) => !String(x.en || '').trim())) return 'ค่าซ่อมทุกรายการต้องมีภาษาอังกฤษ';
  if (!String(r.returnEn || '').trim()) return 'จุดคืนรถต้องมีภาษาอังกฤษ';
  if (!String(r.holdEn || '').trim()) return 'ยึดอะไรไว้ ต้องมีภาษาอังกฤษ';
  return null;
}

const BLOCKING = ['confirmed', 'active', 'returned'];

function busyRanges(vehicleId) {
  const ranges = [];
  for (const b of db.bookings) {
    if (b.vehicleId === vehicleId && BLOCKING.includes(b.status)) ranges.push({ from: b.from, to: b.to, kind: 'booking' });
  }
  for (const k of db.blocks) {
    if (k.vehicleId === vehicleId) ranges.push({ from: k.from, to: k.to, kind: 'block' });
  }
  return ranges;
}
function isFree(vehicle, from, to, exceptBookingId = null) {
  if (vehicle.rentFrom && from < vehicle.rentFrom) return false;
  if (vehicle.rentTo && to > vehicle.rentTo) return false;
  const clashBooking = db.bookings.some((b) => b.id !== exceptBookingId && b.vehicleId === vehicle.id
    && BLOCKING.includes(b.status) && overlaps(from, to, b.from, b.to));
  const clashBlock = db.blocks.some((k) => k.vehicleId === vehicle.id && overlaps(from, to, k.from, k.to));
  return !clashBooking && !clashBlock;
}

const pointOf = (leg) => (leg?.mode === 'point' ? byId(db.points, leg.pointId) : null);

function fullJob(j) {
  const b = byId(db.bookings, j.bookingId);
  return {
    ...j,
    point: byId(db.points, j.pointId),
    runner: j.runnerId ? byId(db.runners, j.runnerId) : null,
    shop: byId(db.shops, j.shopId),
    vehicle: byId(db.vehicles, b.vehicleId),
    booking: { id: b.id, code: b.code, status: b.status, token: b.token, guest: b.guest, lang: b.lang, from: b.from, to: b.to, agreement: b.agreement, pickup: b.pickup, dropoff: b.dropoff },
    handoffs: db.handoffs.filter((h) => h.bookingId === b.id),
  };
}
function fullBooking(b) {
  const thread = b.threadId ? byId(db.threads, b.threadId) : null;
  const shop = byId(db.shops, b.shopId);
  return {
    ...b,
    vehicle: byId(db.vehicles, b.vehicleId),
    shop: { id: shop.id, slug: shop.slug, name: shop.name, nameEn: shop.nameEn, area: shop.area, areaEn: shop.areaEn, phone: shop.phone, rules: shop.rules },
    pickupPoint: pointOf(b.pickup),
    dropoffPoint: pointOf(b.dropoff),
    jobs: db.jobs.filter((j) => j.bookingId === b.id).map((j) => ({ ...j, point: byId(db.points, j.pointId), runner: j.runnerId ? byId(db.runners, j.runnerId) : null })),
    handoffs: db.handoffs.filter((h) => h.bookingId === b.id),
    thread,
  };
}
function publicShop(shop) {
  return {
    id: shop.id, slug: shop.slug, name: shop.name, nameEn: shop.nameEn, area: shop.area, areaEn: shop.areaEn,
    aboutTh: shop.aboutTh, aboutEn: shop.aboutEn, rules: shop.rules, status: shop.status, mapX: shop.mapX, mapY: shop.mapY,
    vehicles: db.vehicles.filter((v) => v.shopId === shop.id && v.active).map((v) => ({ ...v, busy: busyRanges(v.id) })),
    // ส่งรถถึงจุด (คนเดินรถ) ปิดไว้ = ไม่ส่งจุดรับส่งให้หน้าแขกเลย · รับ-คืนที่ร้านอย่างเดียว
    deliveryOn: !!db.config.runnerEnabled,
    points: db.config.runnerEnabled ? db.points.filter((p) => p.active) : [],
    spots: db.spots.filter((s) => s.permitted && s.visibility === 'public'),
  };
}

function analytics(shopId, days = 30) {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const dates = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(iso(d));
  }
  const first = dates[0];
  const last = dates[dates.length - 1];
  const vehicles = db.vehicles.filter((v) => v.shopId === shopId);
  const bookings = db.bookings.filter((b) => b.shopId === shopId && ['active', 'returned', 'completed'].includes(b.status) && overlaps(first, last, b.from, b.to));
  const perDay = dates.map((date) => ({ date, out: 0 }));

  const perVehicle = vehicles.map((v) => {
    let rentedDays = 0;
    let revenue = 0;
    let availableDays = 0;
    dates.forEach((date, i) => {
      const inWindow = (!v.rentFrom || date >= v.rentFrom) && (!v.rentTo || date <= v.rentTo);
      const blocked = db.blocks.some((k) => k.vehicleId === v.id && date >= k.from && date <= k.to);
      if (inWindow && !blocked) availableDays += 1;
      // เช่าวันเดียว (from = to) นับเป็น 1 วันที่รถออก
      const hit = bookings.find((b) => b.vehicleId === v.id && date >= b.from && (date < b.to || date === b.from));
      if (hit) {
        rentedDays += 1;
        revenue += hit.pricePerDay;
        perDay[i].out += 1;
      }
    });
    return {
      vehicleId: v.id, name: v.name, plate: v.plate, color: v.color, rentedDays, availableDays, revenue,
      utilization: availableDays ? rentedDays / availableDays : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const online = bookings.filter((b) => b.source === 'online');
  const walkin = bookings.filter((b) => b.source === 'walkin');
  const rentedDays = perVehicle.reduce((s, v) => s + v.rentedDays, 0);
  const availableDays = perVehicle.reduce((s, v) => s + v.availableDays, 0);
  return {
    days, perVehicle, perDay,
    totals: {
      bookings: bookings.length, rentedDays, availableDays,
      utilization: availableDays ? rentedDays / availableDays : 0,
      revenue: perVehicle.reduce((s, v) => s + v.revenue, 0),
      online: online.length, walkin: walkin.length,
      withDelivery: bookings.filter((b) => b.pickup.mode === 'point' || b.dropoff.mode === 'point').length,
      avgDays: bookings.length ? bookings.reduce((s, b) => s + b.days, 0) / bookings.length : 0,
      // ความเสี่ยงของการยืนยันอัตโนมัติ: ร้านต้องยกเลิก/เปลี่ยนรถบ่อยแค่ไหน
      ...(() => {
        const recent = db.bookings.filter((b) => b.shopId === shopId && b.createdAt.slice(0, 10) >= first);
        return {
          autoConfirmed: recent.filter((b) => b.confirmedBy === 'auto').length,
          shopCancelled: recent.filter((b) => b.cancelledBy === 'shop').length,
          swapped: recent.filter((b) => b.swappedFrom).length,
        };
      })(),
    },
  };
}

// รูปแขก: jpeg/png ที่ย่อแล้ว (ไม่เกิน ~300KB) หรือรูปจำลองในเดโม่ · จดว่าถ่ายจากกล้องสดหรือเลือกไฟล์
function cleanSelfie(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.simulated) return { simulated: true, takenAt: now() };
  if (typeof s.dataUrl === 'string' && /^data:image\/(jpeg|png);base64,/.test(s.dataUrl) && s.dataUrl.length < 400000) return { dataUrl: s.dataUrl, takenAt: now(), source: s.source === 'camera' ? 'camera' : 'file' };
  return null;
}
function cleanPhotos(photos) {
  need(Array.isArray(photos) && photos.length >= 4, 400, 'ต้องมีรูปครบ 4 ด้าน');
  return photos.map((p) => ({ angle: p.angle, damage: p.damage || null, takenAt: now() }));
}
function addHandoff(b, stage, by, byName, body) {
  const h = {
    id: uid('h'), bookingId: b.id, stage, by, byName, fuel: body.fuel || 'full',
    note: body.note || '', photos: cleanPhotos(body.photos), at: now(),
  };
  db.handoffs.push(h);
  return h;
}
function readyAgreement(b, handoff) {
  const shop = byId(db.shops, b.shopId);
  b.agreement = { status: 'ready', sentAt: now(), rules: shop.rules, handoffId: handoff.id };
  notifyGuest(b, 'agreement', {}, `/b/${b.token}/agreement`);
}
function makeJobs(b) {
  const add = (kind, leg, date, time) => db.jobs.push({
    id: uid('j'), bookingId: b.id, shopId: b.shopId, kind, status: 'open', runnerId: null, pointId: leg.pointId,
    date, time, createdAt: now(), shopConfirmedAt: null,
  });
  if (b.pickup.mode === 'point') add('deliver', b.pickup, b.from, b.pickupTime);
  if (b.dropoff.mode === 'point') add('collect', b.dropoff, b.to, b.returnTime);
  if (b.pickup.mode === 'point' || b.dropoff.mode === 'point') {
    notify('runner', null, 'LINE', 'มีงานรับส่งใหม่', `${byId(db.vehicles, b.vehicleId).name} · ${pointOf(b.pickup.mode === 'point' ? b.pickup : b.dropoff).name}`);
  }
}
function threadFor(shopId, guestName, bookingId = null, lang = 'en') {
  const t = { id: uid('t'), token: uid('tk'), shopId, guestName: guestName || 'Guest', bookingId, lang: cleanLang(lang), unreadShop: 0, unreadGuest: 0, messages: [] };
  db.threads.push(t);
  return t;
}

// ---------- routes ----------
const routes = [];
const route = (method, path, handler) => {
  const keys = [];
  const regex = new RegExp(`^${path.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, regex, keys, handler });
};

route('GET', '/api/meta', () => ({
  lanIp: LAN_IP, defaultSlug: db.shops[0].slug, autoConfirmMin: AUTO_CONFIRM_MIN, fee: { pct: db.config.feePct, trialUntil: db.config.trialUntil },
  runnerEnabled: !!db.config.runnerEnabled,
  ports: { hub: 4100, tooktale: 4101, partner: 4102, runner: 4103, admin: 4104, api: PORT },
}));

// ----- แขก -----
route('GET', '/api/shops/:slug', ({ p }) => {
  const shop = db.shops.find((s) => s.slug === p.slug);
  need(shop, 404, 'ไม่พบร้าน');
  return publicShop(shop);
});

route('POST', '/api/bookings', ({ body }) => {
  const shop = db.shops.find((s) => s.slug === body.shopSlug);
  const vehicle = byId(db.vehicles, body.vehicleId);
  need(shop && vehicle && vehicle.shopId === shop.id, 404, 'ไม่พบรถ');
  need(body.from && body.to && body.from <= body.to, 400, 'วันรับ-คืนไม่ถูกต้อง');
  need(body.from !== body.to || (body.returnTime || '17:00') > (body.pickupTime || '10:00'), 400, 'เช่าวันเดียว เวลาคืนต้องหลังเวลารับ');
  need(body.guest?.name && body.guest?.email && body.guest?.whatsapp, 400, 'กรอกชื่อ อีเมล และ WhatsApp ให้ครบ');
  need(db.config.runnerEnabled || (body.pickup?.mode !== 'point' && body.dropoff?.mode !== 'point'), 400, 'Delivery is paused. Please pick up and return at the shop.');
  need(isFree(vehicle, body.from, body.to), 409, 'รถคันนี้ไม่ว่างในวันที่เลือก');
  const pickup = body.pickup?.mode === 'point' ? { mode: 'point', pointId: body.pickup.pointId } : { mode: 'shop' };
  const dropoff = body.dropoff?.mode === 'point' ? { mode: 'point', pointId: body.dropoff.pointId } : { mode: 'shop' };
  const fee = (leg) => pointOf(leg)?.fee || 0;
  db.seq += 1;
  const days = diffDays(body.from, body.to);
  const b = {
    id: `b${db.seq}`, code: `TT-${db.seq}`, token: uid('tk'), shopId: shop.id, vehicleId: vehicle.id,
    from: body.from, to: body.to, pickupTime: body.pickupTime || '10:00', returnTime: body.returnTime || '17:00',
    guest: body.guest, lang: cleanLang(body.lang), pickup, dropoff, source: 'online', status: 'requested', days,
    pricePerDay: vehicle.pricePerDay, rentTotal: days * vehicle.pricePerDay, deliveryFee: fee(pickup) + fee(dropoff),
    createdAt: now(), autoConfirmAt: new Date(Date.now() + AUTO_CONFIRM_MIN * 60000).toISOString(), threadId: null, agreement: { status: 'none' }, damage: null, closedAt: null, events: [],
  };
  let thread = body.threadToken ? db.threads.find((t) => t.token === body.threadToken && t.shopId === shop.id) : null;
  if (thread) {
    thread.guestName = body.guest.name;
    thread.bookingId = b.id;
    thread.lang = b.lang;
  } else {
    thread = threadFor(shop.id, body.guest.name, b.id, b.lang);
  }
  b.threadId = thread.id;
  stampFee(b);
  logEvent(b, 'แขกส่งคำขอจอง', 'Booking requested');
  db.bookings.push(b);
  notify('shop', shop.id, 'LINE', 'มีคำขอจองใหม่', `${b.guest.name} · ${vehicle.name} · ${days} วัน · ไม่ตอบใน ${AUTO_CONFIRM_MIN} นาที = รับอัตโนมัติ`, `/booking/${b.id}`);
  notifyGuest(b, 'requested', {}, `/b/${b.token}`);
  changed();
  return { token: b.token, id: b.id, code: b.code };
});

const bookingByToken = (token) => {
  const b = db.bookings.find((x) => x.token === token);
  need(b, 404, 'ไม่พบการจอง');
  return b;
};

route('GET', '/api/b/:token', ({ p }) => {
  const b = bookingByToken(p.token);
  const full = fullBooking(b);
  if (full.thread) full.thread.unreadGuest = 0;
  return { ...full, spots: db.spots.filter((s) => s.permitted) };
});

route('POST', '/api/b/:token/accept', ({ p, body }) => {
  const b = bookingByToken(p.token);
  need(b.agreement.status === 'ready', 409, 'ใบตกลงยังไม่พร้อม');
  const on = ['guest_phone', 'shop_phone', 'runner_phone'].includes(body.on) ? body.on : 'guest_phone';
  // กดบนเครื่องร้าน/คนเดินรถ ต้องมีรูปแขก ถ่ายจากกล้องไหนก็ได้ (decisions/agreement-device-2026-11-09)
  const selfie = on === 'guest_phone' ? null : cleanSelfie(body.selfie);
  need(on === 'guest_phone' || selfie, 400, 'ต้องมีรูปแขกก่อนกดยอมรับบนเครื่องนี้');
  b.agreement = { ...b.agreement, status: 'accepted', acceptedAt: now(), acceptedOn: on, acceptedLang: cleanLang(body.lang), selfie };
  b.status = 'active';
  const where = { guest_phone: 'มือถือแขก', shop_phone: 'เครื่องร้าน', runner_phone: 'เครื่องคนเดินรถ' }[on];
  logEvent(b, `แขกกดยอมรับใบตกลง (${where}) เริ่มเช่า`, `Agreement accepted on the ${on.replace('_phone', '')}'s phone. Rental started.`);
  notify('shop', b.shopId, 'LINE', 'แขกกดยอมรับใบตกลงแล้ว', `${b.guest.name} · ${b.code} เริ่มเช่าแล้ว · กดจาก${where}`, `/booking/${b.id}`);
  const job = db.jobs.find((j) => j.bookingId === b.id && j.kind === 'deliver');
  if (job?.runnerId) notify('runner', job.runnerId, 'LINE', 'แขกกดยอมรับแล้ว', `${b.code} งานส่งเสร็จสมบูรณ์`, `/job/${job.id}`);
  // กดจากเครื่องร้าน/คนเดินรถ → แจ้งแขกทันที กันร้านกดแทนโดยแขกไม่รู้
  if (on !== 'guest_phone') notifyGuest(b, 'acceptedOnDevice', { who: on === 'runner_phone' ? 'runner' : 'shop' }, `/b/${b.token}`);
  changed();
  return { ok: true };
});

// แขกแจ้งว่าไม่ได้กดยอมรับเอง → แค่บันทึกและแสดงไว้ เผื่อมีเรื่องทีหลัง (ไม่แจ้งใคร ไม่มีใครต้องตามต่อ)
route('POST', '/api/b/:token/not-me', ({ p }) => {
  const b = bookingByToken(p.token);
  need(b.agreement.status === 'accepted' && b.agreement.acceptedOn !== 'guest_phone', 409, 'แจ้งได้เฉพาะใบตกลงที่กดจากเครื่องอื่น');
  // แจ้งได้จนถึงตอนคืนรถ: ค่าซ่อมรู้หลังคืนรถเสมอ จึงใช้ปุ่มนี้หนีค่าซ่อมไม่ได้
  need(b.status === 'active' || b.agreement.guestDisputedAt, 409, 'แจ้งได้จนถึงตอนคืนรถ ตอนนี้ปิดแล้ว');
  if (!b.agreement.guestDisputedAt) {
    b.agreement.guestDisputedAt = now();
    logEvent(b, '⚠️ แขกแจ้งว่าไม่ได้กดยอมรับใบตกลงเอง', 'Guest reported they did not accept the agreement');
    changed();
  }
  return { ok: true };
});

route('POST', '/api/b/:token/cancel', ({ p }) => {
  const b = bookingByToken(p.token);
  need(['requested', 'confirmed'].includes(b.status), 409, 'ยกเลิกไม่ได้แล้ว');
  b.status = 'cancelled';
  db.jobs = db.jobs.filter((j) => j.bookingId !== b.id);
  logEvent(b, 'แขกยกเลิก', 'Cancelled by guest');
  notify('shop', b.shopId, 'LINE', 'แขกยกเลิกการจอง', `${b.guest.name} · ${b.code}`, `/booking/${b.id}`);
  changed();
  return { ok: true };
});

route('POST', '/api/threads', ({ body }) => {
  const shop = db.shops.find((s) => s.slug === body.shopSlug);
  need(shop, 404, 'ไม่พบร้าน');
  const t = threadFor(shop.id, body.guestName, null, body.lang);
  changed();
  return { token: t.token };
});
route('GET', '/api/threads/:token', ({ p }) => {
  const t = db.threads.find((x) => x.token === p.token);
  need(t, 404, 'ไม่พบบทสนทนา');
  t.unreadGuest = 0;
  return t;
});
route('POST', '/api/threads/:token/messages', ({ p, body }) => {
  const t = db.threads.find((x) => x.token === p.token);
  need(t, 404, 'ไม่พบบทสนทนา');
  need(body.text?.trim(), 400, 'พิมพ์ข้อความก่อน');
  t.messages.push({ id: uid('m'), from: 'guest', text: body.text.trim(), at: now() });
  t.unreadShop += 1;
  notify('shop', t.shopId, 'LINE', `ข้อความจาก ${t.guestName}`, body.text.trim().slice(0, 80), `/chat/${t.id}`);
  changed();
  return t;
});

// ----- ร้าน -----
// บัญชี LINE จำลอง = คน ไม่ใช่ร้าน · 1 ร้านมีได้หลายคน
const ROLE_TH = { owner: 'เจ้าของร้าน', admin: 'แอดมิน' };
const memberView = (m) => ({ ...m, roleTh: ROLE_TH[m.role] });
route('GET', '/api/partner/accounts', () => db.members
  .filter((m) => m.active && byId(db.shops, m.shopId)?.status === 'active')
  .map((m) => { const s = byId(db.shops, m.shopId); return { ...memberView(m), shopName: s.name, area: s.area }; }));

function partnerShop(id) {
  const shop = byId(db.shops, id);
  need(shop, 404, 'ไม่พบร้าน');
  // ล็อกอินเป็นคนของร้านอื่น = ห้าม
  need(!currentMember || currentMember.shopId === shop.id, 403, 'บัญชีนี้ไม่ใช่ทีมงานของร้านนี้');
  return shop;
}
const ownerOnly = (what) => need(isOwner(), 403, `${what}: เฉพาะเจ้าของร้าน`);

route('GET', '/api/partner/:id/overview', ({ p }) => {
  const shop = partnerShop(p.id);
  const vehicles = db.vehicles.filter((v) => v.shopId === shop.id);
  return {
    shop, vehicles, points: db.points.filter((x) => x.active),
    blocks: db.blocks.filter((k) => vehicles.some((v) => v.id === k.vehicleId)),
    bookings: db.bookings.filter((b) => b.shopId === shop.id).map(fullBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    threads: db.threads.filter((t) => t.shopId === shop.id),
    me: currentMember ? memberView(currentMember) : null,
    // ตัวเลข/รายงานร้าน: เฉพาะเจ้าของร้าน
    analytics: isOwner() ? analytics(shop.id) : null,
  };
});

// ---------- ค่าธรรมเนียมผู้เช่า + ใบแจ้งยอดรายเดือน (decisions/guest-fee-billing-2026-11-09) ----------
// แขกจ่ายราคาร้าน + ค่าธรรมเนียม tooktale เป็นเงินสดที่ร้าน · ร้านเก็บแทน แล้วโอนให้ nakola ตามใบแจ้งยอด
// 0% จากร้าน (ร้านได้ 100% ของราคาตัวเอง) · walk-in ไม่เก็บ · จองช่วงทดลองไม่เก็บ · คิดจากค่าเช่าเท่านั้น ไม่รวมค่าส่ง
const BANK = { bank: 'ธนาคารตัวอย่าง', name: 'บริษัท nakola จำกัด (ตัวอย่าง)', number: '000-0-00000-0' };
const feeFor = (b) => (b.feePct ? Math.round((b.rentTotal * b.feePct) / 100) : 0);
function stampFee(b) {
  b.feePct = b.source === 'online' && b.createdAt.slice(0, 10) > db.config.trialUntil ? db.config.feePct : 0;
  b.fee = feeFor(b);
}
const thisMonth = () => iso(new Date()).slice(0, 7);
const nextMonth = (p) => {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
// รอบบิล = เดือนที่คืนรถ (เช่าจบแล้วเท่านั้น) · ปิดรอบสิ้นเดือน · ครบกำหนดโอนวันที่ 10 เดือนถัดไป
function statementsFor(shopId) {
  const billable = db.bookings.filter((b) => b.shopId === shopId && b.status === 'completed' && b.fee > 0);
  const upcoming = db.bookings.filter((b) => b.shopId === shopId && ['confirmed', 'active', 'returned'].includes(b.status) && b.fee > 0);
  const periods = [...new Set([...billable.map((b) => b.to.slice(0, 7)), thisMonth()])].sort().reverse();
  return periods.map((period) => {
    const items = billable.filter((b) => b.to.slice(0, 7) === period)
      .sort((a, b) => a.to.localeCompare(b.to))
      .map((b) => ({ id: b.id, code: b.code, guest: b.guest.name, from: b.from, to: b.to, rentTotal: b.rentTotal, feePct: b.feePct, fee: b.fee }));
    const total = items.reduce((s, i) => s + i.fee, 0);
    const rec = db.billing.find((x) => x.shopId === shopId && x.period === period) || {};
    const closed = period < thisMonth();
    const due = `${nextMonth(period)}-10`;
    let status = rec.status;
    if (!closed) status = 'open';
    else if (!total) status = 'nothing';
    else if (!status) status = iso(new Date()) > due ? 'overdue' : 'unpaid';
    return {
      period, items, total, closed, due, status,
      upcomingFee: closed ? 0 : upcoming.reduce((s, b) => s + b.fee, 0),
      reportedAt: rec.reportedAt, reportedBy: rec.reportedBy, slip: rec.slip, paidAt: rec.paidAt, sentAt: rec.sentAt,
    };
  });
}
const billingRec = (shopId, period) => {
  let rec = db.billing.find((x) => x.shopId === shopId && x.period === period);
  if (!rec) { rec = { shopId, period }; db.billing.push(rec); }
  return rec;
};

// ใบแจ้งยอด: เจ้าของร้านเท่านั้น (แอดมินร้านไม่เห็น)
route('GET', '/api/partner/:id/billing', ({ p }) => {
  const shop = partnerShop(p.id);
  ownerOnly('ใบแจ้งยอดค่าธรรมเนียม');
  return { statements: statementsFor(shop.id), bank: BANK, feePct: db.config.feePct, trialUntil: db.config.trialUntil };
});
route('POST', '/api/partner/:id/billing/:period/report', ({ p, body }) => {
  const shop = partnerShop(p.id);
  ownerOnly('แจ้งโอน');
  const st = statementsFor(shop.id).find((s) => s.period === p.period);
  need(st && ['unpaid', 'overdue'].includes(st.status), 409, 'รอบนี้แจ้งโอนไม่ได้');
  const rec = billingRec(shop.id, p.period);
  Object.assign(rec, { status: 'reported', reportedAt: now(), reportedBy: currentMember.name, slip: cleanSelfie(body.slip) });
  changed();
  return { ok: true };
});

route('GET', '/api/admin/billing', () => ({
  config: db.config,
  bank: BANK,
  statements: db.shops.filter((s) => s.status === 'active').flatMap((s) => statementsFor(s.id).map((st) => ({ ...st, shopId: s.id, shopName: s.name, owner: db.members.find((m) => m.shopId === s.id && m.role === 'owner' && m.active)?.name || '-' }))),
}));
// ส่งใบแจ้งยอดให้เจ้าของร้าน (ข้อความ LINE เห็นเฉพาะเจ้าของ)
route('POST', '/api/admin/billing/:shopId/:period/send', ({ p }) => {
  const st = statementsFor(p.shopId).find((s) => s.period === p.period);
  need(st && st.closed && st.total > 0, 409, 'ยังไม่มียอดให้ส่ง');
  billingRec(p.shopId, p.period).sentAt = now();
  notify('shop', p.shopId, 'LINE', `ใบแจ้งยอดค่าธรรมเนียม ${p.period}`, `฿${st.total.toLocaleString('en-US')} · ${st.items.length} การจอง · โอนภายใน ${st.due}`, '/billing', { ownerOnly: true });
  changed();
  return { ok: true };
});
route('POST', '/api/admin/billing/:shopId/:period/paid', ({ p }) => {
  const st = statementsFor(p.shopId).find((s) => s.period === p.period);
  need(st && ['unpaid', 'overdue', 'reported'].includes(st.status), 409, 'รอบนี้ยืนยันไม่ได้');
  Object.assign(billingRec(p.shopId, p.period), { status: 'paid', paidAt: now() });
  notify('shop', p.shopId, 'LINE', `ได้รับเงินแล้ว รอบ ${p.period}`, `฿${st.total.toLocaleString('en-US')} · ขอบคุณครับ`, '/billing', { ownerOnly: true });
  changed();
  return { ok: true };
});
route('PATCH', '/api/admin/config', ({ body }) => {
  if (body.feePct !== undefined) {
    const v = Number(body.feePct);
    need(Number.isFinite(v) && v >= 0 && v <= 30, 400, 'ค่าธรรมเนียมต้องอยู่ระหว่าง 0–30%');
    db.config.feePct = v;
  }
  if (body.trialUntil !== undefined) {
    need(/^\d{4}-\d{2}-\d{2}$/.test(body.trialUntil), 400, 'วันที่ไม่ถูกต้อง');
    db.config.trialUntil = body.trialUntil;
  }
  // บริการส่งรถถึงจุด (คนเดินรถ): ปิดไว้จนกว่าจะมี payment gateway (decisions/runner-paused-2026-11-09)
  if (body.runnerEnabled !== undefined) db.config.runnerEnabled = !!body.runnerEnabled;
  changed();
  return db.config;
});

// ---------- ทีมงานร้าน ----------
route('GET', '/api/partner/:id/members', ({ p }) => {
  const shop = partnerShop(p.id);
  need(currentMember, 401, 'ต้องเข้าสู่ระบบ');
  return {
    members: db.members.filter((m) => m.shopId === shop.id && m.active).map(memberView),
    invites: isOwner() ? db.invites.filter((i) => i.shopId === shop.id && !i.usedBy) : [],
  };
});
route('POST', '/api/partner/:id/invites', ({ p }) => {
  const shop = partnerShop(p.id);
  ownerOnly('เชิญแอดมิน');
  const inv = { code: uid('inv'), shopId: shop.id, createdBy: currentMember.id, createdAt: now(), usedBy: null };
  db.invites.push(inv);
  changed();
  return inv;
});
route('POST', '/api/partner/:id/members/:mid/remove', ({ p }) => {
  const shop = partnerShop(p.id);
  ownerOnly('ลบแอดมิน');
  const m = db.members.find((x) => x.id === p.mid && x.shopId === shop.id && x.active);
  need(m, 404, 'ไม่พบทีมงาน');
  need(m.role !== 'owner', 409, 'ลบเจ้าของร้านไม่ได้');
  m.active = false;
  m.removedAt = now();
  changed();
  return { ok: true };
});
// รับคำเชิญ: คนที่ได้ลิงก์ล็อกอิน LINE แล้วกลายเป็นแอดมินของร้าน
route('GET', '/api/join/:code', ({ p }) => {
  const inv = db.invites.find((i) => i.code === p.code);
  need(inv && !inv.usedBy, 404, 'ลิงก์เชิญใช้ไม่ได้แล้ว');
  const shop = byId(db.shops, inv.shopId);
  return { shopName: shop.name, area: shop.area, invitedBy: byId(db.members, inv.createdBy)?.name };
});
route('POST', '/api/join/:code', ({ p, body }) => {
  const inv = db.invites.find((i) => i.code === p.code);
  need(inv && !inv.usedBy, 404, 'ลิงก์เชิญใช้ไม่ได้แล้ว');
  const name = String(body.name || '').trim();
  need(name, 400, 'ใส่ชื่อ');
  const m = { id: uid('m'), shopId: inv.shopId, name, lineName: name, role: 'admin', active: true, addedAt: now(), addedBy: inv.createdBy };
  db.members.push(m);
  inv.usedBy = m.id;
  notify('shop', inv.shopId, 'LINE', 'มีแอดมินใหม่', `${name} เข้าร่วมทีมร้านแล้ว`, '/team');
  changed();
  return memberView(m);
});

route('PATCH', '/api/partner/:id', ({ p, body }) => {
  const shop = partnerShop(p.id);
  if (body.rules !== undefined) {
    const problem = rulesProblem(body.rules);
    need(!problem, 400, problem);
    body.rules = { ...body.rules, langs: ['en', ...(body.rules.langs || []).filter((l) => l !== 'en' && LANG_CODES.includes(l))] };
  }
  for (const k of ['name', 'nameEn', 'area', 'areaEn', 'aboutTh', 'aboutEn', 'phone', 'rules']) {
    if (body[k] !== undefined) shop[k] = body[k];
  }
  changed();
  return shop;
});

route('POST', '/api/partner/:id/vehicles', ({ p, body }) => {
  const shop = partnerShop(p.id);
  need(body.name && body.pricePerDay, 400, 'กรอกชื่อรุ่นและราคา');
  const v = {
    id: uid('v'), shopId: shop.id, name: body.name, plate: body.plate || '-', color: body.color || '#2B2F33',
    colorName: body.colorName || '-', colorNameEn: body.colorNameEn || '-', pricePerDay: Number(body.pricePerDay),
    gear: body.gear || 'auto', cc: Number(body.cc) || 125, rentFrom: body.rentFrom || null, rentTo: body.rentTo || null,
    active: true, oldMark: null,
  };
  db.vehicles.push(v);
  changed();
  return v;
});

route('PATCH', '/api/partner/:id/vehicles/:vid', ({ p, body }) => {
  const v = byId(db.vehicles, p.vid);
  need(v && v.shopId === p.id, 404, 'ไม่พบรถ');
  for (const k of ['name', 'plate', 'color', 'colorName', 'colorNameEn', 'gear', 'rentFrom', 'rentTo', 'active']) {
    if (body[k] !== undefined) v[k] = body[k] === '' ? null : body[k];
  }
  if (body.pricePerDay !== undefined) v.pricePerDay = Number(body.pricePerDay);
  changed();
  return v;
});

route('POST', '/api/partner/:id/blocks', ({ p, body }) => {
  const v = byId(db.vehicles, body.vehicleId);
  need(v && v.shopId === p.id, 404, 'ไม่พบรถ');
  need(body.from && body.to && body.from <= body.to, 400, 'วันที่ไม่ถูกต้อง');
  const k = { id: uid('bl'), vehicleId: v.id, from: body.from, to: body.to, reason: body.reason || 'ปิดวัน' };
  db.blocks.push(k);
  changed();
  return k;
});
route('DELETE', '/api/partner/:id/blocks/:bid', ({ p }) => {
  db.blocks = db.blocks.filter((k) => k.id !== p.bid);
  changed();
  return { ok: true };
});

const shopBooking = (shopId, id) => {
  const b = byId(db.bookings, id);
  need(b && b.shopId === shopId, 404, 'ไม่พบการจอง');
  return b;
};

function confirmBooking(b, by) {
  b.status = 'confirmed';
  b.confirmedBy = by;
  b.confirmedAt = now();
  if (by === 'auto') {
    logEvent(b, `ยืนยันอัตโนมัติ (ร้านไม่ตอบใน ${AUTO_CONFIRM_MIN} นาที)`, `Confirmed automatically (no reply in ${AUTO_CONFIRM_MIN} min)`);
    notify('shop', b.shopId, 'LINE', 'ยืนยันอัตโนมัติแล้ว', `${b.code} · ${b.guest.name} — รถไม่ว่างจริง? เปลี่ยนรถหรือยกเลิกได้ในหน้าการจอง`, `/booking/${b.id}`);
  } else {
    logEvent(b, 'ร้านยืนยันการจอง', 'Confirmed by the shop');
  }
  makeJobs(b);
  notifyGuest(b, 'confirmed', { code: b.code }, `/b/${b.token}`);
}

// ร้านไม่ปฏิเสธภายในเวลา = ยืนยันให้เอง · ถ้ารถถูกจองไปแล้วจริงๆ (ชนกับการจองที่ยืนยันแล้ว) = ปฏิเสธให้แทน
function sweepAutoConfirm() {
  const due = db.bookings.filter((b) => b.status === 'requested' && b.autoConfirmAt && b.autoConfirmAt <= now());
  for (const b of due) {
    if (isFree(byId(db.vehicles, b.vehicleId), b.from, b.to, b.id)) {
      confirmBooking(b, 'auto');
    } else {
      b.status = 'rejected';
      b.rejectReason = '';
      logEvent(b, 'ปฏิเสธอัตโนมัติ รถไม่ว่างแล้ว', 'Declined automatically: bike no longer free');
      notifyGuest(b, 'rejected', {}, `/b/${b.token}`);
    }
  }
  if (due.length) changed();
}
setInterval(sweepAutoConfirm, 5000);

// เดโม่: ข้ามเวลารอ ให้เห็นการยืนยันอัตโนมัติโดยไม่ต้องรอจริง
route('POST', '/api/demo/bookings/:bid/skip-wait', ({ p }) => {
  const b = byId(db.bookings, p.bid);
  need(b && b.status === 'requested', 409, 'การจองนี้ไม่ได้รอร้านแล้ว');
  b.autoConfirmAt = now();
  sweepAutoConfirm();
  return { ok: true, status: b.status };
});

// ร้านยกเลิกหลังยืนยันแล้ว: เช่น รถถูกจองนอกระบบ · ทำได้จนกว่าจะส่งมอบรถ
route('POST', '/api/partner/:id/bookings/:bid/cancel', ({ p, body }) => {
  const b = shopBooking(p.id, p.bid);
  need(b.status === 'confirmed' && b.agreement.status === 'none' && !db.handoffs.some((h) => h.bookingId === b.id), 409, 'ยกเลิกได้เฉพาะก่อนส่งมอบรถ');
  b.status = 'cancelled';
  b.cancelledBy = 'shop';
  b.cancelReason = String(body.reason || '').trim();
  for (const j of db.jobs.filter((x) => x.bookingId === b.id && x.runnerId)) {
    notify('runner', j.runnerId, 'LINE', 'งานถูกยกเลิก', `${b.code} ร้านยกเลิกการจอง`, null);
  }
  db.jobs = db.jobs.filter((j) => j.bookingId !== b.id);
  logEvent(b, `ร้านยกเลิก${b.cancelReason ? `: ${b.cancelReason}` : ''}`, 'Cancelled by the shop');
  notifyGuest(b, 'shopCancelled', { reason: b.cancelReason }, `/b/${b.token}`);
  changed();
  return { ok: true };
});

// ร้านเปลี่ยนรถให้แขก (ก่อนส่งมอบ หรือตอนแขกมาถึงร้านแล้ว) · ราคาขึ้นไม่ได้: ได้ราคาที่ถูกกว่าระหว่างเดิมกับคันใหม่
const swapOptions = (b) => db.vehicles
  .filter((v) => v.shopId === b.shopId && v.active && v.id !== b.vehicleId)
  .map((v) => ({ ...v, free: isFree(v, b.from, b.to, b.id), newPrice: Math.min(b.pricePerDay, v.pricePerDay) }));
const canSwap = (b) => ['requested', 'confirmed'].includes(b.status) && b.agreement.status === 'none' && !db.handoffs.some((h) => h.bookingId === b.id);
route('GET', '/api/partner/:id/bookings/:bid/swap-options', ({ p }) => {
  const b = shopBooking(p.id, p.bid);
  return swapOptions(b);
});
route('POST', '/api/partner/:id/bookings/:bid/vehicle', ({ p, body }) => {
  const b = shopBooking(p.id, p.bid);
  need(canSwap(b), 409, 'เปลี่ยนรถได้เฉพาะก่อนส่งมอบรถ');
  const v = byId(db.vehicles, body.vehicleId);
  need(v && v.shopId === b.shopId && v.id !== b.vehicleId, 404, 'ไม่พบรถ');
  need(isFree(v, b.from, b.to, b.id), 409, 'รถคันนี้ไม่ว่างในวันที่จอง');
  const old = byId(db.vehicles, b.vehicleId);
  const oldPrice = b.pricePerDay;
  b.vehicleId = v.id;
  b.pricePerDay = Math.min(oldPrice, v.pricePerDay);
  b.rentTotal = b.days * b.pricePerDay;
  b.fee = feeFor(b); // ค่าธรรมเนียมตามค่าเช่าใหม่ (ลดลงได้อย่างเดียว เหมือนราคา)
  // จำคันที่แขกจองไว้ตอนแรก (เปลี่ยนกี่รอบก็เทียบกับคันแรก)
  if (!b.swappedFrom) b.swappedFrom = { name: old.name, plate: old.plate, pricePerDay: oldPrice };
  logEvent(b, `ร้านเปลี่ยนรถ ${old.name} (${old.plate}) → ${v.name} (${v.plate}) · ฿${b.pricePerDay}/วัน`, `Bike changed to ${v.name}`);
  notifyGuest(b, 'swapped', { vehicle: v.name, cheaper: b.pricePerDay < oldPrice, price: b.pricePerDay }, `/b/${b.token}`);
  changed();
  return { ok: true, pricePerDay: b.pricePerDay };
});

route('POST', '/api/partner/:id/bookings/:bid/decision', ({ p, body }) => {
  const b = shopBooking(p.id, p.bid);
  need(b.status === 'requested', 409, 'คำขอนี้ตอบไปแล้ว');
  if (body.accept) {
    need(isFree(byId(db.vehicles, b.vehicleId), b.from, b.to, b.id), 409, 'รถคันนี้ไม่ว่างแล้วในวันที่ขอ');
    confirmBooking(b, 'shop');
  } else {
    b.status = 'rejected';
    b.rejectReason = body.reason || '';
    logEvent(b, 'ร้านปฏิเสธคำขอ', 'Declined by the shop');
    notifyGuest(b, 'rejected', { reason: body.reason }, `/b/${b.token}`);
  }
  changed();
  return { ok: true };
});

route('POST', '/api/partner/:id/walkin', ({ p, body }) => {
  const shop = partnerShop(p.id);
  const vehicle = byId(db.vehicles, body.vehicleId);
  need(vehicle && vehicle.shopId === shop.id, 404, 'ไม่พบรถ');
  need(body.from && body.to && body.from <= body.to, 400, 'วันรับ-คืนไม่ถูกต้อง');
  need(body.guest?.name, 400, 'กรอกชื่อแขก');
  need(isFree(vehicle, body.from, body.to), 409, 'รถคันนี้ไม่ว่างในวันที่เลือก');
  db.seq += 1;
  const days = diffDays(body.from, body.to);
  const b = {
    id: `b${db.seq}`, code: `TT-${db.seq}`, token: uid('tk'), shopId: shop.id, vehicleId: vehicle.id,
    from: body.from, to: body.to, pickupTime: '-', returnTime: '17:00',
    guest: { email: '', whatsapp: '', license: '', country: '', ...body.guest }, pickup: { mode: 'shop' }, dropoff: { mode: 'shop' },
    source: 'walkin', status: 'confirmed', days, pricePerDay: vehicle.pricePerDay, rentTotal: days * vehicle.pricePerDay,
    deliveryFee: 0, createdAt: now(), threadId: null, agreement: { status: 'none' }, damage: null, closedAt: null, events: [],
  };
  logEvent(b, 'ร้านคีย์ walk-in', 'Walk-in entered by the shop');
  stampFee(b);
  db.bookings.push(b);
  changed();
  return { id: b.id };
});

route('POST', '/api/partner/:id/bookings/:bid/handoff', ({ p, body }) => {
  const b = shopBooking(p.id, p.bid);
  if (body.stage === 'to_guest') {
    need(b.status === 'confirmed' && b.pickup.mode === 'shop', 409, 'ส่งมอบที่ร้านไม่ได้ในสถานะนี้');
    need(b.agreement.status !== 'ready', 409, 'ส่งใบตกลงไปแล้ว');
    const h = addHandoff(b, 'to_guest', 'shop', 'ร้าน', body);
    logEvent(b, 'ร้านถ่ายรูปส่งมอบรถ', 'Shop recorded the bike condition');
    readyAgreement(b, h);
  } else if (body.stage === 'from_guest') {
    need(b.status === 'active' && b.dropoff.mode === 'shop', 409, 'รับคืนที่ร้านไม่ได้ในสถานะนี้');
    addHandoff(b, 'from_guest', 'shop', 'ร้าน', body);
    b.status = 'returned';
    logEvent(b, 'ร้านรับรถคืน ถ่ายรูปแล้ว', 'Bike returned to the shop');
    notifyGuest(b, 'returned', {}, `/b/${b.token}`);
  } else if (body.stage === 'runner_shop') {
    const job = db.jobs.find((j) => j.bookingId === b.id && j.kind === 'collect');
    need(b.status === 'returned' && job?.status === 'delivered', 409, 'คนเดินรถยังไม่ส่งรถถึงร้าน');
    addHandoff(b, 'runner_shop', 'shop', 'ร้าน', body);
    logEvent(b, 'ร้านตรวจรับรถจากคนเดินรถ', 'Shop checked the bike');
  } else {
    fail(400, 'stage ไม่ถูกต้อง');
  }
  changed();
  return { ok: true };
});

route('POST', '/api/partner/:id/bookings/:bid/close', ({ p, body }) => {
  const b = shopBooking(p.id, p.bid);
  need(b.status === 'returned', 409, 'ยังปิดงานไม่ได้');
  if (b.dropoff.mode === 'point') {
    need(db.handoffs.some((h) => h.bookingId === b.id && h.stage === 'runner_shop'), 409, 'ต้องตรวจรูปรับรถก่อน');
  }
  b.damage = body.damage?.items?.length ? body.damage : null;
  b.status = 'completed';
  b.closedAt = now();
  logEvent(b, b.damage ? 'ร้านปิดงาน มีค่าเสียหาย' : 'ร้านปิดงาน ไม่มีความเสียหาย', b.damage ? 'Closed with damage recorded' : 'Closed, no damage');
  notifyGuest(b, b.damage ? 'closedDamage' : 'closedOk', {}, `/b/${b.token}`);
  changed();
  return { ok: true };
});

route('POST', '/api/partner/:id/jobs/:jid/confirm', ({ p }) => {
  const j = byId(db.jobs, p.jid);
  need(j && j.shopId === p.id, 404, 'ไม่พบงาน');
  need(j.kind === 'deliver' && j.status === 'picked', 409, 'ยังไม่มีรูปให้ยืนยัน');
  j.shopConfirmedAt = now();
  const h = db.handoffs.find((x) => x.bookingId === j.bookingId && x.stage === 'shop_runner');
  if (h) h.confirmedAt = now();
  notify('runner', j.runnerId, 'LINE', 'ร้านยืนยันมอบรถแล้ว', 'ไปส่งรถที่จุดได้เลย', `/job/${j.id}`);
  changed();
  return { ok: true };
});

route('POST', '/api/partner/:id/threads/:tid/messages', ({ p, body }) => {
  const t = byId(db.threads, p.tid);
  need(t && t.shopId === p.id, 404, 'ไม่พบบทสนทนา');
  need(body.text?.trim(), 400, 'พิมพ์ข้อความก่อน');
  t.messages.push({ id: uid('m'), from: 'shop', text: body.text.trim(), at: now() });
  t.unreadGuest += 1;
  const shop = byId(db.shops, t.shopId);
  notifyGuest(t, 'message', { text: body.text.trim().slice(0, 80) });
  const b = t.bookingId ? byId(db.bookings, t.bookingId) : null;
  if (b) notifyGuest(b, 'message', { text: body.text.trim().slice(0, 80) }, `/b/${b.token}`);
  changed();
  return t;
});

route('POST', '/api/partner/:id/threads/:tid/read', ({ p }) => {
  const t = byId(db.threads, p.tid);
  need(t && t.shopId === p.id, 404, 'ไม่พบบทสนทนา');
  if (t.unreadShop) {
    t.unreadShop = 0;
    changed();
  }
  return { ok: true };
});

// ----- คนเดินรถ -----
route('GET', '/api/runner/accounts', () => db.runners.filter((r) => r.status === 'active'));

route('GET', '/api/runner/:id/overview', ({ p }) => {
  const runner = byId(db.runners, p.id);
  need(runner, 404, 'ไม่พบบัญชี');
  const jobs = db.jobs.map(fullJob).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return {
    runner,
    open: jobs.filter((j) => j.status === 'open'),
    mine: jobs.filter((j) => j.runnerId === runner.id && j.status !== 'delivered'
      || (j.runnerId === runner.id && j.kind === 'deliver' && j.status === 'delivered' && j.booking.agreement.status !== 'accepted')),
    done: jobs.filter((j) => j.runnerId === runner.id && j.status === 'delivered'
      && !(j.kind === 'deliver' && j.booking.agreement.status !== 'accepted')).reverse(),
  };
});

route('POST', '/api/runner/:id/jobs/:jid/accept', ({ p }) => {
  const runner = byId(db.runners, p.id);
  const j = byId(db.jobs, p.jid);
  need(runner && j, 404, 'ไม่พบงาน');
  need(j.status === 'open', 409, 'มีคนรับงานนี้ไปแล้ว');
  j.status = 'accepted';
  j.runnerId = runner.id;
  const b = byId(db.bookings, j.bookingId);
  logEvent(b, `${runner.name} รับงาน${j.kind === 'deliver' ? 'ส่งรถ' : 'รับรถคืน'}`, `A runner took the ${j.kind === 'deliver' ? 'delivery' : 'collection'}`);
  notify('shop', j.shopId, 'LINE', 'มีคนรับงานแล้ว', `${runner.name} รับงาน ${b.code}`, `/booking/${b.id}`);
  notifyGuest(b, 'runner', { kind: j.kind }, `/b/${b.token}`);
  changed();
  return { ok: true };
});

route('POST', '/api/runner/:id/jobs/:jid/step', ({ p, body }) => {
  const runner = byId(db.runners, p.id);
  const j = byId(db.jobs, p.jid);
  need(runner && j && j.runnerId === runner.id, 404, 'ไม่พบงาน');
  const b = byId(db.bookings, j.bookingId);

  if (j.kind === 'deliver' && j.status === 'accepted') {
    addHandoff(b, 'shop_runner', 'runner', runner.name, body);
    j.status = 'picked';
    logEvent(b, `${runner.name} รับรถจากร้าน`, 'Runner picked up the bike');
    notify('shop', j.shopId, 'LINE', 'ยืนยันมอบรถให้คนเดินรถ', `${runner.name} ถ่ายรูปรถแล้ว รอร้านยืนยัน`, `/booking/${b.id}`);
    notifyGuest(b, 'onWay', {}, `/b/${b.token}`);
  } else if (j.kind === 'deliver' && j.status === 'picked') {
    need(j.shopConfirmedAt, 409, 'รอร้านยืนยันก่อน');
    const h = addHandoff(b, 'to_guest', 'runner', runner.name, body);
    j.status = 'delivered';
    logEvent(b, `${runner.name} ส่งรถถึงจุดแล้ว`, 'Bike delivered');
    notify('shop', j.shopId, 'LINE', 'รถถึงจุดแล้ว', `${b.code} รอแขกกดยอมรับใบตกลง`, `/booking/${b.id}`);
    readyAgreement(b, h);
  } else if (j.kind === 'collect' && j.status === 'accepted') {
    need(b.status === 'active', 409, 'แขกยังไม่ได้เริ่มเช่า');
    addHandoff(b, 'from_guest', 'runner', runner.name, body);
    j.status = 'picked';
    b.status = 'returned';
    logEvent(b, `${runner.name} รับรถคืนจากแขก`, 'Runner collected the bike');
    notify('shop', j.shopId, 'LINE', 'รับรถคืนจากแขกแล้ว', `${b.code} กำลังเอารถกลับร้าน`, `/booking/${b.id}`);
    notifyGuest(b, 'collected', {}, `/b/${b.token}`);
  } else if (j.kind === 'collect' && j.status === 'picked') {
    j.status = 'delivered';
    logEvent(b, `${runner.name} ส่งรถถึงร้าน`, 'Bike back at the shop');
    notify('shop', j.shopId, 'LINE', 'รถถึงร้านแล้ว', `${b.code} ตรวจรับรถได้เลย`, `/booking/${b.id}/return`);
  } else {
    fail(409, 'งานนี้ไม่มีขั้นถัดไป');
  }
  changed();
  return { ok: true };
});

// ----- nakola admin -----
route('GET', '/api/admin/overview', () => ({
  shops: db.shops.map((s) => ({
    ...s,
    vehicleCount: db.vehicles.filter((v) => v.shopId === s.id).length,
    owner: db.members.find((m) => m.shopId === s.id && m.role === 'owner' && m.active)?.name || '-',
    teamSize: db.members.filter((m) => m.shopId === s.id && m.active).length,
    analytics: analytics(s.id),
  })),
  config: db.config,
  vehicles: db.vehicles,
  runners: db.runners.map((r) => ({
    ...r,
    jobsDone: db.jobs.filter((j) => j.runnerId === r.id && j.status === 'delivered').length,
    jobsOpen: db.jobs.filter((j) => j.runnerId === r.id && j.status !== 'delivered').length,
  })),
  points: db.points,
  spots: db.spots,
  bookings: db.bookings.map(fullBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  jobs: db.jobs.map(fullJob).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
  notifications: db.notifications.slice(0, 60),
  today: today(),
}));

const patcher = (list, fields) => ({ p, body }) => {
  const item = byId(db[list], p.id);
  need(item, 404, 'ไม่พบข้อมูล');
  for (const k of fields) if (body[k] !== undefined) item[k] = body[k];
  changed();
  return item;
};
route('PATCH', '/api/admin/shops/:id', patcher('shops', ['status']));
route('PATCH', '/api/admin/runners/:id', patcher('runners', ['status']));
route('PATCH', '/api/admin/points/:id', patcher('points', ['name', 'nameEn', 'fee', 'active']));
route('PATCH', '/api/admin/spots/:id', patcher('spots', ['permitted', 'visibility']));

route('POST', '/api/admin/points', ({ body }) => {
  need(body.name, 400, 'กรอกชื่อจุด');
  const pnt = {
    id: uid('p'), name: body.name, nameEn: body.nameEn || body.name, kind: body.kind || 'hotel', fee: Number(body.fee) || 0,
    active: true, mapX: 50, mapY: 50,
  };
  db.points.push(pnt);
  changed();
  return pnt;
});

route('POST', '/api/admin/reset', () => {
  db = createSeed();
  persist();
  broadcast({ type: 'reset' });
  return { ok: true };
});

// ---------- http ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new HttpError(400, 'JSON ไม่ถูกต้อง')); }
    });
  });
}

http.createServer(async (req, res) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type, x-member',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  const { pathname } = new URL(req.url, 'http://x');

  if (pathname === '/api/events') {
    res.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(': hello\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const send = (status, data) => {
    res.writeHead(status, { ...cors, 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };
  try {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = pathname.match(r.regex);
      if (!m) continue;
      const p = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const body = req.method === 'GET' ? {} : await readBody(req);
      // ใครกด: สมาชิกร้านที่ล็อกอินอยู่ (ส่งมาในหัว x-member) · ใช้เช็คสิทธิ์ และจดชื่อในประวัติการจอง
      currentMember = db.members.find((m) => m.id === req.headers['x-member'] && m.active) || null;
      try {
        send(200, await r.handler({ p, body }));
      } finally {
        currentMember = null;
      }
      return;
    }
    send(404, { error: 'ไม่พบ endpoint' });
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    send(e.status || 500, { error: e.status ? e.message : 'เซิร์ฟเวอร์ผิดพลาด' });
  }
}).listen(PORT, '0.0.0.0', () => console.log(`tooktale mock API on :${PORT}`));
