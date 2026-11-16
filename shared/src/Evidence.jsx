import { useState } from 'react';
import { Camera, CheckCircle2, Clock, Fuel, TriangleAlert } from 'lucide-react';
import { BikePhoto } from './BikePhoto.jsx';
import { ANGLES, ANGLE_LABEL, FUEL, damageOrigin, fmtStamp, stageLabel, tr, whoLabel } from './core.js';

export function Lightbox({ open, onClose, children, caption }) {
  if (!open) return null;
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <div className="frame">{children}</div>
      {caption && <div className="small">{caption}</div>}
    </div>
  );
}

// ถ่ายรูปจำลอง 4 ด้าน: กดช่องไหนก็ "ได้รูป" ของรถคันนั้น พร้อมปุ่มจำลองรอยใหม่สำหรับเล่าเรื่อง
export function PhotoCapture({ vehicle, photos, onChange, fuel, onFuel, lang = 'th' }) {
  const [flash, setFlash] = useState(null);
  const shot = (angle) => photos.find((p) => p.angle === angle);
  const take = (angle) => {
    onChange([...photos, { angle, takenAt: new Date().toISOString(), damage: vehicle.oldMark === angle ? 'old' : null }]);
    setFlash(angle);
    setTimeout(() => setFlash(null), 360);
  };
  const toggle = (angle) => onChange(photos.map((p) => (p.angle === angle
    ? { ...p, damage: p.damage === 'new' ? (vehicle.oldMark === angle ? 'old' : null) : 'new' }
    : p)));
  const takeAll = () => {
    const now = new Date().toISOString();
    onChange(ANGLES.map((angle) => shot(angle) || { angle, takenAt: now, damage: vehicle.oldMark === angle ? 'old' : null }));
  };
  const t = lang === 'th'
    ? { snap: 'แตะเพื่อถ่าย', mark: 'จำลองรอยใหม่', marked: 'มีรอยใหม่', all: 'ถ่ายให้ครบ 4 ด้าน', fuel: 'ระดับน้ำมัน', old: 'รอยเดิม' }
    : { snap: 'Tap to take', mark: 'Simulate new mark', marked: 'New mark', all: 'Take all 4', fuel: 'Fuel level', old: 'Existing mark' };
  return (
    <div className="stack">
      <div className="between">
        <span className="small muted">{photos.length}/4</span>
        {photos.length < 4 && <button type="button" className="btn btn-ghost btn-s" onClick={takeAll}><Camera size={15} />{t.all}</button>}
      </div>
      <div className="shot-grid">
        {ANGLES.map((angle) => {
          const p = shot(angle);
          if (!p) {
            return (
              <button type="button" key={angle} className="shot-empty" onClick={() => take(angle)}>
                <Camera size={22} />
                <span>{tr(ANGLE_LABEL[angle], lang)}</span>
                <span className="tiny faint">{t.snap}</span>
              </button>
            );
          }
          return (
            <div key={angle} className="shot">
              <BikePhoto vehicle={vehicle} angle={angle} damage={p.damage} takenAt={p.takenAt} lang={lang} />
              {flash === angle && <div className="shot-flash" />}
              <div className="shot-tools">
                {p.damage === 'old' ? <span className="chip">{t.old}</span> : <span />}
                <button type="button" className={`chip-btn tiny`} aria-pressed={p.damage === 'new'} onClick={() => toggle(angle)} style={{ padding: '3px 8px' }}>
                  {p.damage === 'new' ? t.marked : t.mark}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {onFuel && (
        <div className="field">
          <span className="label">{t.fuel}</span>
          <div className="row wrap">
            {Object.entries(FUEL).map(([k, v]) => (
              <button type="button" key={k} className="chip-btn" aria-pressed={fuel === k} onClick={() => onFuel(k)}>{tr(v, lang)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PhotoStrip({ vehicle, photos, lang = 'th' }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="thumbs">
        {ANGLES.map((angle) => {
          const p = photos.find((x) => x.angle === angle);
          if (!p) return <div key={angle} />;
          return (
            <button type="button" className="thumb" key={angle} onClick={() => setOpen(p)} aria-label={tr(ANGLE_LABEL[angle], lang)}>
              <BikePhoto vehicle={vehicle} angle={angle} damage={p.damage} highlight lang={lang} caption={false} />
            </button>
          );
        })}
      </div>
      <Lightbox open={!!open} onClose={() => setOpen(null)} caption={open ? tr(ANGLE_LABEL[open.angle], lang) : ''}>
        {open && <BikePhoto vehicle={vehicle} angle={open.angle} damage={open.damage} takenAt={open.takenAt} highlight lang={lang} />}
      </Lightbox>
    </>
  );
}

export function DamageNote({ handoffs, lang = 'th' }) {
  const origin = damageOrigin(handoffs);
  if (!origin) return null;
  const side = tr(ANGLE_LABEL[origin.angle], lang);
  const holder = whoLabel(origin.holder, lang);
  const prevTitle = origin.prev ? stageLabel(origin.prev, lang) : '';
  const title = stageLabel(origin.set, lang);
  return (
    <div className="callout callout-bad">
      <TriangleAlert size={18} style={{ flex: 'none', marginTop: 2 }} />
      <span>
        {lang === 'th'
          ? <>พบรอยใหม่ <b>{side}</b> ครั้งแรกในชุด <b>{title}</b>{origin.prev && <> ชุดก่อนหน้า ({prevTitle}) ยังไม่มี</>} แปลว่าเกิดช่วงที่รถอยู่กับ <b>{holder}</b></>
          : lang === 'zh'
            ? <><b>{side}</b>的新痕迹首次出现在 <b>{title}</b>{origin.prev && <>，之前的一组（{prevTitle}）还没有</>}。说明发生在车辆由<b>{holder}</b>保管期间。</>
          : <>New mark on the <b>{side.toLowerCase()}</b> first appears in <b>{title}</b>{origin.prev && <>, not in the earlier set ({prevTitle})</>}. It happened while the bike was with the <b>{holder.toLowerCase()}</b>.</>}
      </span>
    </div>
  );
}

// ทุกครั้งที่รถเปลี่ยนมือต้องมีรูป 1 ชุด (feature-map ส่วน ③)
export function EvidenceChain({ booking, lang = 'th' }) {
  const sets = [...booking.handoffs].sort((a, b) => a.at.localeCompare(b.at));
  const origin = damageOrigin(sets);
  if (!sets.length) {
    return <div className="small faint">{tr({ th: 'ยังไม่มีรูป จะมีเมื่อรถเปลี่ยนมือครั้งแรก', en: 'No photos yet.', zh: '还没有照片。' }, lang)}</div>;
  }
  return (
    <div className="stack">
      <DamageNote handoffs={sets} lang={lang} />
      <div className="chain">
        {sets.map((h, i) => (
          <div className={`chain-step ${origin?.set.id === h.id ? 'alert' : ''}`} key={h.id}>
            <span className="chain-dot" />
            <div className="stack-s">
              <div className="between">
                <span className="bold small">{tr({ th: `ชุดที่ ${i + 1}`, en: `Set ${i + 1}`, zh: `第 ${i + 1} 组` }, lang)} · {stageLabel(h, lang)}</span>
              </div>
              <div className="row tiny muted wrap">
                <span className="row" style={{ gap: 3 }}><Clock size={12} />{fmtStamp(h.at, lang)}</span>
                <span className="row" style={{ gap: 3 }}><Fuel size={12} />{tr(FUEL[h.fuel], lang)}</span>
                {h.by === 'runner' && <span>{h.byName}</span>}
                {h.stage === 'shop_runner' && (h.confirmedAt
                  ? <span className="row" style={{ gap: 3 }}><CheckCircle2 size={12} />{tr({ th: 'ร้านยืนยันแล้ว', en: 'Shop confirmed', zh: '店家已确认' }, lang)}</span>
                  : <span>{tr({ th: 'รอร้านยืนยัน', en: 'Awaiting shop', zh: '等待店家确认' }, lang)}</span>)}
              </div>
              <PhotoStrip vehicle={booking.vehicle} photos={h.photos} lang={lang} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// รูปตอนคืนวางคู่กับรูปตอนรับ
export function PhotoCompare({ booking, lang = 'th' }) {
  const sets = [...booking.handoffs].sort((a, b) => a.at.localeCompare(b.at));
  const before = sets.find((h) => h.stage === 'to_guest');
  const after = [...sets].reverse().find((h) => h.stage === 'from_guest' || h.stage === 'runner_shop');
  if (!before || !after) return null;
  const heads = tr({ th: ['ตอนรับรถ', 'ตอนคืนรถ'], en: ['At pick-up', 'At return'], zh: ['取车时', '还车时'] }, lang);
  return (
    <div className="stack-s">
      <div className="pair-grid small bold muted">
        <span>{heads[0]}</span>
        <span>{heads[1]}</span>
      </div>
      {ANGLES.map((angle) => {
        const a = before.photos.find((p) => p.angle === angle);
        const b = after.photos.find((p) => p.angle === angle);
        return (
          <div className="pair-grid" key={angle}>
            <div className="shot"><BikePhoto vehicle={booking.vehicle} angle={angle} damage={a?.damage} takenAt={a?.takenAt} lang={lang} highlight /></div>
            <div className="shot"><BikePhoto vehicle={booking.vehicle} angle={angle} damage={b?.damage} takenAt={b?.takenAt} lang={lang} highlight /></div>
          </div>
        );
      })}
    </div>
  );
}
