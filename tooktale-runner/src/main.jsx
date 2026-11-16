import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Bike, Camera, Check, ClipboardList, Clock, History, LogOut, MapPin, Phone, Store, User } from 'lucide-react';
import {
  AgreementQuick, DemoStrip, ErrorNote, EvidenceChain, JOB_KIND, JobChip, Loading, Logo, MockLineLogin, PhotoCapture, Qr, Sheet, Toasts,
  api, appUrl, baht, fmtDay, useLive, useMeta, useStored,
} from '@tooktale/shared';
import './styles.css';

const Ctx = createContext(null);
const useRunner = () => useContext(Ctx);

function JobCard({ j, action }) {
  const deliver = j.kind === 'deliver';
  return (
    <div className="card stack-s job-card">
      <Link to={`/job/${j.id}`} style={{ textDecoration: 'none' }} className="stack-s">
        <div className="between">
          <span className={`kind ${deliver ? 'deliver' : 'collect'}`}>
            {deliver ? <ArrowUpFromLine size={15} /> : <ArrowDownToLine size={15} />}{JOB_KIND[j.kind].th}
          </span>
          <JobChip status={j.status} />
        </div>
        <div className="row small"><Clock size={15} /><span className="bold">{fmtDay(j.date)} · {j.time}</span></div>
        <div className="route">
          <div className="row small"><Store size={15} />{deliver ? j.shop.name : j.point.name}</div>
          <div className="row small"><MapPin size={15} />{deliver ? j.point.name : j.shop.name}</div>
        </div>
        <div className="row small muted"><Bike size={15} />{j.vehicle.name} · {j.vehicle.plate}</div>
      </Link>
      {action}
    </div>
  );
}

function OpenPage() {
  const { open, runner, refresh } = useRunner();
  const [error, setError] = useState(null);
  const take = async (j) => {
    try {
      await api.post(`/api/runner/${runner.id}/jobs/${j.id}/accept`);
      refresh();
    } catch (e) { setError(e); }
  };
  return (
    <main className="page page-tabbed">
      <h2>งานใหม่</h2>
      <ErrorNote error={error} />
      {open.length === 0 && <div className="empty">ยังไม่มีงานใหม่</div>}
      {open.map((j) => (
        <JobCard key={j.id} j={j} action={<button type="button" className="btn btn-primary btn-block" onClick={() => take(j)}><Check size={18} />รับงาน</button>} />
      ))}
    </main>
  );
}

function MinePage() {
  const { mine } = useRunner();
  return (
    <main className="page page-tabbed">
      <h2>งานของฉัน</h2>
      {mine.length === 0 && <div className="empty">ไม่มีงานค้าง ไปดูงานใหม่ได้เลย</div>}
      {mine.map((j) => <JobCard key={j.id} j={j} />)}
    </main>
  );
}

function DonePage() {
  const { done, runner, logout } = useRunner();
  return (
    <main className="page page-tabbed">
      <h2>ประวัติงาน</h2>
      <div className="stat"><div className="label">งานที่ทำเสร็จ</div><div className="value">{done.length}</div></div>
      {done.map((j) => <JobCard key={j.id} j={j} />)}
      <p className="small muted row"><User size={15} />{runner.name}</p>
      <button type="button" className="btn btn-ghost btn-block" onClick={logout}><LogOut size={17} />ออกจากระบบ</button>
    </main>
  );
}

function stepsOf(j) {
  const accepted = j.booking.agreement.status === 'accepted';
  if (j.kind === 'deliver') {
    return [
      { title: 'รับงาน', done: j.status !== 'open' },
      { title: 'รับรถจากร้าน ถ่ายรูป 4 ด้าน', done: ['picked', 'delivered'].includes(j.status) },
      { title: 'ร้านยืนยันรูปตรงกัน', done: !!j.shopConfirmedAt },
      { title: 'ส่งถึงจุด ถ่ายรูป 4 ด้าน', done: j.status === 'delivered' },
      { title: 'แขกกดยอมรับใบตกลง', done: accepted },
    ];
  }
  return [
    { title: 'รับงาน', done: j.status !== 'open' },
    { title: 'รับรถคืนจากแขก ถ่ายรูป 4 ด้าน', done: ['picked', 'delivered'].includes(j.status) },
    { title: 'เอารถกลับถึงร้าน ร้านตรวจรับ', done: j.status === 'delivered' },
  ];
}

function GuestAccept({ j }) {
  const { refresh } = useRunner();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const url = meta ? appUrl(meta, 'tooktale', `/b/${j.booking.token}/agreement`) : '';
  const rules = j.booking.agreement.rules;
  const accept = async (lang, selfie) => {
    await api.post(`/api/b/${j.booking.token}/accept`, { on: 'runner_phone', lang, selfie });
    setOpen(false);
    refresh();
  };
  return (
    <div className="card stack center" style={{ alignItems: 'center' }}>
      <h3>ให้แขกกดยอมรับใบตกลง</h3>
      <Qr value={url} size={180} />
      <p className="small muted">แขกได้ลิงก์ทางอีเมลแล้ว หรือสแกนจากจอนี้</p>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>แขกกดบนมือถือเครื่องนี้</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Rental agreement">
        {rules && <AgreementQuick rules={rules} guestLang={j.booking.lang} onAccept={accept} />}
      </Sheet>
    </div>
  );
}

function Capture({ j, title, button }) {
  const { runner, refresh } = useRunner();
  const [photos, setPhotos] = useState([]);
  const [fuel, setFuel] = useState('full');
  const [error, setError] = useState(null);
  const submit = async () => {
    try {
      await api.post(`/api/runner/${runner.id}/jobs/${j.id}/step`, { photos, fuel });
      setPhotos([]);
      refresh();
    } catch (e) { setError(e); }
  };
  return (
    <div className="stack">
      <h3>{title}</h3>
      <PhotoCapture vehicle={j.vehicle} photos={photos} onChange={setPhotos} fuel={fuel} onFuel={setFuel} />
      <ErrorNote error={error} />
      <button type="button" className="btn btn-primary btn-block" disabled={photos.length < 4} onClick={submit}><Camera size={18} />{button}</button>
    </div>
  );
}

function NextAction({ j }) {
  const { runner, refresh } = useRunner();
  const [error, setError] = useState(null);
  const mine = j.runnerId === runner.id;
  const take = async () => {
    try {
      await api.post(`/api/runner/${runner.id}/jobs/${j.id}/accept`);
      refresh();
    } catch (e) { setError(e); }
  };
  if (j.status === 'open') {
    return <><ErrorNote error={error} /><button type="button" className="btn btn-primary btn-block" onClick={take}><Check size={18} />รับงาน</button></>;
  }
  if (!mine) return <div className="callout callout-warn">งานนี้มีคนรับไปแล้ว</div>;
  if (j.kind === 'deliver') {
    if (j.status === 'accepted') return <Capture j={j} title={`ไปรับรถที่ ${j.shop.name}`} button="ยืนยันรับรถ" />;
    if (j.status === 'picked' && !j.shopConfirmedAt) return <div className="callout callout-warn" data-testid="wait-shop">รอร้านกดยืนยันว่ารูปตรงกัน</div>;
    if (j.status === 'picked') return <Capture j={j} title={`ถึง ${j.point.name} แล้ว ถ่ายรูปรถ`} button="ส่งรถถึงจุดแล้ว" />;
    if (j.booking.agreement.status === 'ready') return <GuestAccept j={j} />;
    return <div className="callout callout-good"><Check size={18} />เสร็จงานนี้แล้ว</div>;
  }
  if (j.status === 'accepted') {
    if (j.booking.status !== 'active') return <div className="callout callout-warn">แขกยังไม่ได้เริ่มเช่า งานนี้จะทำได้เมื่อถึงวันคืน</div>;
    return <Capture j={j} title={`รับรถคืนจากแขกที่ ${j.point.name}`} button="ยืนยันรับรถจากแขก" />;
  }
  if (j.status === 'picked') {
    const backToShop = async () => {
      await api.post(`/api/runner/${runner.id}/jobs/${j.id}/step`, {});
      refresh();
    };
    return <button type="button" className="btn btn-primary btn-block" onClick={backToShop}><Store size={18} />ถึงร้านแล้ว</button>;
  }
  return <div className="callout callout-good"><Check size={18} />ส่งรถคืนร้านแล้ว ร้านจะตรวจรับต่อ</div>;
}

function JobPage() {
  const { id } = useParams();
  const { open, mine, done } = useRunner();
  const j = [...open, ...mine, ...done].find((x) => x.id === id);
  if (!j) return <div className="page"><p>ไม่พบงาน</p><Link to="/mine" className="btn btn-ghost">กลับ</Link></div>;
  const steps = stepsOf(j);
  const current = steps.findIndex((s) => !s.done);
  return (
    <>
      <header className="topbar">
        <Link to={j.status === 'open' ? '/' : '/mine'} className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
        <h2 className="grow clip">{JOB_KIND[j.kind].th} · {j.booking.code}</h2>
        <JobChip status={j.status} />
      </header>
      <main className="page">
        <div className="card stack-s">
          <div className="row"><Clock size={16} /><span className="bold">{fmtDay(j.date)} · {j.time}</span></div>
          <div className="row"><Store size={16} />{j.shop.name}<span className="faint small">{j.shop.phone}</span></div>
          <div className="row"><MapPin size={16} />{j.point.name}</div>
          <div className="row"><Bike size={16} />{j.vehicle.name} · {j.vehicle.plate}</div>
          <div className="row"><User size={16} />{j.booking.guest.name}</div>
          {j.booking.guest.whatsapp && <div className="row"><Phone size={16} />{j.booking.guest.whatsapp}</div>}
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={s.title} className={`step ${s.done ? 'done' : ''} ${i === current ? 'now' : ''}`}>
              <span className="step-dot">{s.done ? '✓' : i + 1}</span>
              <span className={i === current ? 'bold' : 'muted'}>{s.title}</span>
            </div>
          ))}
        </div>
        <NextAction j={j} />
        {j.handoffs.length > 0 && (
          <div className="stack">
            <h3>รูปทุกครั้งที่รถเปลี่ยนมือ</h3>
            <EvidenceChain booking={{ handoffs: j.handoffs, vehicle: j.vehicle }} />
          </div>
        )}
      </main>
    </>
  );
}

function Tabs({ open, mine }) {
  return (
    <nav className="tabbar" aria-label="เมนูหลัก">
      <NavLink to="/" end><ClipboardList size={22} />งานใหม่{open > 0 && <span className="badge">{open}</span>}</NavLink>
      <NavLink to="/mine"><Bike size={22} />งานของฉัน{mine > 0 && <span className="badge">{mine}</span>}</NavLink>
      <NavLink to="/done"><History size={22} />ประวัติ</NavLink>
    </nav>
  );
}

function Signed({ runnerId, logout }) {
  const live = useLive(() => api.get(`/api/runner/${runnerId}/overview`), [runnerId]);
  const nav = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (!live.data) return <Loading />;
  const { open, mine } = live.data;
  return (
    <Ctx.Provider value={{ ...live.data, refresh: live.refresh, logout }}>
      <Toasts match={(n) => n.role === 'runner' && (n.targetId === null || n.targetId === runnerId)} onOpen={(link) => nav(link)} />
      {!pathname.startsWith('/job/') && <header className="topbar"><div className="grow"><Logo suffix="runner" light size={18} /></div></header>}
      <Routes>
        <Route path="/" element={<OpenPage />} />
        <Route path="/mine" element={<MinePage />} />
        <Route path="/done" element={<DonePage />} />
        <Route path="/job/:id" element={<JobPage />} />
      </Routes>
      {!pathname.startsWith('/job/') && <Tabs open={open.length} mine={mine.length} />}
    </Ctx.Provider>
  );
}

// บริการส่งรถถึงจุดปิดไว้จนกว่าจะมี payment gateway (decisions/runner-paused-2026-11-09) · nakola เปิดได้ที่ Admin → คนเดินรถ
function Paused() {
  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '80dvh' }} data-testid="runner-paused">
      <div className="stack center" style={{ alignItems: 'center', gap: 14 }}>
        <Logo suffix="runner" light size={26} />
        <h2>ปิดให้บริการชั่วคราว</h2>
        <p className="muted">งานส่งรถ-รับรถคืนถึงจุด ยังไม่เปิด รอระบบรับชำระเงินออนไลน์ (payment gateway) ก่อน</p>
        <p className="tiny faint">ตอนนี้แขกรับ-คืนรถที่ร้านอย่างเดียว</p>
      </div>
    </div>
  );
}

function App() {
  const [runnerId, setRunnerId] = useStored('tt.runner.id', null);
  const meta = useMeta();
  const { data: accounts } = useLive(() => api.get('/api/runner/accounts'), []);
  let body;
  if (!meta) body = <Loading />;
  else if (!meta.runnerEnabled) body = <Paused />;
  else if (runnerId) body = <Signed runnerId={runnerId} logout={() => setRunnerId(null)} />;
  else {
    body = (
      <MockLineLogin
        brand={<Logo suffix="runner" light size={26} />}
        hint="รับงานส่งรถ-รับรถคืน สำหรับคนในพื้นที่"
        accounts={(accounts || []).map((a) => ({ id: a.id, title: a.name, sub: a.area }))}
        onPick={(a) => setRunnerId(a.id)}
      />
    );
  }
  return (
    <BrowserRouter>
      <div className="phone">
        <DemoStrip />
        {body}
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
