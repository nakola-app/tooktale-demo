import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, MessageCircle, Trash2, UserPlus } from 'lucide-react';
import { ErrorNote, Loading, Logo, Qr, Sheet, api, appUrl, fmtDate, useLive, useMeta } from '@tooktale/shared';
import { useShop } from './ctx.js';

// ทีมงานร้าน: เจ้าของ = คนที่ลงทะเบียนร้าน (มีคนเดียว) · แอดมินทำได้ทุกอย่าง ยกเว้นดูตัวเลข/รายงานร้าน และจัดการทีม
export function TeamPage() {
  const { shopId, me, isOwner } = useShop();
  const meta = useMeta();
  const live = useLive(() => api.get(`/api/partner/${shopId}/members`), [shopId]);
  const [invite, setInvite] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);
  const createInvite = async () => {
    try {
      setInvite(await api.post(`/api/partner/${shopId}/invites`));
      live.refresh();
    } catch (e) { setError(e); }
  };
  const remove = async () => {
    try {
      await api.post(`/api/partner/${shopId}/members/${removing.id}/remove`);
      setRemoving(null);
      live.refresh();
    } catch (e) { setError(e); }
  };
  const joinUrl = (code) => (meta ? appUrl(meta, 'partner', `/join/${code}`) : '');
  return (
    <>
      <header className="topbar">
        <Link to="/more" className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
        <h2 className="grow clip">ทีมงานร้าน</h2>
      </header>
      <main className="page page-tabbed">
        <p className="muted small">เจ้าของร้าน = คนที่ลงทะเบียนร้าน มีคนเดียว · แอดมินช่วยจัดการได้ทุกอย่าง <b>ยกเว้นดูตัวเลขร้าน/รายงาน และจัดการทีม</b> · ประวัติการจองบอกว่าใครกดอะไร</p>
        <ErrorNote error={error} />
        {!live.data ? <Loading /> : (
          <div className="stack-s">
            {live.data.members.map((m) => (
              <div className="card row" key={m.id} data-testid="member-row">
                <span className="grow">
                  <span className="bold">{m.name}</span>{m.id === me.id && <span className="tiny muted"> (คุณ)</span>}<br />
                  <span className="small muted">{m.role === 'owner' ? 'ลงทะเบียนร้าน' : `เข้าร่วม ${fmtDate(m.addedAt.slice(0, 10))}`}</span>
                </span>
                <span className={`chip ${m.role === 'owner' ? 'chip-accent' : ''}`}>{m.role === 'owner' && <Crown size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />}{m.roleTh}</span>
                {isOwner && m.role !== 'owner' && <button type="button" className="icon-btn" aria-label={`ลบ ${m.name}`} onClick={() => setRemoving(m)}><Trash2 size={16} /></button>}
              </div>
            ))}
            {isOwner && live.data.invites.length > 0 && (
              <div className="card stack-s">
                <span className="small bold">ลิงก์เชิญที่ยังไม่มีคนใช้</span>
                {live.data.invites.map((i) => <button type="button" key={i.code} className="chip-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setInvite(i)}>{i.code} · สร้าง {fmtDate(i.createdAt.slice(0, 10))}</button>)}
              </div>
            )}
          </div>
        )}
        {isOwner
          ? <button type="button" className="btn btn-primary btn-block" onClick={createInvite}><UserPlus size={18} />เชิญแอดมิน</button>
          : <p className="small muted center">เชิญหรือลบแอดมินได้เฉพาะเจ้าของร้าน</p>}
      </main>

      <Sheet open={!!invite} onClose={() => setInvite(null)} title="เชิญแอดมิน">
        {invite && (
          <div className="stack center" style={{ alignItems: 'center' }}>
            <p className="small muted">ให้คนที่จะมาช่วยสแกน แล้วเข้าสู่ระบบด้วย LINE ของเขา · ลิงก์ใช้ได้ครั้งเดียว</p>
            <Qr value={joinUrl(invite.code)} size={180} />
            <a className="small" href={joinUrl(invite.code)} data-testid="invite-link">{joinUrl(invite.code).replace(/^https?:\/\//, '')}</a>
          </div>
        )}
      </Sheet>
      <Sheet open={!!removing} onClose={() => setRemoving(null)} title="ลบแอดมิน">
        {removing && (
          <div className="stack">
            <p>เอา <b>{removing.name}</b> ออกจากทีมร้าน? เขาจะเข้าแอปร้านไม่ได้ทันที · ประวัติที่เขาเคยกดยังอยู่</p>
            <button type="button" className="btn btn-danger btn-block" onClick={remove}>ยืนยันลบ</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

// หน้ารับคำเชิญ (เปิดจาก QR ของเจ้าของร้าน) · ใช้ได้ทั้งตอนยังไม่ล็อกอิน
export function JoinPage({ code, onJoined }) {
  const info = useLive(() => api.get(`/api/join/${code}`), [code]);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const join = async () => {
    try {
      onJoined(await api.post(`/api/join/${code}`, { name }));
    } catch (e) { setError(e); }
  };
  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="stack center" style={{ alignItems: 'center', gap: 12 }}>
        <Logo suffix="partner" size={26} />
        {info.error && <ErrorNote error={info.error} />}
        {info.data && <p><b>{info.data.invitedBy}</b> เชิญคุณเป็น<b>แอดมิน</b>ของ <b>{info.data.shopName}</b></p>}
      </div>
      {info.data && (
        <>
          <div className="field"><label htmlFor="join-name">ชื่อที่ทีมจะเห็น</label><input id="join-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ฟ้า" /></div>
          <ErrorNote error={error} />
          <button type="button" className="btn btn-line btn-block" disabled={!name.trim()} onClick={join}><MessageCircle size={18} />เข้าร่วมด้วย LINE</button>
          <p className="tiny faint center">เดโม่ไม่ได้เชื่อม LINE จริง · แอดมินทำได้ทุกอย่าง ยกเว้นดูตัวเลขร้าน/รายงาน และจัดการทีม</p>
        </>
      )}
    </div>
  );
}
