import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ChatInput, ChatLog, Logo, api, fmtStamp, langInfo, tr, useMeta } from '@tooktale/shared';
import { useShop } from './ctx.js';

// ร้านคนไทย แขกต่างชาติ: ปุ่มเป็นภาษาไทย แต่ส่งเป็นภาษาของแขก (team-decisions 3.2) · ไม่มีภาษานั้น = อังกฤษ
const QUICK = [
  { label: 'รถว่าง', text: {
    en: 'Yes, the bike is free on those dates. You can book it on this page.',
    th: 'รถว่างวันที่ถามมาครับ จองในหน้านี้ได้เลย',
    zh: '您问的日期这辆车有空，可以直接在这个页面预订。',
  } },
  { label: 'รถไม่ว่าง', text: {
    en: 'Sorry, that bike is taken on those dates. We can offer you a different one.',
    th: 'ขอโทษครับ รถคันนั้นไม่ว่างวันที่ถาม มีคันอื่นให้เลือกครับ',
    zh: '抱歉，那几天这辆车已被租出。我们可以为您推荐其他车辆。',
  } },
  { label: 'ส่งถึงจุดได้', delivery: true, text: {
    en: 'We can bring the bike to a set point for an extra fee. Choose it when you book.',
    th: 'ส่งรถถึงจุดรับส่งได้ มีค่าส่งเพิ่ม เลือกตอนจองได้เลยครับ',
    zh: '我们可以把车送到指定地点，需另付送车费。预订时选择即可。',
  } },
  { label: 'ขอใบขับขี่สากล', text: {
    en: 'Please bring your international driving permit when you pick up the bike.',
    th: 'ตอนรับรถ รบกวนนำใบขับขี่มาด้วยครับ',
    zh: '取车时请携带您的国际驾照。',
  } },
  { label: 'คืนรถที่ร้าน', text: {
    en: 'Please return the bike to our shop. Do not leave it at your hotel.',
    th: 'รบกวนคืนรถที่ร้านครับ อย่าจอดทิ้งไว้ที่โรงแรม',
    zh: '请把车还到我们店里，不要留在酒店。',
  } },
];

export function ChatListPage() {
  const { threads, bookings } = useShop();
  const sorted = [...threads].filter((t) => t.messages.length).sort((a, b) => b.messages.at(-1).at.localeCompare(a.messages.at(-1).at));
  return (
    <>
      <header className="topbar"><div className="grow"><Logo suffix="partner" size={18} /></div></header>
      <main className="page page-tabbed">
        <h2>แชทกับแขก</h2>
        {sorted.length === 0 && <div className="empty">ยังไม่มีแชท</div>}
        {sorted.map((t) => {
          const last = t.messages.at(-1);
          const b = bookings.find((x) => x.id === t.bookingId);
          return (
            <Link key={t.id} to={`/chat/${t.id}`} className="card card-link stack-s">
              <div className="between">
                <span className="bold clip">{t.guestName}{t.lang && t.lang !== 'en' ? <span className="chip" style={{ marginLeft: 6 }}>{langInfo(t.lang).label}</span> : null}</span>
                {t.unreadShop > 0 ? <span className="chip chip-coral num">{t.unreadShop} ใหม่</span> : <span className="tiny faint">{fmtStamp(last.at)}</span>}
              </div>
              <div className="small muted clip">{last.text}</div>
              <span className="tiny faint">{b ? `ผูกกับการจอง ${b.code}` : 'ก่อนจอง'}</span>
            </Link>
          );
        })}
      </main>
    </>
  );
}

export function ChatPage() {
  const { id } = useParams();
  const { threads, bookings, shopId, refresh } = useShop();
  const meta = useMeta();
  const t = threads.find((x) => x.id === id);
  useEffect(() => {
    if (t?.unreadShop) api.post(`/api/partner/${shopId}/threads/${id}/read`);
  }, [id, t?.unreadShop, shopId]);
  if (!t) return <div className="page">ไม่พบแชท</div>;
  const b = bookings.find((x) => x.id === t.bookingId);
  const send = async (text) => {
    await api.post(`/api/partner/${shopId}/threads/${id}/messages`, { text });
    refresh();
  };
  return (
    <>
      <header className="topbar">
        <Link to="/chat" className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
        <div className="grow"><h2 className="clip">{t.guestName}</h2>{b && <Link to={`/booking/${b.id}`} className="tiny muted">การจอง {b.code}</Link>}</div>
      </header>
      <main className="page" style={{ paddingBottom: 0 }}>
        <p className="tiny muted center" data-testid="guest-lang">แขกใช้ภาษา {langInfo(t.lang).label} · ปุ่มด่วนส่งเป็นภาษานี้ · ข้อความที่พิมพ์เองส่งตามที่พิมพ์</p>
        <div className="grow"><ChatLog messages={t.messages} me="shop" /></div>
        <ChatInput onSend={send} placeholder="พิมพ์ข้อความ" quick={QUICK.filter((q) => !q.delivery || meta?.runnerEnabled).map((q) => ({ label: q.label, text: tr(q.text, t.lang) }))} />
      </main>
    </>
  );
}
