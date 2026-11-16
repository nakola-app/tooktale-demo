import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BikePhoto, ErrorNote, Logo, Sheet, api, baht, fmtDate } from '@tooktale/shared';
import { useShop } from './ctx.js';

const COLORS = ['#F4F1EA', '#2B2F33', '#D8452E', '#1F4E8C', '#8FD3C5', '#7DB7E8', '#6B7280'];
const blank = { name: '', plate: '', pricePerDay: 280, color: COLORS[0], rentFrom: '', rentTo: '', gear: 'auto' };

function Editor({ value, onClose }) {
  const { shopId, refresh } = useShop();
  const [v, setV] = useState({ ...blank, ...value, rentFrom: value?.rentFrom || '', rentTo: value?.rentTo || '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const save = async () => {
    try {
      if (v.id) await api.patch(`/api/partner/${shopId}/vehicles/${v.id}`, v);
      else await api.post(`/api/partner/${shopId}/vehicles`, v);
      await refresh();
      onClose();
    } catch (e) { setError(e); }
  };
  return (
    <>
      <div style={{ borderRadius: 12, overflow: 'hidden' }}><BikePhoto vehicle={v} caption={false} /></div>
      <div className="field"><label htmlFor="f-n">รุ่น</label><input id="f-n" value={v.name} onChange={set('name')} placeholder="Honda Click 125i" /></div>
      <div className="row">
        <div className="field grow"><label htmlFor="f-p">ทะเบียน</label><input id="f-p" value={v.plate} onChange={set('plate')} /></div>
        <div className="field grow"><label htmlFor="f-r">ราคา/วัน (บาท)</label><input id="f-r" type="number" min="0" value={v.pricePerDay} onChange={set('pricePerDay')} /></div>
      </div>
      <div className="field">
        <span className="label">สี</span>
        <div className="row wrap">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setV({ ...v, color: c })} aria-label={`สี ${c}`} aria-pressed={v.color === c}
              style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: v.color === c ? '3px solid var(--accent)' : '1px solid var(--line)', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">ช่วงที่ปล่อยเช่าได้ (เว้นว่าง = ทั้งปี)</span>
        <div className="row">
          <input type="date" aria-label="เริ่มปล่อยเช่า" value={v.rentFrom} onChange={set('rentFrom')} />
          <input type="date" aria-label="หยุดปล่อยเช่า" value={v.rentTo} onChange={set('rentTo')} />
        </div>
        <span className="tiny faint">เหมาะกับรถครอบครัวที่ปล่อยเฉพาะไฮซีซั่น</span>
      </div>
      <ErrorNote error={error} />
      <button type="button" className="btn btn-primary btn-block" onClick={save}>บันทึก</button>
    </>
  );
}

export function FleetPage() {
  const { vehicles } = useShop();
  const [editing, setEditing] = useState(null);
  return (
    <>
      <header className="topbar"><div className="grow"><Logo suffix="partner" size={18} /></div></header>
      <main className="page page-tabbed">
        <div className="between">
          <h2>รถของร้าน</h2>
          <button type="button" className="btn btn-primary btn-s" onClick={() => setEditing({})}><Plus size={15} />เพิ่มรถ</button>
        </div>
        {vehicles.map((v) => (
          <button key={v.id} type="button" className="card card-link row" onClick={() => setEditing(v)}>
            <div style={{ width: 84, flex: 'none', borderRadius: 8, overflow: 'hidden' }}><BikePhoto vehicle={v} caption={false} /></div>
            <div className="grow">
              <div className="between"><span className="bold clip">{v.name}</span><span className="bold num">{baht(v.pricePerDay)}</span></div>
              <div className="small muted">{v.plate}</div>
              {(v.rentFrom || v.rentTo) && <span className="chip chip-warn">ปล่อย {v.rentFrom ? fmtDate(v.rentFrom) : ''} – {v.rentTo ? fmtDate(v.rentTo) : ''}</span>}
            </div>
          </button>
        ))}
      </main>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'แก้ไขรถ' : 'เพิ่มรถ'}>
        {editing && <Editor key={editing.id || 'new'} value={editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}
