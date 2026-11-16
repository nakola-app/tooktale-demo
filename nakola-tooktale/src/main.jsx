import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Activity, Bike, CalendarCheck, LayoutDashboard, MapPinned, Palmtree, Receipt, RotateCcw, Store, Users, X } from 'lucide-react';
import {
  ErrorNote, EvidenceChain, SelfieView, IslandMap, JOB_KIND, JobChip, Loading, Logo, PhotoCompare, StatusChip, api, baht, fmtDate, fmtRange, fmtStamp, gapTh, pct, useLive,
} from '@tooktale/shared';
import './styles.css';

const Ctx = createContext(null);
const useAdmin = () => useContext(Ctx);

const SHOP_STATUS = { active: ['เปิดใช้งาน', 'good'], pending: ['รอตรวจสอบ', 'warn'], closed: ['ปิดบัญชี', 'bad'] };
function Switch({ checked, on, off, onChange }) {
  const [value, setValue] = useState(checked);
  useEffect(() => { setValue(checked); }, [checked]);
  return (
    <label className="switch">
      <input type="checkbox" checked={value} onChange={(e) => { setValue(e.target.checked); onChange(e.target.checked); }} />
      <span>{value ? on : off}</span>
    </label>
  );
}

function Overview() {
  const { shops, bookings, jobs, notifications, runners } = useAdmin();
  const nav = useNavigate();
  const live = shops.filter((s) => s.status === 'active');
  const onRent = bookings.filter((b) => b.status === 'active').length;
  const requests = bookings.filter((b) => b.status === 'requested').length;
  const openJobs = jobs.filter((j) => j.status === 'open').length;
  const cases = bookings.filter((b) => b.damage);
  const t = live.reduce((a, s) => ({
    online: a.online + s.analytics.totals.online,
    walkin: a.walkin + s.analytics.totals.walkin,
    days: a.days + s.analytics.totals.rentedDays,
  }), { online: 0, walkin: 0, days: 0 });
  const tile = (label, value, sub) => <div className="stat"><div className="label">{label}</div><div className="value">{value}</div>{sub && <div className="tiny faint">{sub}</div>}</div>;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>ภาพรวม</h1>
      <div className="tiles">
        {tile('ร้านที่เปิดใช้งาน', live.length, `${shops.length - live.length} ร้านรอตรวจ/ปิด`)}
        {tile('รถกำลังเช่า', onRent, `${requests} คำขอรอร้านตอบ`)}
        {tile('งานรอคนรับ', openJobs, `คนเดินรถ ${runners.filter((r) => r.status === 'active').length} คน`)}
        {tile('เคสที่ปิดด้วยหลักฐาน', cases.length, 'เป้า 6 เดือน: ≥ 1 เคสจริง')}
        {tile('วันเช่า 30 วันล่าสุด', t.days, `ออนไลน์ ${t.online} · walk-in ${t.walkin} ใบ`)}
      </div>
      <div className="two">
        <section className="card stack-s">
          <h2>รายร้าน 30 วันล่าสุด</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ร้าน</th><th className="r">รถ</th><th className="r">% วันรถออก</th><th className="r">วันเช่า</th><th className="r">ออนไลน์</th><th className="r">walk-in</th><th className="r">ส่งถึงจุด</th><th className="r" title="ยืนยันอัตโนมัติ / ร้านยกเลิกเอง / ร้านเปลี่ยนรถ" style={{ lineHeight: 1.25 }}>อัตโนมัติ /<br />ยกเลิก / เปลี่ยน</th></tr></thead>
              <tbody>
                {live.map((s) => {
                  const a = s.analytics.totals;
                  return <tr key={s.id}><td>{s.name}</td><td className="r num">{s.vehicleCount}</td><td className="r num">{pct(a.utilization)}</td><td className="r num">{a.rentedDays}</td><td className="r num">{a.online}</td><td className="r num">{a.walkin}</td><td className="r num">{a.withDelivery}</td><td className="r num" style={{ whiteSpace: 'nowrap' }}>{a.autoConfirmed} / {a.shopCancelled} / {a.swapped}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <p className="tiny faint">ตัวเลขสมมุติในเดโม่ ใช้เป็นหน้าตาของ unit economics ที่ต้องเก็บจากของจริง</p>
        </section>
        <section className="card stack-s">
          <h2>เคสเสียหายล่าสุด</h2>
          {cases.length === 0 && <p className="small faint">ยังไม่มี</p>}
          {cases.map((b) => (
            <button key={b.id} type="button" className="plain" onClick={() => nav(`/bookings?open=${b.id}`)}>
              <span className="bold">{b.code} · {b.guest.name}</span>
              <span className="small muted">{b.shop.name} · {b.damage.items.map((d) => d.label).join(', ')}</span>
            </button>
          ))}
        </section>
      </div>
      <section className="card stack-s">
        <h2>ความเคลื่อนไหวล่าสุด</h2>
        <Feed items={notifications.slice(0, 8)} />
      </section>
    </div>
  );
}

const ROLE = { shop: 'ร้าน', runner: 'คนเดินรถ', guest: 'แขก' };
function Feed({ items }) {
  if (!items.length) return <p className="small faint">ยังไม่มี ลองจองจากแอป tooktale แล้วรายการจะขึ้นที่นี่ทันที</p>;
  return (
    <div className="feed">
      {items.map((n) => (
        <div key={n.id} className="feed-row">
          <span className="tiny faint num">{fmtStamp(n.at)}</span>
          <span className="chip">{ROLE[n.role]} · {n.channel}</span>
          <span className="small"><b>{n.title}</b> {n.body}</span>
        </div>
      ))}
    </div>
  );
}

function BookingDrawer({ b, onClose }) {
  return (
    <aside className="drawer" aria-label="รายละเอียดการจอง">
      <div className="between"><h2>{b.code}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="ปิด"><X size={20} /></button></div>
      <div className="row wrap"><StatusChip status={b.status} /><span className="chip">{b.source === 'walkin' ? 'walk-in' : 'ออนไลน์'}</span></div>
      <p>{b.guest.name} {b.guest.country && `(${b.guest.country})`}<br /><span className="small muted">{b.shop.name} · {b.vehicle.name} · {fmtRange(b.from, b.to)}</span></p>
      <div className="small muted">ค่าเช่า {baht(b.rentTotal)}{b.deliveryFee > 0 && ` · ค่าส่ง ${baht(b.deliveryFee)}`}</div>
      {b.agreement.status === 'accepted' && <div className="callout callout-good small">ใบตกลง: แขกกดยอมรับ {fmtStamp(b.agreement.acceptedAt)} · {{ guest_phone: 'มือถือแขก', shop_phone: 'เครื่องร้าน', runner_phone: 'เครื่องคนเดินรถ' }[b.agreement.acceptedOn] || 'มือถือแขก'}<SelfieView selfie={b.agreement.selfie} size={56} caption="รูปแขก" /></div>}
      {b.agreement.guestDisputedAt && <div className="callout callout-bad small">⚠️ แขกแจ้งว่าไม่ได้กดยอมรับเอง {fmtStamp(b.agreement.guestDisputedAt)} · แจ้งหลังกดยอมรับ {gapTh(b.agreement.acceptedAt, b.agreement.guestDisputedAt)} · ก่อนคืนรถ · บันทึกไว้ดูถ้ามีเรื่องทีหลัง</div>}
      {b.damage && (
        <div className="card stack-s">
          <h3>ค่าเสียหาย</h3>
          {b.damage.items.map((d) => <div className="between small" key={d.label}><span>{d.label}</span><span className="bold num">{d.price === null ? 'ตามใบเสร็จ' : baht(d.price)}</span></div>)}
          {b.damage.note && <p className="small muted">{b.damage.note}</p>}
        </div>
      )}
      <h3>หลักฐาน</h3>
      <EvidenceChain booking={b} />
      <PhotoCompare booking={b} />
    </aside>
  );
}

function Bookings() {
  const { bookings } = useAdmin();
  const params = new URLSearchParams(location.search);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(params.get('open'));
  const rows = bookings.filter((b) => (filter === 'all' ? true : filter === 'live' ? ['requested', 'confirmed', 'active', 'returned'].includes(b.status) : b.source === filter));
  const open = bookings.find((b) => b.id === openId);
  return (
    <div className="stack">
      <h1>การจอง</h1>
      <div className="row wrap">
        {[['all', 'ทั้งหมด'], ['live', 'ยังไม่จบ'], ['online', 'ออนไลน์'], ['walkin', 'walk-in']].map(([k, l]) => (
          <button key={k} type="button" className="chip-btn" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
        <span className="small faint">{rows.length} รายการ</span>
      </div>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>รหัส</th><th>แขก</th><th>ร้าน</th><th>รถ</th><th>วันที่</th><th>ที่มา</th><th>สถานะ</th></tr></thead>
          <tbody>
            {rows.slice(0, 60).map((b) => (
              <tr key={b.id} className="click" onClick={() => setOpenId(b.id)}>
                <td className="num">{b.code}</td><td>{b.guest.name}</td><td>{b.shop.name}</td><td>{b.vehicle.name}</td>
                <td className="num">{fmtRange(b.from, b.to)}</td><td>{b.source === 'walkin' ? 'walk-in' : 'ออนไลน์'}</td><td><StatusChip status={b.status} />{b.agreement.guestDisputedAt && <span className="chip chip-bad" style={{ marginLeft: 4 }}>แขกแจ้ง: ไม่ได้กดเอง</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <BookingDrawer b={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Jobs() {
  const { jobs } = useAdmin();
  return (
    <div className="stack">
      <h1>งานรับส่ง</h1>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>งาน</th><th>วันเวลา</th><th>ร้าน</th><th>จุด</th><th>รถ</th><th>คนเดินรถ</th><th>สถานะ</th></tr></thead>
          <tbody>
            {jobs.slice(0, 60).map((j) => (
              <tr key={j.id}>
                <td>{JOB_KIND[j.kind].th}</td><td className="num">{fmtDate(j.date)} {j.time}</td><td>{j.shop.name}</td><td>{j.point.name}</td><td>{j.vehicle.name}</td>
                <td>{j.runner?.name || '-'}</td><td><JobChip status={j.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Shops() {
  const { shops, refresh } = useAdmin();
  const set = async (id, status) => { await api.patch(`/api/admin/shops/${id}`, { status }); refresh(); };
  return (
    <div className="stack">
      <h1>ร้านเช่า</h1>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>ร้าน</th><th>เจ้าของร้าน · ทีม</th><th>ที่ตั้ง</th><th className="r">รถ</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {shops.map((s) => {
              const [label, tone] = SHOP_STATUS[s.status];
              return (
                <tr key={s.id}>
                  <td>{s.name}<br /><span className="tiny faint">/{s.slug}</span></td><td>{s.owner}<br /><span className="tiny faint">ทีม {s.teamSize} คน · LINE {s.lineName}</span></td><td>{s.area}</td><td className="r num">{s.vehicleCount}</td>
                  <td><span className={`chip chip-${tone}`}>{label}</span></td>
                  <td className="r">
                    {s.status !== 'active' && <button type="button" className="btn btn-primary btn-s" onClick={() => set(s.id, 'active')}>อนุมัติ</button>}
                    {s.status === 'active' && <button type="button" className="btn btn-ghost btn-s" onClick={() => set(s.id, 'closed')}>ปิดบัญชี</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Runners() {
  const { runners, refresh, config } = useAdmin();
  const set = async (id, status) => { await api.patch(`/api/admin/runners/${id}`, { status }); refresh(); };
  return (
    <div className="stack">
      <h1>คนเดินรถ</h1>
      {/* ปิดไว้จนกว่าจะมี payment gateway (decisions/runner-paused-2026-11-09) */}
      <div className={`card row ${config.runnerEnabled ? '' : 'paused'}`} data-testid="runner-switch">
        <span className="grow"><span className="bold">บริการส่งรถถึงจุด (คนเดินรถ)</span><br /><span className="small muted">{config.runnerEnabled ? 'เปิดอยู่ · แขกเลือกส่งรถถึงจุดได้' : 'ปิดอยู่ · รอระบบรับชำระเงินออนไลน์ (payment gateway) · แขกรับ-คืนที่ร้านอย่างเดียว · แอปคนเดินรถขึ้นว่าปิดชั่วคราว'}</span></span>
        <Switch checked={!!config.runnerEnabled} on="เปิด" off="ปิด" onChange={async (v) => { await api.patch('/api/admin/config', { runnerEnabled: v }); refresh(); }} />
      </div>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>ชื่อ</th><th>พื้นที่</th><th className="r">งานค้าง</th><th className="r">งานเสร็จ</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {runners.map((r) => (
              <tr key={r.id}>
                <td>{r.name}<br /><span className="tiny faint">{r.phone}</span></td><td>{r.area}</td><td className="r num">{r.jobsOpen}</td><td className="r num">{r.jobsDone}</td>
                <td><span className={`chip ${r.status === 'active' ? 'chip-good' : ''}`}>{r.status === 'active' ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span></td>
                <td className="r"><button type="button" className="btn btn-ghost btn-s" onClick={() => set(r.id, r.status === 'active' ? 'inactive' : 'active')}>{r.status === 'active' ? 'ปิด' : 'เปิด'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Points() {
  const { points, refresh } = useAdmin();
  const [name, setName] = useState('');
  const [fee, setFee] = useState(200);
  const [error, setError] = useState(null);
  const patch = async (id, body) => { await api.patch(`/api/admin/points/${id}`, body); refresh(); };
  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/points', { name, fee });
      setName('');
      refresh();
    } catch (err) { setError(err); }
  };
  return (
    <div className="stack">
      <h1>จุดรับส่ง</h1>
      <p className="muted">จุดตายตัวที่ดีลไว้แล้ว ค่าส่งคิดต่อเที่ยว แขกเห็นเฉพาะจุดที่เปิดอยู่</p>
      <div className="two">
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>จุด</th><th className="r">ค่าส่ง (บาท)</th><th>เปิดให้แขกเลือก</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="r"><input aria-label={`ค่าส่ง ${p.name}`} className="mini num" type="number" defaultValue={p.fee} onBlur={(e) => patch(p.id, { fee: Number(e.target.value) })} /></td>
                  <td><Switch checked={p.active} on="เปิด" off="ปิด" onChange={(active) => patch(p.id, { active })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="row" style={{ padding: 12 }} onSubmit={add}>
            <input className="mini grow" required aria-label="ชื่อจุดใหม่" placeholder="ชื่อจุดใหม่" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="mini num" type="number" aria-label="ค่าส่ง" style={{ width: 90 }} value={fee} onChange={(e) => setFee(e.target.value)} />
            <button className="btn btn-primary btn-s">เพิ่มจุด</button>
          </form>
          <ErrorNote error={error} />
        </div>
        <IslandMap height={380} pins={points.filter((p) => p.active).map((p, i) => ({ id: p.id, x: p.mapX, y: p.mapY, label: String(i + 1) }))} />
      </div>
    </div>
  );
}

function Spots() {
  const { spots, refresh } = useAdmin();
  const patch = async (id, body) => { await api.patch(`/api/admin/spots/${id}`, body); refresh(); };
  const shown = spots.filter((s) => s.permitted);
  return (
    <div className="stack">
      <h1>จุดเที่ยวในพื้นที่ <span className="chip chip-warn">ทดลอง</span></h1>
      <p className="muted">กติกา: จุดที่ชุมชนยังไม่อนุญาต ห้ามโชว์ ติ๊กแล้วจุดขึ้นในแอปแขกทันที</p>
      <div className="two">
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>จุด</th><th>สภาพทาง</th><th>ชุมชนอนุญาต</th><th>โชว์ให้ใคร</th></tr></thead>
            <tbody>
              {spots.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td className="small">{s.roadTh}</td>
                  <td><Switch checked={s.permitted} on="อนุญาตแล้ว" off="ยังไม่อนุญาต" onChange={(permitted) => patch(s.id, { permitted })} /></td>
                  <td>
                    <select className="mini" aria-label={`โชว์ ${s.name}`} value={s.visibility} onChange={(e) => patch(s.id, { visibility: e.target.value })}>
                      <option value="public">สาธารณะ (หน้าร้าน)</option>
                      <option value="booked">เฉพาะคนจอง</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <IslandMap height={380} pins={shown.map((s, i) => ({ id: s.id, x: s.mapX, y: s.mapY, label: String(i + 1), color: 'var(--coral)' }))} />
      </div>
    </div>
  );
}

function ActivityPage() {
  const { notifications } = useAdmin();
  return (
    <div className="stack">
      <h1>แจ้งเตือนทั้งหมด</h1>
      <p className="muted">ในเดโม่นี่คือข้อความที่ระบบจะส่งจริงทาง LINE และอีเมล</p>
      <div className="card"><Feed items={notifications} /></div>
    </div>
  );
}

// ---------- เรียกเก็บค่าธรรมเนียม: แขกจ่ายร้าน ร้านเก็บแทน แล้วโอนให้ nakola รายเดือน (decisions/guest-fee-billing-2026-11-09) ----------
const BILL_TH = {
  open: ['รอบนี้ ยังไม่ปิด', ''], nothing: ['ไม่มียอด', ''], unpaid: ['รอโอน', 'warn'],
  overdue: ['เกินกำหนด', 'bad'], reported: ['ร้านแจ้งโอนแล้ว', 'accent'], paid: ['ได้รับแล้ว', 'good'],
};
function Billing() {
  const live = useLive(() => api.get('/api/admin/billing'), []);
  const [pctDraft, setPctDraft] = useState(null);
  const [trialDraft, setTrialDraft] = useState(null);
  const [error, setError] = useState(null);
  if (!live.data) return <Loading />;
  const { config, statements } = live.data;
  const act = async (fn) => { try { setError(null); await fn(); live.refresh(); } catch (e) { setError(e); } };
  const saveConfig = () => act(() => api.patch('/api/admin/config', { feePct: Number(pctDraft ?? config.feePct), trialUntil: trialDraft ?? config.trialUntil }));
  const rows = statements.filter((s) => s.total > 0 || !s.closed).sort((a, b) => b.period.localeCompare(a.period) || a.shopName.localeCompare(b.shopName));
  const owed = statements.filter((s) => ['unpaid', 'overdue', 'reported'].includes(s.status)).reduce((s, x) => s + x.total, 0);
  return (
    <div className="stack">
      <h1>เรียกเก็บค่าธรรมเนียม</h1>
      <p className="muted small">แขกจ่ายค่าธรรมเนียม tooktale ให้ร้านเป็นเงินสดพร้อมค่าเช่า · ร้านเก็บแทน แล้วโอนให้เราตามใบแจ้งยอดรายเดือน · <b>0% จากร้าน</b> ร้านได้ราคาตัวเองเต็ม · ใบแจ้งยอดเห็นเฉพาะเจ้าของร้าน</p>
      <ErrorNote error={error} />
      <div className="row wrap" style={{ alignItems: 'stretch' }}>
        <div className="card stack-s" style={{ flex: '1 1 280px' }}>
          <h3>ตั้งค่า</h3>
          <div className="row wrap">
            <div className="field" style={{ width: 140 }}><label htmlFor="fee-pct">ค่าธรรมเนียม (% ของค่าเช่า)</label><input id="fee-pct" type="number" min="0" max="30" value={pctDraft ?? config.feePct} onChange={(e) => setPctDraft(e.target.value)} /></div>
            <div className="field" style={{ width: 180 }}><label htmlFor="trial">ทดลองฟรีถึงวันที่</label><input id="trial" type="date" value={trialDraft ?? config.trialUntil} onChange={(e) => setTrialDraft(e.target.value)} /></div>
          </div>
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveConfig}>บันทึก</button>
          <p className="tiny faint">มีผลกับการจองใหม่เท่านั้น · การจองเดิมใช้ % ตอนที่จอง · 🟡 % ยังไม่เคาะ (รอรู้ค่าธรรมเนียมของ Byklo)</p>
        </div>
        <div className="card stack-s" style={{ flex: '1 1 200px' }}>
          <span className="small muted">ค้างรับทั้งหมด</span>
          <span className="bold num" style={{ fontSize: 26 }} data-testid="owed-total">{baht(owed)}</span>
        </div>
      </div>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>รอบ</th><th>ร้าน · เจ้าของ</th><th className="r">การจอง</th><th className="r">ยอด</th><th>ครบกำหนด</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => {
              const [label, tone] = BILL_TH[s.status];
              return (
                <tr key={`${s.shopId}-${s.period}`} data-testid={`bill-${s.shopId}-${s.period}`}>
                  <td className="num">{s.period}</td>
                  <td>{s.shopName}<br /><span className="tiny faint">{s.owner}</span></td>
                  <td className="r num">{s.items.length}</td>
                  <td className="r num bold">{baht(s.total)}{!s.closed && s.upcomingFee > 0 && <><br /><span className="tiny faint">+{baht(s.upcomingFee)} ยังไม่คืนรถ</span></>}</td>
                  <td className="num">{s.closed && s.total > 0 ? fmtDate(s.due) : '-'}</td>
                  <td>
                    <span className={`chip ${tone ? `chip-${tone}` : ''}`}>{label}</span>
                    {s.status === 'reported' && <div className="row" style={{ marginTop: 4 }}><SelfieView selfie={s.slip} size={44} caption="สลิป" kind="slip" /><span className="tiny faint">{s.reportedBy}<br />{fmtStamp(s.reportedAt)}</span></div>}
                    {s.sentAt && !['paid', 'reported'].includes(s.status) && <div className="tiny faint">ส่งให้ร้านแล้ว {fmtStamp(s.sentAt)}</div>}
                  </td>
                  <td className="r">
                    {['unpaid', 'overdue'].includes(s.status) && <button type="button" className="btn btn-ghost btn-s" onClick={() => act(() => api.post(`/api/admin/billing/${s.shopId}/${s.period}/send`))}>ส่งใบแจ้งยอด</button>}
                    {['unpaid', 'overdue', 'reported'].includes(s.status) && <button type="button" className="btn btn-primary btn-s" onClick={() => act(() => api.post(`/api/admin/billing/${s.shopId}/${s.period}/paid`))}>ยืนยันได้รับเงิน</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Sidebar() {
  const [confirming, setConfirming] = useState(false);
  const reset = async () => { await api.post('/api/admin/reset'); };
  const link = (to, Icon, label) => <NavLink to={to} end={to === '/'}><Icon size={18} />{label}</NavLink>;
  return (
    <nav className="side" aria-label="เมนู">
      <div style={{ padding: '4px 8px 16px' }}><Logo role="admin" light size={18} /></div>
      {link('/', LayoutDashboard, 'ภาพรวม')}
      {link('/bookings', CalendarCheck, 'การจอง')}
      {link('/jobs', Bike, 'งานรับส่ง')}
      {link('/shops', Store, 'ร้านเช่า')}
      {link('/billing', Receipt, 'เรียกเก็บ')}
      {link('/runners', Users, 'คนเดินรถ')}
      {link('/points', MapPinned, 'จุดรับส่ง')}
      {link('/spots', Palmtree, 'จุดเที่ยว')}
      {link('/activity', Activity, 'แจ้งเตือน')}
      <div style={{ flex: 1 }} />
      {confirming
        ? <button type="button" className="reset danger" onClick={reset}>ยืนยันล้างข้อมูลเดโม่</button>
        : <button type="button" className="reset" onClick={() => setConfirming(true)}><RotateCcw size={15} />ล้างเดโม่กลับค่าเริ่มต้น</button>}
    </nav>
  );
}

function App() {
  const live = useLive(() => api.get('/api/admin/overview'), []);
  if (!live.data) return <Loading />;
  return (
    <Ctx.Provider value={{ ...live.data, refresh: live.refresh }}>
      <BrowserRouter>
        <div className="shell">
          <Sidebar />
          <main className="content">
            <div className="demo-note">เดโม่ · ข้อมูลตัวอย่างทั้งหมด</div>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/shops" element={<Shops />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/runners" element={<Runners />} />
              <Route path="/points" element={<Points />} />
              <Route path="/spots" element={<Spots />} />
              <Route path="/activity" element={<ActivityPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </Ctx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
