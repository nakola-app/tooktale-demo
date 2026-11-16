import React, { createContext, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bike, CalendarDays, Home, Menu, MessageCircle } from 'lucide-react';
import { DemoStrip, Loading, Logo, MockLineLogin, Toasts, api, setApiHeaders, useLive, useStored } from '@tooktale/shared';
import { Ctx } from './ctx.js';
import { HomePage } from './home.jsx';
import { BookingPage, HandoffPage, ReturnPage, WalkInPage } from './booking.jsx';
import { CalendarPage } from './calendar.jsx';
import { ChatListPage, ChatPage } from './chat.jsx';
import { FleetPage } from './fleet.jsx';
import { AnalyticsPage, MorePage, RulesPage, SettingsPage } from './more.jsx';
import { TeamPage, JoinPage } from './team.jsx';
import { BillingPage } from './billing.jsx';
import './styles.css';

function Tabs({ data }) {
  const pending = data.bookings.filter((b) => b.status === 'requested').length;
  const unread = data.threads.reduce((s, t) => s + t.unreadShop, 0);
  const item = (to, Icon, label, badge) => (
    <NavLink to={to} end={to === '/'}>
      <Icon size={22} />
      {label}
      {badge > 0 && <span className="badge">{badge}</span>}
    </NavLink>
  );
  return (
    <nav className="tabbar" aria-label="เมนูหลัก">
      {item('/', Home, 'วันนี้', pending)}
      {item('/calendar', CalendarDays, 'ปฏิทิน')}
      {item('/chat', MessageCircle, 'แชท', unread)}
      {item('/fleet', Bike, 'รถ')}
      {item('/more', Menu, 'เพิ่มเติม')}
    </nav>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Signed({ shopId, logout }) {
  const live = useLive(() => api.get(`/api/partner/${shopId}/overview`), [shopId]);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const hideTabs = /^\/(booking|walkin|chat\/)/.test(pathname);
  // ถูกลบออกจากทีม (หรือบัญชีใช้ไม่ได้แล้ว) = ออกจากระบบเอง
  useEffect(() => { if (live.data && !live.data.me) logout(); }, [live.data, logout]);
  if (!live.data || !live.data.me) return <Loading />;
  const isOwner = live.data.me.role === 'owner';
  return (
    <Ctx.Provider value={{ ...live.data, shopId, isOwner, refresh: live.refresh, logout }}>
      <ScrollTop />
      {/* ข้อความที่เป็นเรื่องเงินของร้าน (ownerOnly) เด้งเฉพาะเจ้าของ */}
      <Toasts match={(n) => n.role === 'shop' && n.targetId === shopId && (!n.ownerOnly || isOwner)} onOpen={(link) => nav(link)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/booking/:id" element={<BookingPage />} />
        <Route path="/booking/:id/handoff" element={<HandoffPage />} />
        <Route path="/booking/:id/return" element={<ReturnPage />} />
        <Route path="/walkin" element={<WalkInPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/chat" element={<ChatListPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/fleet" element={<FleetPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/billing" element={<BillingPage />} />
      </Routes>
      {!hideTabs && <Tabs data={live.data} />}
    </Ctx.Provider>
  );
}

// ล็อกอินเป็น "คน" (เจ้าของร้าน/แอดมิน) ไม่ใช่ร้าน · ทุกคำขอแนบ x-member ให้ server เช็คสิทธิ์และจดว่าใครกด
function Gate() {
  const [session, setSession] = useStored('tt.partner.member', null);
  setApiHeaders(session ? { 'x-member': session.id } : {});
  const { data: accounts } = useLive(() => api.get('/api/partner/accounts'), []);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const join = pathname.match(/^\/join\/([^/]+)/);
  if (join) {
    return <JoinPage code={join[1]} onJoined={(m) => { setSession({ id: m.id, shopId: m.shopId }); nav('/', { replace: true }); }} />;
  }
  if (session) return <Signed shopId={session.shopId} logout={() => setSession(null)} />;
  return (
    <MockLineLogin
      brand={<Logo suffix="partner" size={26} />}
      hint="ตัวช่วยจัดรถให้แขก สำหรับร้านเช่า"
      accounts={(accounts || []).map((a) => ({ id: a.id, shopId: a.shopId, title: a.name, sub: `${a.shopName} · ${a.roleTh}` }))}
      onPick={(a) => setSession({ id: a.id, shopId: a.shopId })}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="phone">
        <DemoStrip />
        <Gate />
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
