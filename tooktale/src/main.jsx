import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DemoStrip, LANGS, Toasts, detectLang, getMeta, useStored } from '@tooktale/shared';
import { LangContext, useT } from './i18n.js';
import { ShopPage, VehiclePage, BookPage } from './shop.jsx';
import { BookingPage, AgreementPage, MapPage, ChatPage, TripsPage } from './booking.jsx';
import './styles.css';

function Root() {
  const [slug, setSlug] = useState(null);
  useEffect(() => { getMeta().then((m) => setSlug(m.defaultSlug)).catch(() => {}); }, []);
  return slug ? <Navigate to={`/${slug}`} replace /> : null;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const knownTokens = () => {
  try { return JSON.parse(localStorage.getItem('tt.data.tokens') || '[]'); } catch { return []; }
};

function Shell() {
  const t = useT();
  const nav = useNavigate();
  return (
    <div className="site">
      <ScrollTop />
      <DemoStrip text={t('demo')} />
      <Toasts match={(n) => n.role === 'guest' && knownTokens().includes(n.targetId)} onOpen={(link) => nav(link)} />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/b/:token" element={<BookingPage />} />
        <Route path="/b/:token/agreement" element={<AgreementPage />} />
        <Route path="/b/:token/map" element={<MapPage />} />
        <Route path="/b/:token/chat" element={<ChatPage />} />
        <Route path="/:slug" element={<ShopPage />} />
        <Route path="/:slug/chat" element={<ChatPage />} />
        <Route path="/:slug/v/:vid" element={<VehiclePage />} />
        <Route path="/:slug/v/:vid/book" element={<BookPage />} />
      </Routes>
    </div>
  );
}

function App() {
  // ภาษาที่แขกเลือกเองชนะเสมอ ถ้ายังไม่เคยเลือก ใช้ภาษาของเครื่อง (ไม่มีในรายการ = EN)
  const [picked, setLang] = useStored('tt.lang.pick', null);
  const lang = LANGS.some((l) => l.code === picked) ? picked : detectLang();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <BrowserRouter><Shell /></BrowserRouter>
    </LangContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
