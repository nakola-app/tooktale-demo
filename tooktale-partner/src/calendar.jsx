import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo, Sheet, addDays, api, fmtDate, toDate, todayIso } from '@tooktale/shared';
import { useShop } from './ctx.js';

const SPAN = 24;
const ACTIVE = ['requested', 'confirmed', 'active', 'returned', 'completed'];

export function CalendarPage() {
  const { vehicles, bookings, blocks, shopId, refresh } = useShop();
  const nav = useNavigate();
  const today = todayIso();
  const start = addDays(today, -3);
  const days = Array.from({ length: SPAN }, (_, i) => addDays(start, i));
  const [sheet, setSheet] = useState(null);
  const [reason, setReason] = useState('');

  const cell = (v, day) => {
    const bk = bookings.find((b) => b.vehicleId === v.id && ACTIVE.includes(b.status) && day >= b.from && day <= b.to);
    if (bk) return { kind: bk.status === 'requested' ? 'requested' : bk.source === 'walkin' ? 'walkin' : 'online', from: bk.from, to: bk.to, booking: bk };
    const bl = blocks.find((k) => k.vehicleId === v.id && day >= k.from && day <= k.to);
    if (bl) return { kind: 'block', from: bl.from, to: bl.to, block: bl };
    return null;
  };
  const outside = (v, day) => (v.rentFrom && day < v.rentFrom) || (v.rentTo && day > v.rentTo);

  const closeDay = async () => {
    await api.post(`/api/partner/${shopId}/blocks`, { vehicleId: sheet.vehicle.id, from: sheet.day, to: sheet.day, reason: reason || 'ปิดวัน' });
    setSheet(null);
    setReason('');
    refresh();
  };
  const openDay = async () => {
    await api.del(`/api/partner/${shopId}/blocks/${sheet.block.id}`);
    setSheet(null);
    refresh();
  };

  return (
    <>
      <header className="topbar"><div className="grow"><Logo suffix="partner" size={18} /></div></header>
      <main className="page page-tabbed">
        <div>
          <h2>ปฏิทินรายคัน</h2>
          <p className="small muted">booking ทุกใบลงที่นี่เอง ไม่ต้องคีย์แยก แตะช่องว่างเพื่อปิดวัน</p>
        </div>
        <div className="legend-row">
          <span><i style={{ background: 'var(--accent)' }} />จองออนไลน์</span>
          <span><i style={{ background: 'var(--coral)' }} />walk-in</span>
          <span><i style={{ background: '#f3c76a' }} />คำขอรอตอบ</span>
          <span><i style={{ background: '#8a948e' }} />ปิดวัน</span>
        </div>
        <div className="gantt" data-testid="gantt">
          <div className="gantt-grid" style={{ gridTemplateColumns: `104px repeat(${SPAN}, 36px)` }}>
            <div className="g-head g-corner" />
            {days.map((d) => (
              <div key={d} className={`g-head ${d === today ? 'today' : ''}`}>
                {toDate(d).toLocaleDateString('th-TH', { weekday: 'narrow' })}<br />{Number(d.slice(8))}
              </div>
            ))}
            {vehicles.map((v) => [
              <div className="g-side" key={v.id}>
                <span className="small bold clip">{v.plate}</span>
                <span className="tiny faint clip">{v.name.replace(/^(Honda|Yamaha) /, '')}</span>
              </div>,
              ...days.map((d) => {
                const c = cell(v, d);
                const off = !c && outside(v, d);
                const label = c?.booking ? `${c.booking.guest.name} ${fmtDate(c.from)}-${fmtDate(c.to)}` : c?.block ? c.block.reason : off ? 'นอกช่วงปล่อยเช่า' : `${v.plate} ${fmtDate(d)} ว่าง`;
                return (
                  <button
                    key={`${v.id}${d}`} type="button" title={label} aria-label={label}
                    className={`g-cell ${d === today ? 'today' : ''} ${off ? 'off' : ''}`}
                    onClick={() => {
                      if (c?.booking) nav(`/booking/${c.booking.id}`);
                      else if (!off) setSheet({ vehicle: v, day: d, block: c?.block });
                    }}
                  >
                    {c && <span className={`bar ${c.kind} ${d === c.from ? 'first' : ''} ${d === c.to ? 'last' : ''}`} />}
                  </button>
                );
              }),
            ])}
          </div>
        </div>
        <p className="tiny faint">ลายทแยงคือช่วงที่ไม่ปล่อยเช่า เช่น รถครอบครัวที่ปล่อยเฉพาะไฮซีซั่น</p>
      </main>
      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet ? `${sheet.vehicle.plate} · ${fmtDate(sheet.day)}` : ''}>
        {sheet?.block ? (
          <>
            <p>ปิดอยู่: {sheet.block.reason}</p>
            <button type="button" className="btn btn-primary btn-block" onClick={openDay}>เปิดวันกลับมา</button>
          </>
        ) : (
          <>
            <div className="field"><label htmlFor="reason">เหตุผล</label><input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น เข้าอู่ เอาไปใช้เอง" /></div>
            <button type="button" className="btn btn-primary btn-block" onClick={closeDay}>ปิดวันนี้</button>
          </>
        )}
      </Sheet>
    </>
  );
}
