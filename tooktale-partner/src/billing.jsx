import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { ErrorNote, Loading, SelfieView, Sheet, api, baht, fmtDate, fmtStamp, shrinkImage, useLive } from '@tooktale/shared';
import { useShop } from './ctx.js';

// ใบแจ้งยอดค่าธรรมเนียม tooktale: เจ้าของร้านเท่านั้น (decisions/guest-fee-billing-2026-11-09)
// เงินนี้คือค่าธรรมเนียมที่แขกจ่ายร้านพร้อมค่าเช่า ร้านเก็บแทน nakola · ไม่ใช่การหักจากราคาร้าน
export const BILL_STATUS = {
  open: ['รอบนี้ ยังไม่ปิด', ''],
  nothing: ['ไม่มียอด', ''],
  unpaid: ['รอโอน', 'warn'],
  overdue: ['เกินกำหนด', 'bad'],
  reported: ['แจ้งโอนแล้ว รอ nakola ตรวจ', 'accent'],
  paid: ['ได้รับเงินแล้ว', 'good'],
};
const monthTh = (p) => new Date(`${p}-15T12:00:00`).toLocaleDateString('th-TH-u-ca-gregory', { month: 'long', year: 'numeric' });

function Top() {
  return (
    <header className="topbar">
      <Link to="/more" className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
      <h2 className="grow clip">ค่าธรรมเนียม tooktale</h2>
    </header>
  );
}

function SlipInput({ value, onChange }) {
  const input = useRef(null);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (file) onChange({ dataUrl: await shrinkImage(file, 720), takenAt: new Date().toISOString(), source: 'file' });
    e.target.value = '';
  };
  return (
    <div className="row" style={{ alignItems: 'center' }}>
      {value ? <SelfieView selfie={value} size={72} caption="สลิป" kind="slip" /> : null}
      <div className="stack-s grow">
        <button type="button" className="btn btn-ghost btn-s" onClick={() => input.current?.click()}><Camera size={15} />{value ? 'เปลี่ยนสลิป' : 'แนบสลิป'}</button>
        <button type="button" className="btn btn-ghost btn-s" onClick={() => onChange({ simulated: true, takenAt: new Date().toISOString() })}>เดโม่: จำลองสลิป</button>
      </div>
      <input ref={input} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} aria-label="แนบสลิป" data-testid="slip-input" />
    </div>
  );
}

function Statement({ st, open, onToggle, onPay }) {
  const [label, tone] = BILL_STATUS[st.status];
  const payable = ['unpaid', 'overdue'].includes(st.status);
  return (
    <div className="card stack-s" data-testid={`statement-${st.period}`}>
      <button type="button" className="between" style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }} onClick={onToggle} aria-expanded={open}>
        <span>
          <span className="bold">{monthTh(st.period)}</span><br />
          <span className="small muted">{st.items.length} การจอง{st.closed && st.total > 0 ? ` · โอนภายใน ${fmtDate(st.due)}` : ''}</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span className="bold num" style={{ fontSize: 18 }}>{baht(st.total)}</span><br />
          <span className={`chip ${tone ? `chip-${tone}` : ''}`}>{label}</span>
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {!st.closed && st.upcomingFee > 0 && <p className="tiny muted">อีก {baht(st.upcomingFee)} จากการจองที่ยังไม่คืนรถ จะเข้ารอบที่คืนรถ</p>}
      {open && (
        <div className="stack-s">
          {st.items.length === 0 && <p className="small muted">ยังไม่มีการจองที่คืนรถในรอบนี้</p>}
          {st.items.map((i) => (
            <Link to={`/booking/${i.id}`} className="sum-row small" key={i.id} style={{ textDecoration: 'none' }}>
              <span>{i.code} · {i.guest}<br /><span className="tiny muted">{fmtDate(i.from)}–{fmtDate(i.to)} · ค่าเช่า {baht(i.rentTotal)} × {i.feePct}%</span></span>
              <span className="num bold">{baht(i.fee)}</span>
            </Link>
          ))}
          {st.status === 'reported' && <p className="small muted">แจ้งโอนโดย {st.reportedBy} · {fmtStamp(st.reportedAt)}</p>}
          {st.status === 'paid' && <p className="small muted">nakola ได้รับเงิน {fmtStamp(st.paidAt)}</p>}
        </div>
      )}
      {payable && <button type="button" className="btn btn-primary btn-block" onClick={onPay}>โอนแล้ว แจ้ง nakola</button>}
    </div>
  );
}

export function BillingPage() {
  const { shopId, isOwner } = useShop();
  const live = useLive(() => (isOwner ? api.get(`/api/partner/${shopId}/billing`) : Promise.resolve(null)), [shopId, isOwner]);
  const [open, setOpen] = useState(null);
  const [paying, setPaying] = useState(null);
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState(null);
  if (!isOwner) {
    return (
      <>
        <Top />
        <main className="page page-tabbed"><div className="callout callout-info" data-testid="owner-only">ใบแจ้งยอดค่าธรรมเนียม ดูได้เฉพาะเจ้าของร้าน</div></main>
      </>
    );
  }
  if (!live.data) return <Loading />;
  const { statements, bank, feePct, trialUntil } = live.data;
  const due = statements.filter((s) => ['unpaid', 'overdue'].includes(s.status)).reduce((s, x) => s + x.total, 0);
  const report = async () => {
    try {
      await api.post(`/api/partner/${shopId}/billing/${paying.period}/report`, { slip });
      setPaying(null);
      setSlip(null);
      live.refresh();
    } catch (e) { setError(e); }
  };
  return (
    <>
      <Top />
      <main className="page page-tabbed">
        <div className="card stack-s">
          <div className="row"><Receipt size={20} style={{ color: 'var(--accent)' }} /><span className="bold grow">ยอดที่ต้องโอน</span><span className="bold num" style={{ fontSize: 22 }} data-testid="due-total">{baht(due)}</span></div>
          <p className="small muted">แขกที่จองผ่าน tooktale จ่าย<b>ค่าธรรมเนียม {feePct}% ของค่าเช่า</b> ให้ร้านเป็นเงินสดพร้อมค่าเช่า · ร้านเก็บแทน แล้วโอนให้ nakola เดือนละครั้ง · <b>ร้านยังได้ราคาของร้านเต็ม 100%</b> · walk-in ไม่มีค่าธรรมเนียม · จองก่อน {fmtDate(trialUntil)} ฟรี (ช่วงทดลอง)</p>
          <p className="tiny faint">เห็นหน้านี้ได้เฉพาะเจ้าของร้าน</p>
        </div>
        <ErrorNote error={error} />
        {statements.map((st) => (
          <Statement key={st.period} st={st} open={open === st.period} onToggle={() => setOpen(open === st.period ? null : st.period)} onPay={() => setPaying(st)} />
        ))}
      </main>
      <Sheet open={!!paying} onClose={() => setPaying(null)} title="แจ้งโอนค่าธรรมเนียม">
        {paying && (
          <div className="stack">
            <div className="card stack-s">
              <div className="sum-row"><span className="muted">รอบ</span><span className="bold">{monthTh(paying.period)}</span></div>
              <div className="sum-row"><span className="muted">ยอด</span><span className="bold num">{baht(paying.total)}</span></div>
              <div className="sum-row"><span className="muted">โอนเข้า</span><span className="small" style={{ textAlign: 'right' }}>{bank.bank}<br />{bank.name}<br /><b className="num">{bank.number}</b></span></div>
            </div>
            <SlipInput value={slip} onChange={setSlip} />
            <button type="button" className="btn btn-primary btn-block" disabled={!slip} onClick={report}>แจ้งโอนแล้ว</button>
            <p className="tiny faint center">nakola ตรวจยอดแล้วยืนยันกลับ · ร้านจะได้ข้อความ LINE (เฉพาะเจ้าของ)</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
