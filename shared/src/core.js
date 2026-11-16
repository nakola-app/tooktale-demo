import { useCallback, useEffect, useRef, useState } from 'react';

// API อยู่เครื่องเดียวกับหน้าเว็บ ต่างกันแค่พอร์ต จึงใช้ได้ทั้ง localhost และ IP ในวง Wi-Fi
export const API = `${location.protocol}//${location.hostname}:4105`;

// หัวที่แนบทุกคำขอ (แอปร้านใส่ x-member = คนที่ล็อกอินอยู่)
let extraHeaders = {};
export const setApiHeaders = (h) => { extraHeaders = { ...(h || {}) }; };

async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...extraHeaders, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'เชื่อมต่อไม่ได้');
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};

// EventSource ตัวเดียวต่อแอป
const listeners = new Set();
let source;
function ensureSource() {
  if (source) return;
  source = new EventSource(`${API}/api/events`);
  source.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'reset') {
      Object.keys(localStorage).filter((k) => k.startsWith('tt.data.')).forEach((k) => localStorage.removeItem(k));
      location.assign('/');
      return;
    }
    listeners.forEach((fn) => fn(msg));
  };
}
export function subscribe(fn) {
  ensureSource();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ดึงข้อมูลแล้วดึงใหม่ทุกครั้งที่มีการเปลี่ยนแปลง (โพลล์สำรองกันกรณี SSE หลุด)
export function useLive(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fn = useRef(fetcher);
  fn.current = fetcher;
  const refresh = useCallback(async () => {
    try {
      const data = await fn.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    refresh();
    const off = subscribe((m) => { if (m.type === 'change') refresh(); });
    const timer = setInterval(refresh, 8000);
    return () => { off(); clearInterval(timer); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, refresh };
}

let metaPromise;
export const getMeta = () => { metaPromise ||= api.get('/api/meta'); return metaPromise; };
export function useMeta() {
  const [meta, setMeta] = useState(null);
  useEffect(() => { getMeta().then(setMeta).catch(() => {}); }, []);
  return meta;
}
// ลิงก์ข้ามแอป: ถ้าเปิดจาก localhost ให้ใช้ IP ในวง Wi-Fi เพื่อให้สแกนจากมือถือได้
export function appUrl(meta, app, path = '') {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const host = local && meta?.lanIp ? meta.lanIp : location.hostname;
  return `${location.protocol}//${host}:${meta?.ports?.[app] ?? ''}${path}`;
}

export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch { return initial; }
  });
  const set = useCallback((v) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
  }, [key]);
  return [value, set];
}

// ---------- ภาษา: EN เป็นฐาน ภาษาอื่นไม่มีคำไหน ตกกลับไปใช้ EN ----------
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'th', label: 'ไทย', short: 'TH', locale: 'th-TH-u-ca-gregory' },
  { code: 'zh', label: '中文', short: '中文', locale: 'zh-CN' },
];
export const BASE_LANG = 'en';
export const langInfo = (code) => LANGS.find((l) => l.code === code) || LANGS[0];
// จับภาษาจากเครื่อง: ดูทุกภาษาที่ตั้งไว้ตามลำดับ ตัวแรกที่เรามีจะถูกใช้ ไม่มีเลย = EN
export function detectLang(supported = LANGS.map((l) => l.code)) {
  const prefs = typeof navigator === 'undefined' ? [] : (navigator.languages?.length ? navigator.languages : [navigator.language]);
  for (const p of prefs) {
    const base = String(p || '').toLowerCase().split('-')[0];
    if (supported.includes(base)) return base;
  }
  return BASE_LANG;
}
// ข้อความหลายภาษาแบบ { en, th, zh } → เลือกภาษานั้น ถ้าว่างใช้ EN
export const tr = (entry, lang) => (entry && (entry[lang] || entry[BASE_LANG])) || '';

// ใบตกลงของร้าน: EN บังคับ ภาษาอื่นร้านเลือกเปิดเอง
// แขกเห็นทั้งใบเป็นภาษาเดียว: ภาษาของแขกถ้าร้านเปิดไว้ ไม่งั้น EN (ไม่ผสมภาษาในใบเดียว)
export const ruleLangs = (r) => (r?.langs?.length ? r.langs : ['en', 'th']);
export const agreementLang = (r, lang) => (ruleLangs(r).includes(lang) ? lang : BASE_LANG);
const SUFFIX = { en: 'En', th: 'Th', zh: 'Zh' };
export const ruleField = (field, lang) => field + SUFFIX[lang];
export const ruleText = (r, field, lang) => r?.[ruleField(field, lang)] || r?.[ruleField(field, BASE_LANG)] || '';
export const repairText = (x, lang) => x?.[lang] || x?.[BASE_LANG] || '';

// ---------- format ----------
const locale = (lang) => langInfo(lang).locale;
export const toDate = (s) => new Date(`${s}T12:00:00`);
export const fmtDate = (s, lang = 'th') => toDate(s).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });
export const fmtDay = (s, lang = 'th') => toDate(s).toLocaleDateString(locale(lang), { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtRange = (a, b, lang = 'th') => (a === b ? fmtDate(a, lang) : `${fmtDate(a, lang)} – ${fmtDate(b, lang)}`);
export const fmtDayRange = (a, b, lang = 'th') => (a === b ? fmtDay(a, lang) : `${fmtDay(a, lang)} – ${fmtDay(b, lang)}`);
export const fmtTime = (s, lang = 'th') => new Date(s).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' });
export const fmtStamp = (s, lang = 'th') => new Date(s).toLocaleString(locale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const baht = (n) => `฿${Number(n || 0).toLocaleString('en-US')}`;
export const pct = (n) => `${Math.round((n || 0) * 100)}%`;

export function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const todayIso = () => isoDay(new Date());
export function addDays(s, n) {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
export const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
// เช่ารถไม่ใช่โรงแรม: รับ-คืนวันเดียวกัน = 1 วัน · รับวันนี้คืนพรุ่งนี้ = 1 วัน (24 ชม.) · คืนวันที่ 3 = 2 วัน
export const rentalDays = (from, to) => (from && to && to >= from ? Math.max(1, diffDays(from, to)) : 0);

// ---------- labels ----------
export const BOOKING_STATUS = {
  requested: { th: 'ขอจอง', en: 'Requested', zh: '待确认', tone: 'warn' },
  confirmed: { th: 'ยืนยันแล้ว', en: 'Confirmed', zh: '已确认', tone: 'accent' },
  active: { th: 'กำลังเช่า', en: 'On rental', zh: '租用中', tone: 'good' },
  returned: { th: 'คืนแล้ว', en: 'Returned', zh: '已还车', tone: 'coral' },
  completed: { th: 'จบ', en: 'Completed', zh: '已完成', tone: '' },
  rejected: { th: 'ร้านปฏิเสธ', en: 'Declined', zh: '店家无法接单', tone: 'bad' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', zh: '已取消', tone: 'bad' },
};
export const JOB_STATUS = {
  open: { th: 'รอคนรับงาน', en: 'Finding a runner', zh: '正在安排送车员', tone: 'warn' },
  accepted: { th: 'มีคนรับแล้ว', en: 'Runner assigned', zh: '已安排送车员', tone: 'accent' },
  picked: { th: 'รับรถแล้ว', en: 'Bike picked up', zh: '送车员已取车', tone: 'coral' },
  delivered: { th: 'ส่งถึงแล้ว', en: 'Arrived', zh: '已送达', tone: 'good' },
};
export const JOB_KIND = {
  deliver: { th: 'ส่งรถ', en: 'Delivery', zh: '送车' },
  collect: { th: 'รับรถคืน', en: 'Collection', zh: '上门取车' },
};
export const ANGLES = ['front', 'left', 'right', 'rear'];
export const ANGLE_LABEL = {
  front: { th: 'ด้านหน้า', en: 'Front', zh: '前面' },
  left: { th: 'ด้านซ้าย', en: 'Left', zh: '左侧' },
  right: { th: 'ด้านขวา', en: 'Right', zh: '右侧' },
  rear: { th: 'ด้านหลัง', en: 'Rear', zh: '后面' },
};
export const FUEL = {
  full: { th: 'เต็มถัง', en: 'Full', zh: '满箱' },
  three: { th: '3/4 ถัง', en: '3/4' },
  half: { th: 'ครึ่งถัง', en: '1/2' },
  quarter: { th: '1/4 ถัง', en: '1/4' },
};

const WHO = {
  shop: { th: 'ร้าน', en: 'Shop', zh: '店家' },
  runner: { th: 'คนเดินรถ', en: 'Runner', zh: '送车员' },
  guest: { th: 'แขก', en: 'Guest', zh: '租客' },
};
export function handoffRoute(h) {
  switch (h.stage) {
    case 'shop_runner': return ['shop', 'runner'];
    case 'to_guest': return [h.by, 'guest'];
    case 'from_guest': return ['guest', h.by];
    default: return ['runner', 'shop'];
  }
}
export const stageLabel = (h, lang = 'th') => handoffRoute(h).map((w) => tr(WHO[w], lang)).join(' → ');

// ดูว่ารอยใหม่โผล่ครั้งแรกในชุดไหน และรถอยู่กับใครระหว่างชุดก่อนหน้ากับชุดนั้น
export function damageOrigin(handoffs) {
  const sets = [...handoffs].sort((a, b) => a.at.localeCompare(b.at));
  const idx = sets.findIndex((h) => h.photos.some((p) => p.damage === 'new'));
  if (idx < 0) return null;
  const set = sets[idx];
  const prev = sets[idx - 1] || null;
  const holder = prev ? handoffRoute(prev)[1] : handoffRoute(set)[0];
  return { set, prev, holder, angle: set.photos.find((p) => p.damage === 'new').angle };
}
export const whoLabel = (w, lang = 'th') => tr(WHO[w], lang);

// ---------- นับถอยหลังยืนยันอัตโนมัติ ----------
export function useNow(ms = 10000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return n;
}
export const minutesLeft = (iso, now = Date.now()) => (iso ? Math.max(0, Math.ceil((new Date(iso) - now) / 60000)) : 0);

// ระยะห่างระหว่าง 2 เวลา แบบอ่านง่าย (ใช้แสดงว่าแขกแจ้งหลังกดยอมรับนานแค่ไหน)
export function gapTh(fromIso, toIso) {
  const mins = Math.max(0, Math.round((new Date(toIso) - new Date(fromIso)) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return [d && `${d} วัน`, h && `${h} ชม.`, (!d && m) && `${m} นาที`].filter(Boolean).join(' ') || 'ไม่ถึง 1 นาที';
}
