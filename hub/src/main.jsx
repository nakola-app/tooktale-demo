import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bike, ExternalLink, MonitorPlay, RotateCcw, Shield, Store, UserRound } from 'lucide-react';
import { Logo, LogoIcon, Qr, api, appUrl, useMeta } from '@tooktale/shared';
import './styles.css';

const APPS = [
  { key: 'tooktale', Icon: UserRound, name: 'tooktale', who: 'แขก / ลูกค้า', sub: 'เว็บ ไม่ต้อง login · EN/ไทย', color: '#1e5fe0' },
  { key: 'partner', Icon: Store, name: 'tooktale partner', who: 'ร้านเช่า', sub: 'เข้าด้วย LINE (จำลอง)', color: '#0a845a' },
  { key: 'runner', Icon: Bike, name: 'tooktale runner', who: 'คนเดินรถ', sub: 'เข้าด้วย LINE (จำลอง)', color: '#c27f00' },
  { key: 'admin', Icon: Shield, name: 'nakola tooktale', who: 'ทีม nakola', sub: 'เปิดบนคอม', color: '#4f46e5' },
];

const SCRIPTS = [
  {
    title: 'A. จอง รับ-คืนที่ร้าน', steps: [
      ['tooktale', 'เลือกรถ เลือกวัน กรอกข้อมูลตัวอย่าง กดส่งคำขอจอง'],
      ['partner', 'แจ้งเตือนเด้งทันที กด "รับจอง" แล้วแขกเห็น "ยืนยันแล้ว" (ไม่กดใน 15 นาที ระบบยืนยันให้เอง ดูบท E)'],
      ['partner', 'เปิด booking กด "ส่งมอบรถ" ถ่ายรูป 4 ด้าน'],
      ['tooktale', 'เปิดใบตกลง อ่านกติกา กดยอมรับ สถานะเป็น "กำลังเช่า"'],
      ['partner', 'กด "รับรถคืน" ถ่ายรูป ลองกด "จำลองรอยใหม่" 1 ด้าน'],
      ['partner', 'เทียบรูป ติ๊กค่าซ่อมตามใบตกลง แล้วปิดงาน'],
      ['tooktale', 'แขกเห็นรูปคู่ พร้อมค่าซ่อมที่ตกลงไว้แล้ว'],
    ],
  },
  {
    title: 'B. จอง + ส่งรถถึงจุด', steps: [
      ['tooktale', 'ตอนจองเลือกส่งที่จุดรับส่ง และคืนที่จุด ราคาบวกค่าส่งเอง'],
      ['partner', 'กดรับจอง ระบบสร้างงานส่งกับงานรับคืน'],
      ['runner', 'งานใหม่เด้ง กดรับงาน ถ่ายรูปรับรถ'],
      ['partner', 'ยืนยันรูปตรงกัน มอบรถ'],
      ['runner', 'ถึงจุด ถ่ายรูป แล้วแขกกดยอมรับบนมือถือตัวเอง'],
      ['runner', 'งานรับคืน: ถ่ายรูปรับจากแขก แล้วกด "ถึงร้านแล้ว"'],
      ['partner', 'ตรวจรับ ถ้ามีรอยจะบอกได้ว่าเกิดช่วงที่รถอยู่กับใคร'],
    ],
  },
  {
    title: 'C. แขก walk-in', steps: [
      ['partner', 'กด "คีย์แขก walk-in" เลือกรถ ใส่ชื่อ'],
      ['partner', 'ถ่ายรูปส่งมอบ แล้วให้แขกกดบนมือถือร้าน หรือสแกน QR'],
      ['partner', 'ดูปฏิทินกับตัวเลขร้าน ใบนี้เข้าไปเองแล้ว'],
    ],
  },
  {
    title: 'D. แชทก่อนจอง', steps: [
      ['tooktale', 'กด "แชทกับร้าน" ถามว่ารถว่างไหม'],
      ['partner', 'ตอบด้วยปุ่มภาษาไทย แขกได้ข้อความภาษาของแขก (ลองแชท Chen Jie = จีน)'],
      ['tooktale', 'จองต่อได้เลย แชทนี้ผูกกับ booking อัตโนมัติ'],
    ],
  },
  {
    title: 'E. ร้านไม่ตอบ 15 นาที = ยืนยันเอง · รถไม่ว่างจริง', steps: [
      ['tooktale', 'จองรถ ใต้ปุ่มจองบอกว่าร้านมีเวลาตอบ 15 นาที หน้าการจองนับถอยหลังให้'],
      ['partner', 'การ์ดคำขอนับถอยหลังเหมือนกัน กด "เดโม่: ข้ามเวลารอ" ระบบยืนยันให้เอง'],
      ['partner', 'เปิด booking กด "เปลี่ยนรถ" เลือกคันอื่น ราคาขึ้นไม่ได้ คันแพงกว่าแขกจ่ายเท่าเดิม'],
      ['tooktale', 'แขกเห็นว่ารถเปลี่ยนเป็นคันไหน ราคาเท่าไหร่'],
      ['partner', 'หรือกด "ยกเลิกการจอง" ใส่เหตุผล เช่น ถูกจองทางโทรศัพท์ แขกได้ข้อความทันที'],
      ['admin', 'ภาพรวมนับว่าแต่ละร้านยืนยันอัตโนมัติ ยกเลิกเอง เปลี่ยนรถ กี่ครั้ง'],
    ],
  },
];

const NAMES = Object.fromEntries(APPS.map((a) => [a.key, a.name]));

function Home({ meta }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const reset = async () => {
    await api.post('/api/admin/reset');
    setConfirming(false);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };
  const stage = appUrl(meta, 'hub', '/stage');
  return (
    <div className="hub">
      <header className="hub-head">
        <div>
          <Logo size={26} tag="DEMO · BY NAKOLA" />
          <p className="muted">เดโม่ 4 แอป ข้อมูลตัวอย่างทั้งหมด ทุกแอปเชื่อมกันแบบเรียลไทม์</p>
        </div>
        <div className="row wrap">
          <a className="btn btn-primary" href={stage}><MonitorPlay size={18} />เปิดทุกแอปบนจอเดียว</a>
          {confirming
            ? <button type="button" className="btn btn-danger" onClick={reset}>ยืนยันล้างข้อมูล</button>
            : <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}><RotateCcw size={16} />{done ? 'ล้างแล้ว' : 'ล้างเดโม่'}</button>}
        </div>
      </header>

      <section className="apps">
        {APPS.map(({ key, Icon, name, who, sub, color }) => {
          const url = appUrl(meta, key);
          return (
            <article className="card app" key={key}>
              <div className="row"><LogoIcon role={{ tooktale: 'guest', partner: 'partner', runner: 'runner', admin: 'admin' }[key]} size={40} />
                <div className="grow"><h2>{name}</h2><p className="small muted">{who}</p></div>
              </div>
              <Qr value={url} size={176} />
              <p className="small muted">{key === 'runner' && !meta.runnerEnabled ? 'ปิดชั่วคราว รอ payment gateway · เปิดได้ที่ Admin → คนเดินรถ' : sub}</p>
              <a className="btn btn-ghost btn-s" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} />{url.replace(/^https?:\/\//, '')}</a>
            </article>
          );
        })}
      </section>
      <p className="small muted center">มือถือต้องต่อ Wi-Fi วงเดียวกับเครื่องนี้ แล้วสแกน QR ด้วยกล้อง</p>

      <section className="stack">
        <h2>บทพรีเซ้น 4 เส้นทาง</h2>
        <div className="scripts">
          {SCRIPTS.map((s) => (
            <article className="card stack-s" key={s.title}>
              <h3>{s.title}{s.title.startsWith('B.') && !meta.runnerEnabled ? ' (ปิดอยู่ · เปิดที่ Admin → คนเดินรถ ก่อน)' : ''}</h3>
              <ol>
                {s.steps.map(([app, text], i) => <li key={i}><span className="chip">{NAMES[app]}</span> {text}</li>)}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// จอเดียวสำหรับต่อโปรเจกเตอร์ หรือเล่นคนเดียวบนคอม
function Stage({ meta }) {
  const frames = [
    ['tooktale', 'tooktale · แขก', 'mobile'],
    ['partner', 'tooktale partner · ร้าน', 'mobile'],
    ['runner', 'tooktale runner · คนเดินรถ', 'mobile'],
    ['admin', 'nakola tooktale · แอดมิน', 'wide'],
  ];
  return (
    <div className="stage">
      <div className="stage-top">
        <Logo size={16} light tag="DEMO · BY NAKOLA" />
        <a className="small" href="/">กลับหน้า QR</a>
      </div>
      <div className="stage-row">
        {frames.map(([key, label, kind]) => (
          <figure key={key} className={`frame ${kind}`}>
            <figcaption>{label}</figcaption>
            <iframe title={label} src={appUrl(meta, key)} />
          </figure>
        ))}
      </div>
    </div>
  );
}

function App() {
  const meta = useMeta();
  if (!meta) return <div className="empty">กำลังเชื่อมต่อ API…</div>;
  return location.pathname.startsWith('/stage') ? <Stage meta={meta} /> : <Home meta={meta} />;
}

createRoot(document.getElementById('root')).render(<App />);
