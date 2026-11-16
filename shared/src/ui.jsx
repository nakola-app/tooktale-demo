import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Camera, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import { BOOKING_STATUS, JOB_STATUS, agreementLang, fmtTime, langInfo, repairText, ruleLangs, ruleText, subscribe, tr } from './core.js';

// ---------- brand ----------
// โลโก้ tooktale: ไอคอน "t." บนสี่เหลี่ยมกรมท่า + ชื่อ 2 สี (took กรมท่า · tale สีประจำโรล) + oo ต่อกันมีเส้นถนน
export const BRAND_NAVY = '#0f1b3d';
export const ROLES = {
  guest: { tale: '#1e5fe0', bright: '#3d8bff', tag: 'RIDE YOUR STORY' },
  partner: { tale: '#0a845a', bright: '#22c58b', tag: 'PARTNER' },
  runner: { tale: '#c27f00', bright: '#ffb21a', tag: 'RUNNER' },
  admin: { tale: '#4f46e5', bright: '#9ea0ff', tag: 'NAKOLA ADMIN' },
};

export function LogoIcon({ role = 'guest', size = 32, light = false }) {
  const r = ROLES[role];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="48" height="48" rx="13" fill={light ? '#fff' : BRAND_NAVY} />
      <path d="M19.5 10 V28.5 Q19.5 36 27 36" fill="none" stroke={light ? BRAND_NAVY : '#fff'} strokeWidth="6.2" strokeLinecap="round" />
      <path d="M13 18.5 H27.5" stroke={light ? BRAND_NAVY : '#fff'} strokeWidth="6.2" strokeLinecap="round" />
      <circle cx="34" cy="33.5" r="3.9" fill={r.bright} />
    </svg>
  );
}

function LinkedOO({ ink, road }) {
  return (
    <svg viewBox="0 0 112 62" aria-hidden="true" style={{ display: 'inline-block', width: '1.14em', height: '.6em', verticalAlign: '-.02em', margin: '0 .005em', overflow: 'visible' }}>
      <circle cx="30" cy="31" r="23.5" fill="none" stroke={ink} strokeWidth="12.5" />
      <circle cx="82" cy="31" r="23.5" fill="none" stroke={ink} strokeWidth="12.5" />
      <path d="M8 47 C34 40 72 31 106 15" fill="none" stroke={road} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ suffix, role, size = 20, light = false, tagline = true, tag }) {
  const key = role || (suffix && ROLES[suffix] ? suffix : 'guest');
  const r = ROLES[key];
  const ink = light ? '#fff' : BRAND_NAVY;
  const tale = light ? r.bright : r.tale;
  return (
    <span className="tt-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.45 }}>
      <LogoIcon role={key} size={size * 1.62} light={light} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span aria-label="tooktale" style={{ fontFamily: 'Prompt, var(--font-body)', fontWeight: 700, fontSize: size, letterSpacing: '-.02em', color: ink, whiteSpace: 'nowrap' }}>
          t<LinkedOO ink={ink} road={tale} />k<span style={{ color: tale }}>tale</span>
        </span>
        {tagline && (
          <span style={{ fontSize: Math.max(8, size * 0.36), letterSpacing: '.22em', fontWeight: 600, marginTop: size * 0.2, color: light ? 'rgba(255,255,255,.66)' : '#6a7896', whiteSpace: 'nowrap' }}>
            {tag || r.tag}
          </span>
        )}
      </span>
    </span>
  );
}

export function DemoStrip({ text = 'เดโม่ · ข้อมูลตัวอย่างทั้งหมด' }) {
  return <div className="demo-strip">{text}</div>;
}

export function StatusChip({ status, lang = 'th', map = BOOKING_STATUS }) {
  const s = map[status] || { th: status, en: status, tone: '' };
  return <span className={`chip ${s.tone ? `chip-${s.tone}` : ''}`}>{tr(s, lang)}</span>;
}
export const JobChip = ({ status, lang = 'th' }) => <StatusChip status={status} lang={lang} map={JOB_STATUS} />;

export function Loading({ text = 'กำลังโหลด…' }) {
  return <div className="empty">{text}</div>;
}
export function ErrorNote({ error }) {
  return error ? <div className="callout callout-bad">{error.message || String(error)}</div> : null;
}

// ---------- QR ----------
export function Qr({ value, size = 180 }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (value) QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg);
  }, [value]);
  return <div style={{ width: size, height: size, background: '#fff', borderRadius: 10, padding: 6 }} dangerouslySetInnerHTML={{ __html: svg }} aria-label={value} />;
}

// ---------- แผนที่เกาะ: วาดเอง ใช้ได้แม้ไม่มีเน็ต ----------
const ISLAND = 'M48 6 C54 4 60 8 60 15 C60 22 55 24 56 30 C57 34 66 33 72 38 C78 43 78 52 72 58 C68 63 70 70 64 76 C58 84 52 94 44 94 C36 94 34 84 36 76 C37 70 28 70 22 62 C16 54 20 46 26 40 C32 34 38 32 38 24 C38 16 42 8 48 6 Z';

export function IslandMap({ pins = [], selected, onPick, height = 340, note = 'แผนที่ย่อ ไม่ตรงมาตราส่วน' }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height, background: 'var(--map-sea, #cfe8ea)', borderRadius: 14 }} role="img" aria-label="แผนที่เกาะยาวใหญ่แบบย่อ">
      <path d={ISLAND} style={{ fill: 'var(--map-shallow, #bfe0e2)' }} transform="translate(50 50) scale(1.09) translate(-50 -50)" />
      <path d={ISLAND} fill="#f1e6cc" stroke="#d9c9a3" strokeWidth=".5" />
      <path d="M50 12 C50 26 46 34 44 44 C42 56 48 66 46 86" fill="none" stroke="#d3c19b" strokeWidth=".9" strokeDasharray="1.8 1.4" />
      <path d="M44 44 C54 42 62 44 72 46" fill="none" stroke="#d3c19b" strokeWidth=".9" strokeDasharray="1.8 1.4" />
      <text x="7" y="10" fontSize="3.4" fill="#4b7f83" fontFamily="var(--font-body)">Koh Yao Yai</text>
      <text x="7" y="14.4" fontSize="2.6" fill="#4b7f83" fontFamily="var(--font-body)">{note}</text>
      {pins.map((p) => {
        const active = selected === p.id;
        return (
          <g key={p.id} onClick={() => onPick?.(p.id)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
            <circle cx={p.x} cy={p.y} r="6" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={active ? 3.8 : 3} fill={p.color || 'var(--accent)'} stroke="#fff" strokeWidth=".7" />
            <text x={p.x} y={p.y + 1} textAnchor="middle" fontSize="2.8" fontWeight="700" fill="#fff" fontFamily="var(--font-body)">{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- แชท ----------
export function ChatLog({ messages, me, lang = 'th' }) {
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  return (
    <div className="chat">
      {messages.map((m) => (
        <div key={m.id} className={`bubble ${m.from === me ? 'mine' : ''}`}>
          {m.text}
          <div className="tiny" style={{ opacity: .65, textAlign: 'right' }}>{fmtTime(m.at, lang)}</div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

export function ChatInput({ onSend, placeholder, quick = [] }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (value) => {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await onSend(v);
      setText('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="chat-dock">
      {quick.length > 0 && (
        <div className="scroll-x">
          {quick.map((q) => (
            <button key={q.label} type="button" className="chip-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => send(q.text)}>{q.label}</button>
          ))}
        </div>
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <button className="btn btn-primary" style={{ borderRadius: 999, width: 44, padding: 0 }} aria-label="ส่ง" disabled={busy}><Send size={18} /></button>
      </form>
    </div>
  );
}

// ---------- แจ้งเตือนจำลอง: ใช้แทน LINE/อีเมลจริงในเดโม่ ----------
export function Toasts({ match, onOpen }) {
  const [items, setItems] = useState([]);
  const matchRef = useRef(match);
  matchRef.current = match;
  useEffect(() => subscribe((m) => {
    if (m.type !== 'notify' || !matchRef.current(m.notification)) return;
    const n = m.notification;
    setItems((list) => [n, ...list].slice(0, 2));
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== n.id)), 5000);
  }), []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((n) => (
        <button type="button" key={n.id} className="toast" onClick={() => { setItems((l) => l.filter((x) => x.id !== n.id)); if (n.link) onOpen?.(n.link); }}>
          <span className="toast-icon" style={{ background: n.channel === 'LINE' ? 'var(--line-green)' : 'var(--accent)' }}>
            {n.channel === 'LINE' ? 'LINE' : <Mail size={18} />}
          </span>
          <span className="grow">
            <span className="bold small" style={{ display: 'block' }}>{n.title}</span>
            <span className="small muted" style={{ display: 'block' }}>{n.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// ---------- รูปแขกตอนกดยอมรับบนเครื่องร้าน/คนเดินรถ (กล้องไหนก็ได้ ใครถ่ายก็ได้) ----------
// เปิดกล้องสดได้ (https/localhost) = ใช้เว็บแคมหรือกล้องหน้า/หลัง · ไม่ได้ = ใช้ปุ่มถ่ายรูปของเครื่อง · ย่อรูปก่อนส่ง · มีปุ่มจำลองไว้โชว์
export async function shrinkImage(file, max = 360) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s));
    c.height = Math.max(1, Math.round(img.height * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SelfieView({ selfie, size = 96, caption, kind = 'person' }) {
  if (!selfie) return null;
  const time = selfie.takenAt ? fmtTime(selfie.takenAt) : '';
  return (
    <figure style={{ margin: 0, width: size, flex: 'none' }} data-testid="selfie-view">
      {selfie.dataUrl
        ? <img src={selfie.dataUrl} alt="selfie" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 12 }} />
        : (
          kind === 'slip' ? (
            <svg viewBox="0 0 96 96" width={size} height={size} role="img" aria-label="slip (demo)" style={{ borderRadius: 12, background: '#e6f4ee' }}>
              <rect x="26" y="12" width="44" height="72" rx="4" fill="#fff" stroke="#9cc9b4" strokeWidth="2" />
              <circle cx="48" cy="30" r="8" fill="#22c58b" />
              <path d="M44 30 L47 33 L53 27" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <rect x="34" y="46" width="28" height="4" rx="2" fill="#b9d8ca" /><rect x="34" y="56" width="20" height="4" rx="2" fill="#b9d8ca" />
              <text x="48" y="76" textAnchor="middle" fontSize="9" fill="#3b7a5f" fontFamily="var(--font-body)">DEMO</text>
            </svg>
          ) : (
          <svg viewBox="0 0 96 96" width={size} height={size} role="img" aria-label="selfie (demo)" style={{ borderRadius: 12, background: '#dfe8f6' }}>
            <circle cx="48" cy="38" r="17" fill="#9fb0cc" />
            <path d="M16 92 C18 66 32 58 48 58 C64 58 78 66 80 92 Z" fill="#9fb0cc" />
            <text x="48" y="90" textAnchor="middle" fontSize="9" fill="#5a6b88" fontFamily="var(--font-body)">DEMO</text>
          </svg>
          )
        )}
      <figcaption className="tiny faint" style={{ textAlign: 'center', marginTop: 2 }}>{[caption ?? 'selfie', time].filter(Boolean).join(' · ')}</figcaption>
    </figure>
  );
}

// กล้องสด: เว็บแคมบนคอม หรือกล้องหน้า/หลังบนมือถือ · เบราว์เซอร์อนุญาตเฉพาะ https หรือ localhost
const canLiveCamera = () => typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

function frameToJpeg(video, max = 360) {
  const s = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(video.videoWidth * s));
  c.height = Math.max(1, Math.round(video.videoHeight * s));
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

function LiveCamera({ onShot, onFail, x }) {
  const video = useRef(null);
  const [cams, setCams] = useState([]);
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stream;
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const id = cams[idx]?.deviceId;
        stream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.current.srcObject = stream;
        await video.current.play();
        setReady(true);
        if (!cams.length) setCams((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        if (!cancelled) onFail(err);
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack-s">
      <video ref={video} playsInline muted style={{ width: '100%', maxHeight: 260, borderRadius: 12, background: '#0f1b3d', objectFit: 'cover' }} data-testid="live-camera" />
      <div className="row">
        <button type="button" className="btn btn-primary grow" disabled={!ready} onClick={() => onShot({ dataUrl: frameToJpeg(video.current), takenAt: new Date().toISOString(), source: 'camera' })}><Camera size={16} />{x.snap}</button>
        {cams.length > 1 && <button type="button" className="btn btn-ghost" onClick={() => setIdx((idx + 1) % cams.length)}>{x.switchCam}</button>}
      </div>
    </div>
  );
}

// รูปแขกตอนกดยอมรับบนเครื่องร้าน/คนเดินรถ: ใครถ่ายก็ได้ กล้องไหนก็ได้ ขอแค่เห็นว่าแขกอยู่และรับรู้
function SelfieCapture({ value, onChange, x }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const liveOk = canLiveCamera() && !liveFailed;
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange({ dataUrl: await shrinkImage(file), takenAt: new Date().toISOString(), source: 'file' });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <div className="card stack-s" style={{ padding: 12 }}>
      <span className="small bold">{x.selfie}</span>
      {live ? (
        <LiveCamera x={x} onShot={(v) => { onChange(v); setLive(false); }} onFail={() => { setLive(false); setLiveFailed(true); }} />
      ) : (
        <div className="row" style={{ alignItems: 'center' }}>
          {value ? <SelfieView selfie={value} size={72} caption="" /> : <span style={{ width: 72, height: 72, borderRadius: 12, border: '2px dashed var(--line)', display: 'grid', placeItems: 'center', flex: 'none' }}><Camera size={22} style={{ color: 'var(--ink-3)' }} /></span>}
          <div className="stack-s grow">
            <button type="button" className="btn btn-ghost btn-s" disabled={busy} onClick={() => (liveOk ? setLive(true) : input.current?.click())}><Camera size={15} />{value ? x.retake : x.take}</button>
            <button type="button" className="btn btn-ghost btn-s" onClick={() => onChange({ simulated: true, takenAt: new Date().toISOString() })}>{x.simulate}</button>
          </div>
        </div>
      )}
      {liveFailed && <p className="tiny faint">{x.noCam}</p>}
      <input ref={input} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} aria-label={x.take} data-testid="selfie-input" />
    </div>
  );
}

// ใบตกลงแบบย่อ ให้แขกกดบนมือถือร้าน/คนเดินรถ · แขกสลับภาษาได้เฉพาะภาษาที่ร้านเปิดไว้
// ต้องมีรูปแขกก่อนกดยอมรับ (กันร้านกดแทนแขก)
const AGREE_TEXT = {
  en: { receipt: 'Garage receipt', ret: 'Return', hold: 'Kept by the shop', check: 'I have read and accept the rules.', accept: 'Accept', binding: 'Translation. The English version is the one you agree to.', selfie: 'Photo of the guest, to show you were here and agreed', take: 'Take photo', retake: 'Retake', simulate: 'Demo: simulate photo', snap: 'Take photo', switchCam: 'Switch camera', noCam: 'Camera could not open. Use the phone camera or pick a photo.' },
  th: { receipt: 'ตามใบเสร็จอู่', ret: 'คืนรถ', hold: 'ร้านเก็บอะไรไว้', check: 'ฉันอ่านกติกาแล้วและยอมรับ', accept: 'ยอมรับ', binding: 'ฉบับแปล ฉบับภาษาอังกฤษคือฉบับที่ใช้ตกลงกัน', selfie: 'ถ่ายรูปแขก เป็นหลักฐานว่าแขกอยู่ตรงนี้และรับรู้', take: 'ถ่ายรูป', retake: 'ถ่ายใหม่', simulate: 'เดโม่: จำลองรูป', snap: 'ถ่าย', switchCam: 'สลับกล้อง', noCam: 'เปิดกล้องไม่ได้ ใช้กล้องของเครื่องหรือเลือกรูปแทน' },
  zh: { receipt: '按修车厂收据', ret: '还车', hold: '店家保留', check: '我已阅读并接受以上规则。', accept: '接受', binding: '这是译文，以英文版为准。', selfie: '拍一张租客的照片，证明您在场并已同意', take: '拍照', retake: '重拍', simulate: '演示：模拟照片', snap: '拍照', switchCam: '切换相机', noCam: '无法打开相机，请使用手机相机或选择照片。' },
};
export function AgreementQuick({ rules, guestLang = 'en', onAccept }) {
  const [lang, setLang] = useState(() => agreementLang(rules, guestLang));
  const [checked, setChecked] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const x = AGREE_TEXT[lang] || AGREE_TEXT.en;
  const langs = ruleLangs(rules);
  return (
    <div className="stack">
      {langs.length > 1 && (
        <div className="row wrap" role="group" aria-label="Language">
          {langs.map((l) => <button type="button" key={l} className="chip-btn" aria-pressed={lang === l} onClick={() => setLang(l)}>{langInfo(l).label}</button>)}
        </div>
      )}
      <div className="stack-s" lang={lang}>
        {lang !== 'en' && <p className="tiny faint">{x.binding}</p>}
        {rules.repairs.map((r, i) => (
          <div className="sum-row small" key={i}><span>{repairText(r, lang)}</span><span className="bold num" style={{ whiteSpace: 'nowrap' }}>{r.price === null ? x.receipt : `฿${Number(r.price).toLocaleString('en-US')}`}</span></div>
        ))}
        <p className="small"><b>{x.ret}:</b> {ruleText(rules, 'return', lang)}</p>
        <p className="small"><b>{x.hold}:</b> {ruleText(rules, 'hold', lang)}</p>
        <SelfieCapture value={selfie} onChange={setSelfie} x={x} />
        <label className="check-row"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><span className="small">{x.check}</span></label>
        <button type="button" className="btn btn-primary btn-block" disabled={!checked || !selfie} onClick={() => onAccept(lang, selfie)}>{x.accept}</button>
      </div>
    </div>
  );
}

// หน้าเข้าสู่ระบบจำลอง ใช้ร่วมกันระหว่างร้านกับคนเดินรถ
export function MockLineLogin({ brand, hint, accounts, onPick }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="stack center" style={{ alignItems: 'center', gap: 14 }}>
        {brand}
        <p className="muted">{hint}</p>
      </div>
      <button type="button" className="btn btn-line btn-block" onClick={() => setPickerOpen(true)}>
        <MessageCircle size={18} /> เข้าสู่ระบบด้วย LINE
      </button>
      <p className="tiny faint center">เดโม่ไม่ได้เชื่อม LINE จริง กดแล้วเลือกบัญชีตัวอย่าง</p>
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="เลือกบัญชีตัวอย่าง">
        <div className="stack">
          {accounts.map((a) => (
            <button type="button" key={a.id} className="card card-link" onClick={() => onPick(a)}>
              <div className="bold">{a.title}</div>
              <div className="small muted row" style={{ gap: 4 }}><MapPin size={13} />{a.sub}</div>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
