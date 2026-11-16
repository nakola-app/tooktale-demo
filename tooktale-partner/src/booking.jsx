import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, CheckCircle2, FastForward, FileSignature, MessageCircle, Repeat, Smartphone, X } from 'lucide-react';
import {
  AgreementQuick, DamageNote, SelfieView, ErrorNote, EvidenceChain, FUEL, JOB_KIND, JobChip, PhotoCapture, PhotoCompare, Qr, Sheet, StatusChip,
  addDays, api, appUrl, baht, fmtDay, fmtStamp, gapTh, langInfo, minutesLeft, todayIso, useMeta, useNow,
} from '@tooktale/shared';
import { useShop } from './ctx.js';

const useBookingById = () => {
  const { id } = useParams();
  const { bookings } = useShop();
  return bookings.find((b) => b.id === id);
};

function Top({ title, back }) {
  return (
    <header className="topbar">
      <Link to={back} className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
      <h2 className="grow clip">{title}</h2>
    </header>
  );
}

// แขกกดยอมรับได้ 2 ทาง: บนมือถือตัวเอง (สแกน) หรือบนมือถือร้าน (walk-in)
function AgreementWait({ b }) {
  const { refresh } = useShop();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const rules = b.agreement.rules;
  const url = meta ? appUrl(meta, 'tooktale', `/b/${b.token}/agreement`) : '';
  const accept = async (lang, selfie) => {
    await api.post(`/api/b/${b.token}/accept`, { on: 'shop_phone', lang, selfie });
    setOpen(false);
    refresh();
  };
  return (
    <div className="card stack" style={{ borderColor: 'var(--coral)' }}>
      <div className="row-top"><FileSignature size={20} style={{ color: 'var(--coral)', flex: 'none' }} />
        <div><h3>รอแขกกดยอมรับใบตกลง</h3><p className="small muted">กดยอมรับแล้วสถานะเปลี่ยนเป็น "กำลังเช่า" เอง</p></div>
      </div>
      <div className="stack center" style={{ alignItems: 'center' }}>
        <Qr value={url} size={170} />
        <p className="small muted">ให้แขกสแกนด้วยมือถือตัวเอง</p>
      </div>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(true)}><Smartphone size={17} />ให้แขกกดบนมือถือเครื่องนี้</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Rental agreement · ใบตกลง">
        <AgreementQuick rules={rules} guestLang={b.lang} onAccept={accept} />
      </Sheet>
    </div>
  );
}

// ยืนยันแล้วแต่รถไม่ว่างจริง (จองนอกระบบ) หรือแขกมาถึงร้านแล้วคันนี้ไม่พร้อม → เปลี่ยนรถ หรือยกเลิก
// เปลี่ยนรถ: ราคาขึ้นไม่ได้ ใช้ราคาที่ถูกกว่าระหว่างเดิมกับคันใหม่
function FixBooking({ b }) {
  const { shopId, refresh } = useShop();
  const [mode, setMode] = useState(null);
  const [options, setOptions] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const openSwap = async () => {
    setMode('swap');
    setOptions(null);
    setOptions(await api.get(`/api/partner/${shopId}/bookings/${b.id}/swap-options`));
  };
  const swap = async (vehicleId) => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/vehicle`, { vehicleId });
      setMode(null);
      refresh();
    } catch (e) { setError(e); }
  };
  const cancel = async () => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/cancel`, { reason });
      setMode(null);
      refresh();
    } catch (e) { setError(e); }
  };
  const sorted = options ? [...options].sort((x, y) => (y.free - x.free) || (x.pricePerDay - y.pricePerDay)) : [];
  return (
    <>
      <div className="row">
        <button type="button" className="btn btn-ghost grow" onClick={openSwap}><Repeat size={16} />เปลี่ยนรถ</button>
        <button type="button" className="btn btn-ghost grow" onClick={() => setMode('cancel')}><X size={16} />ยกเลิกการจอง</button>
      </div>
      <p className="tiny faint">รถคันนี้ไม่ว่างจริง เช่น ถูกจองนอกระบบ หรือแขกมาถึงร้านแล้วคันนี้ไม่พร้อม · แขกจะได้ข้อความทันที</p>
      <Sheet open={mode === 'swap'} onClose={() => setMode(null)} title="เปลี่ยนรถให้แขก">
        <p className="small muted">ราคาขึ้นไม่ได้: คันที่แพงกว่าแขกจ่ายเท่าเดิม {baht(b.pricePerDay)}/วัน · คันที่ถูกกว่าแขกจ่ายราคาคันใหม่</p>
        <ErrorNote error={error} />
        {!options ? <p className="small muted">กำลังโหลด…</p> : (
          <div className="stack-s">
            {sorted.map((v) => (
              <button type="button" key={v.id} className="card card-link row" disabled={!v.free} style={{ opacity: v.free ? 1 : 0.5, textAlign: 'left', justifyContent: 'space-between', width: '100%' }} onClick={() => swap(v.id)}>
                <span><span className="bold">{v.name}</span><br /><span className="small muted">{v.plate} · ราคาปกติ {baht(v.pricePerDay)}</span></span>
                <span className="small" style={{ textAlign: 'right' }}>{v.free
                  ? <><span className="bold num">{baht(v.newPrice)}/วัน</span><br /><span className="tiny muted">{v.newPrice < b.pricePerDay ? 'ถูกลง' : 'เท่าเดิม'}</span></>
                  : <span className="chip chip-bad">ไม่ว่าง</span>}</span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
      <Sheet open={mode === 'cancel'} onClose={() => setMode(null)} title="ยกเลิกการจอง">
        <p className="small muted">ใช้เมื่อรถไม่ว่างจริงและไม่มีคันอื่นให้ · ถ้ามีคันอื่น เปลี่ยนรถดีกว่า แขกไม่ต้องหาใหม่</p>
        <div className="field"><label htmlFor={`cx-${b.id}`}>เหตุผล (แขกจะเห็น)</label><input id={`cx-${b.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sorry, this bike was booked by phone." /></div>
        <ErrorNote error={error} />
        <button type="button" className="btn btn-danger btn-block" onClick={cancel}>ยืนยันยกเลิก</button>
      </Sheet>
    </>
  );
}

const DEVICE_TH = { guest_phone: 'กดจากมือถือแขก', shop_phone: 'กดจากเครื่องร้าน', runner_phone: 'กดจากเครื่องคนเดินรถ' };

// กดยอมรับบนเครื่องร้าน: แขกต้องได้สำเนาไว้ดูเอง (walk-in อาจไม่มีอีเมล) → ให้สแกนเก็บ
function GuestCopy({ b }) {
  const meta = useMeta();
  const url = meta ? appUrl(meta, 'tooktale', `/b/${b.token}`) : '';
  return (
    <div className="card stack-s center" style={{ alignItems: 'center' }} data-testid="guest-copy">
      <h3>ให้แขกสแกนเก็บสำเนา</h3>
      <Qr value={url} size={150} />
      <p className="small muted">แขกกดยอมรับบนเครื่องร้าน · แขกจะเห็นในหน้าของตัวเองว่ากดจากเครื่องร้าน · แขก walk-in เป็นความรับผิดชอบของร้าน ติดต่อกับแขกเอง</p>
    </div>
  );
}

export function AutoConfirmNote({ b }) {
  const nowMs = useNow(10000);
  const { refresh } = useShop();
  return (
    <div className="callout callout-warn stack-s small" data-testid="auto-countdown">
      <span>ไม่ตอบภายใน <b className="num">{minutesLeft(b.autoConfirmAt, nowMs)} นาที</b> = รับจองอัตโนมัติ · รถไม่ว่างกด "ปฏิเสธ"</span>
      <button type="button" className="btn btn-ghost btn-s" style={{ alignSelf: 'flex-start' }} onClick={async () => { await api.post(`/api/demo/bookings/${b.id}/skip-wait`); refresh(); }}><FastForward size={14} />เดโม่: ข้ามเวลารอ</button>
    </div>
  );
}

function Actions({ b }) {
  const { shopId, refresh } = useShop();
  const [error, setError] = useState(null);
  const decide = async (accept) => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/decision`, { accept });
      refresh();
    } catch (e) { setError(e); }
  };
  const deliver = b.jobs.find((j) => j.kind === 'deliver');
  const collect = b.jobs.find((j) => j.kind === 'collect');

  if (b.status === 'requested') {
    return (
      <div className="stack-s">
        <ErrorNote error={error} />
        <AutoConfirmNote b={b} />
        <div className="row">
          <button type="button" className="btn btn-primary grow" onClick={() => decide(true)}>รับจอง</button>
          <button type="button" className="btn btn-ghost" onClick={() => decide(false)}>ปฏิเสธ</button>
        </div>
      </div>
    );
  }
  if (b.agreement.status === 'ready') return <AgreementWait b={b} />;
  if (b.status === 'confirmed' && b.pickup.mode === 'shop') {
    return (
      <div className="stack-s">
        <Link to={`/booking/${b.id}/handoff`} className="btn btn-primary btn-block"><Camera size={18} />ส่งมอบรถ ถ่ายรูปสภาพรถ</Link>
        <FixBooking b={b} />
      </div>
    );
  }
  if (b.status === 'confirmed' && deliver?.status === 'picked' && !deliver.shopConfirmedAt) {
    return (
      <button type="button" className="btn btn-primary btn-block" onClick={async () => { await api.post(`/api/partner/${shopId}/jobs/${deliver.id}/confirm`); refresh(); }}>
        <Check size={18} />รูปตรงกัน มอบรถให้คนเดินรถ
      </button>
    );
  }
  if (b.status === 'active' && b.dropoff.mode === 'shop') {
    return <Link to={`/booking/${b.id}/return`} className="btn btn-primary btn-block"><Camera size={18} />รับรถคืน ถ่ายรูป</Link>;
  }
  if (b.status === 'returned' && (b.dropoff.mode === 'shop' || collect?.status === 'delivered')) {
    return <Link to={`/booking/${b.id}/return`} className="btn btn-primary btn-block"><Check size={18} />ตรวจรูป ปิดงาน</Link>;
  }
  if (b.status === 'confirmed' && b.handoffs.length === 0) return <FixBooking b={b} />;
  return null;
}

export function BookingPage() {
  const b = useBookingById();
  if (!b) return <div className="page"><p>ไม่พบการจอง</p><Link to="/" className="btn btn-ghost">กลับหน้าแรก</Link></div>;
  return (
    <>
      <Top title={b.code} back="/" />
      <main className="page">
        <div className="card stack-s">
          <div className="between"><h3 className="clip">{b.guest.name}</h3><StatusChip status={b.status} /></div>
          <dl className="info-grid" style={{ margin: 0 }}>
            <dt>รถ</dt><dd>{b.vehicle.name} · {b.vehicle.plate}</dd>
            <dt>รับรถ</dt><dd>{fmtDay(b.from)} {b.pickupTime !== '-' && b.pickupTime} · {b.pickupPoint?.name || 'ที่ร้าน'}</dd>
            <dt>คืนรถ</dt><dd>{fmtDay(b.to)} {b.returnTime} · {b.dropoffPoint?.name || 'ที่ร้าน'}</dd>
            <dt>ที่มา</dt><dd>{b.source === 'walkin' ? 'walk-in' : 'จองออนไลน์'}</dd>
            {b.source !== 'walkin' && <><dt>ภาษาแขก</dt><dd>{langInfo(b.lang).label}</dd></>}
            {b.guest.whatsapp && <><dt>WhatsApp</dt><dd>{b.guest.whatsapp}</dd></>}
            {b.guest.license && <><dt>ใบขับขี่</dt><dd>{b.guest.license}</dd></>}
            {b.confirmedBy && <><dt>ยืนยันโดย</dt><dd>{b.confirmedBy === 'auto' ? 'อัตโนมัติ (ร้านไม่ตอบในเวลา)' : 'ร้าน'}</dd></>}
            {b.swappedFrom && <><dt>เปลี่ยนรถ</dt><dd>จาก {b.swappedFrom.name} · {b.swappedFrom.plate} ({baht(b.swappedFrom.pricePerDay)}/วัน)</dd></>}
            {b.status === 'cancelled' && <><dt>ยกเลิกโดย</dt><dd>{b.cancelledBy === 'shop' ? `ร้าน${b.cancelReason ? ` · ${b.cancelReason}` : ''}` : 'แขก'}</dd></>}
            <dt>ค่าเช่า</dt><dd className="num">{baht(b.rentTotal)} ({b.days} วัน)</dd>
            {b.deliveryFee > 0 && <><dt>ค่าส่ง (แขกจ่าย)</dt><dd className="num">{baht(b.deliveryFee)}</dd></>}
            {b.fee > 0 && <><dt>ค่าธรรมเนียม tooktale</dt><dd className="num">{baht(b.fee)} <span className="tiny muted">แขกจ่าย · ร้านเก็บแทน</span></dd></>}
            {b.source !== 'walkin' && <><dt className="bold">เก็บจากแขก</dt><dd className="num bold" data-testid="collect-total">{baht(b.rentTotal + b.deliveryFee + (b.fee || 0))}</dd></>}
          </dl>
        </div>

        <Actions b={b} />

        {b.jobs.length > 0 && (
          <div className="card stack-s">
            <h3>งานรับส่ง</h3>
            {b.jobs.map((j) => (
              <div className="between" key={j.id}>
                <span className="small">{JOB_KIND[j.kind].th} · {j.point.name}{j.runner ? ` · ${j.runner.name}` : ''}</span>
                <JobChip status={j.status} />
              </div>
            ))}
          </div>
        )}

        {b.thread && <Link to={`/chat/${b.thread.id}`} className="btn btn-ghost btn-block"><MessageCircle size={18} />แชทกับแขก</Link>}

        {b.agreement.status === 'accepted' && (
          <div className="callout callout-good" style={{ alignItems: 'flex-start' }}><CheckCircle2 size={18} style={{ flex: 'none' }} /><span className="grow">แขกกดยอมรับใบตกลง {fmtStamp(b.agreement.acceptedAt)} · {DEVICE_TH[b.agreement.acceptedOn] || 'มือถือแขก'}{b.agreement.acceptedLang ? ` · ฉบับ ${langInfo(b.agreement.acceptedLang).label}` : ''}</span><SelfieView selfie={b.agreement.selfie} size={64} caption="รูปแขก" /></div>
        )}
        {b.agreement.guestDisputedAt && (
          <div className="callout callout-bad" data-testid="guest-disputed">⚠️ แขกแจ้งว่าไม่ได้กดยอมรับใบตกลงเอง {fmtStamp(b.agreement.guestDisputedAt)} · แจ้งหลังกดยอมรับ {gapTh(b.agreement.acceptedAt, b.agreement.guestDisputedAt)} · ก่อนคืนรถ · บันทึกไว้ในการจองแล้ว</div>
        )}
        {b.agreement.status === 'accepted' && b.agreement.acceptedOn !== 'guest_phone' && !b.agreement.guestDisputedAt && ['active', 'returned'].includes(b.status) && <GuestCopy b={b} />}
        {b.damage && (
          <div className="card stack-s">
            <h3>ค่าเสียหาย</h3>
            {b.damage.items.map((d) => <div className="sum-row" key={d.label}><span>{d.label}</span><span className="bold num">{d.price === null ? 'ตามใบเสร็จ' : baht(d.price)}</span></div>)}
            {b.damage.note && <p className="small muted">{b.damage.note}</p>}
          </div>
        )}

        <div className="stack">
          <h3>หลักฐานทุกครั้งที่รถเปลี่ยนมือ</h3>
          <EvidenceChain booking={b} />
        </div>

        {b.events.length > 0 && (
          <div className="stack-s">
            <h3>ไทม์ไลน์</h3>
            {[...b.events].reverse().map((e, i) => <div className="between small" key={i}><span>{e.th}{e.by ? <span className="muted"> · {e.by}</span> : null}</span><span className="faint tiny">{fmtStamp(e.at)}</span></div>)}
          </div>
        )}
      </main>
    </>
  );
}

export function HandoffPage() {
  const b = useBookingById();
  const { shopId, refresh } = useShop();
  const nav = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [fuel, setFuel] = useState('full');
  const [error, setError] = useState(null);
  if (!b) return null;
  const submit = async () => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/handoff`, { stage: 'to_guest', photos, fuel });
      await refresh();
      nav(`/booking/${b.id}`, { replace: true });
    } catch (e) { setError(e); }
  };
  return (
    <>
      <Top title="ส่งมอบรถ" back={`/booking/${b.id}`} />
      <main className="page">
        <p className="muted">ถ่าย {b.vehicle.name} ({b.vehicle.plate}) ให้ครบ 4 ด้าน รูปนี้จะอยู่ในใบตกลงที่แขกกดยอมรับ</p>
        <PhotoCapture vehicle={b.vehicle} photos={photos} onChange={setPhotos} fuel={fuel} onFuel={setFuel} />
        <ErrorNote error={error} />
        <button type="button" className="btn btn-primary btn-block" disabled={photos.length < 4} onClick={submit}>ส่งใบตกลงให้แขก</button>
      </main>
    </>
  );
}

export function ReturnPage() {
  const b = useBookingById();
  const { shopId, shop, refresh } = useShop();
  const nav = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [fuel, setFuel] = useState('full');
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  if (!b) return null;

  const hasFromGuest = b.handoffs.some((h) => h.stage === 'from_guest');
  const hasShopCheck = b.handoffs.some((h) => h.stage === 'runner_shop');
  const stage = b.dropoff.mode === 'shop'
    ? (hasFromGuest ? null : 'from_guest')
    : (hasShopCheck ? null : 'runner_shop');

  const submitPhotos = async () => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/handoff`, { stage, photos, fuel });
      setPhotos([]);
      await refresh();
    } catch (e) { setError(e); }
  };
  const close = async () => {
    const items = picked.map((i) => {
      const r = (b.agreement.rules || shop.rules).repairs[i];
      return { label: r.th || r.en, labelEn: r.en, labelZh: r.zh || '', price: r.price };
    });
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/close`, { damage: items.length ? { items, note } : null });
      await refresh();
      nav(`/booking/${b.id}`, { replace: true });
    } catch (e) { setError(e); }
  };
  const repairs = (b.agreement.rules || shop.rules).repairs;
  const total = picked.reduce((s, i) => s + (repairs[i].price || 0), 0);

  return (
    <>
      <Top title={stage ? 'รับรถคืน' : 'ตรวจรูปและปิดงาน'} back={`/booking/${b.id}`} />
      <main className="page">
        {stage ? (
          <>
            <p className="muted">ถ่าย {b.vehicle.name} ({b.vehicle.plate}) ให้ครบ 4 ด้าน{stage === 'runner_shop' ? ' เพื่อตรวจรับจากคนเดินรถ' : ''}</p>
            <PhotoCapture vehicle={b.vehicle} photos={photos} onChange={setPhotos} fuel={fuel} onFuel={setFuel} />
            <ErrorNote error={error} />
            <button type="button" className="btn btn-primary btn-block" disabled={photos.length < 4} onClick={submitPhotos}>บันทึกรูป แล้วเทียบกับตอนส่ง</button>
          </>
        ) : (
          <>
            <DamageNote handoffs={b.handoffs} />
            <PhotoCompare booking={b} />
            <div className="stack-s">
              <h3>มีค่าเสียหายไหม</h3>
              <p className="small muted">ราคาตามใบตกลงที่แขกกดยอมรับไว้</p>
              {repairs.map((r, i) => (
                <label className="check-row" key={i}>
                  <input type="checkbox" checked={picked.includes(i)} onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))} />
                  <span className="grow">{r.th || r.en}</span>
                  <span className="bold num">{r.price === null ? 'ตามใบเสร็จ' : baht(r.price)}</span>
                </label>
              ))}
              {picked.length > 0 && (
                <>
                  <div className="field"><label htmlFor="note">หมายเหตุ</label><input id="note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  <div className="sum-row bold"><span>รวมค่าเสียหาย</span><span className="num">{baht(total)}</span></div>
                </>
              )}
            </div>
            <ErrorNote error={error} />
            <button type="button" className="btn btn-primary btn-block" onClick={close}>{picked.length ? 'บันทึกค่าเสียหายและปิดงาน' : 'ไม่มีความเสียหาย ปิดงาน'}</button>
          </>
        )}
        {b.handoffs.length > 0 && <p className="small faint">น้ำมันตอนส่ง: {FUEL[b.handoffs.find((h) => h.stage === 'to_guest')?.fuel]?.th ?? '-'}</p>}
      </main>
    </>
  );
}

export function WalkInPage() {
  const { vehicles, shopId, refresh } = useShop();
  const nav = useNavigate();
  const today = todayIso();
  const [vehicleId, setVehicleId] = useState('');
  const [to, setTo] = useState(today);
  const [guest, setGuest] = useState({ name: '', whatsapp: '', license: '' });
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/api/partner/${shopId}/walkin`, { vehicleId, from: today, to, guest });
      await refresh();
      nav(`/booking/${res.id}/handoff`, { replace: true });
    } catch (err) { setError(err); }
  };
  return (
    <form onSubmit={submit}>
      <Top title="คีย์แขก walk-in" back="/" />
      <main className="page">
        <p className="muted">แขกเดินเข้าร้าน ไม่เสียค่าธรรมเนียม กรอกสั้นๆ แล้วถ่ายรูปส่งมอบได้เลย ข้อมูลลงปฏิทินให้เอง</p>
        <div className="field">
          <label htmlFor="w-v">รถ</label>
          <select id="w-v" required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">เลือกรถ</option>
            {vehicles.filter((v) => v.active).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.plate} · {baht(v.pricePerDay)}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="w-to">คืนวันที่ (วันนี้ = เช่าวันเดียว)</label><input id="w-to" type="date" required min={today} value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="field"><label htmlFor="w-n">ชื่อแขก</label><input id="w-n" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="w-p">เบอร์ / WhatsApp</label><input id="w-p" value={guest.whatsapp} onChange={(e) => setGuest({ ...guest, whatsapp: e.target.value })} /></div>
        <div className="field"><label htmlFor="w-l">เลขใบขับขี่</label><input id="w-l" value={guest.license} onChange={(e) => setGuest({ ...guest, license: e.target.value })} /></div>
        <ErrorNote error={error} />
        <button className="btn btn-primary btn-block"><Camera size={18} />ถัดไป ถ่ายรูปส่งมอบ</button>
      </main>
    </form>
  );
}
