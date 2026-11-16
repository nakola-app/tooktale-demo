import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChartColumn, ChevronRight, Languages, ListPlus, LogOut, Plus, Receipt, ScrollText, Store, Trash2, Users } from 'lucide-react';
import { ErrorNote, Logo, Sheet, api, baht, fmtDate, pct, ruleField, ruleLangs } from '@tooktale/shared';
import { useShop } from './ctx.js';

function Top({ title }) {
  return (
    <header className="topbar">
      <Link to="/more" className="icon-btn" aria-label="กลับ"><ArrowLeft size={20} /></Link>
      <h2 className="grow clip">{title}</h2>
    </header>
  );
}

export function MorePage() {
  const { shop, logout, me, isOwner } = useShop();
  const item = (to, Icon, title, sub) => (
    <Link to={to} className="card card-link row">
      <Icon size={22} style={{ color: 'var(--accent)' }} />
      <span className="grow"><span className="bold" style={{ display: 'block' }}>{title}</span><span className="small muted">{sub}</span></span>
      <ChevronRight size={18} />
    </Link>
  );
  return (
    <>
      <header className="topbar"><div className="grow"><Logo suffix="partner" size={18} /></div></header>
      <main className="page page-tabbed">
        <div><h2>{shop.name}</h2><p className="small muted" data-testid="me">{me.name} · {me.roleTh}</p></div>
        {isOwner && item('/analytics', ChartColumn, 'ตัวเลขร้าน', 'รถคันไหนทำเงิน รถออกกี่วัน · เฉพาะเจ้าของร้าน')}
        {isOwner && item('/billing', Receipt, 'ค่าธรรมเนียม tooktale', 'ใบแจ้งยอดรายเดือน · แจ้งโอน · เฉพาะเจ้าของร้าน')}
        {item('/rules', ScrollText, 'กติกาของร้าน', 'ค่าซ่อม จุดคืนรถ ยึดอะไร')}
        {item('/settings', Store, 'ข้อมูลร้าน', 'ชื่อร้าน ที่ตั้ง คำแนะนำร้าน')}
        {item('/team', Users, 'ทีมงานร้าน', isOwner ? 'เชิญแอดมินมาช่วยจัดการ · ลบแอดมิน' : 'ดูว่าใครอยู่ในทีม')}
        <button type="button" className="btn btn-ghost btn-block" onClick={logout}><LogOut size={17} />ออกจากระบบ</button>
      </main>
    </>
  );
}

export function AnalyticsPage() {
  const { analytics: a, isOwner } = useShop();
  const [hover, setHover] = useState(null);
  // ตัวเลขร้าน/รายงาน: เฉพาะเจ้าของร้าน (server ก็ไม่ส่งให้แอดมิน)
  if (!isOwner || !a) {
    return (
      <>
        <Top title="ตัวเลขร้าน" />
        <main className="page page-tabbed"><div className="callout callout-info" data-testid="owner-only">ตัวเลขร้านและรายงาน ดูได้เฉพาะเจ้าของร้าน</div></main>
      </>
    );
  }
  const { totals: t } = a;
  const peak = Math.max(1, ...a.perDay.map((d) => d.out));
  const topRevenue = Math.max(1, ...a.perVehicle.map((v) => v.revenue));
  const total = t.online + t.walkin || 1;
  const shown = hover ?? a.perDay[a.perDay.length - 1];
  return (
    <>
      <Top title={`ตัวเลขร้าน ${a.days} วันล่าสุด`} />
      <main className="page page-tabbed">
        <div className="stat-grid">
          <div className="stat"><div className="label">% วันที่รถออก</div><div className="value">{pct(t.utilization)}</div></div>
          <div className="stat"><div className="label">วันเช่ารวม</div><div className="value">{t.rentedDays}</div></div>
          <div className="stat"><div className="label">รายได้ค่าเช่า</div><div className="value">{baht(t.revenue)}</div></div>
          <div className="stat"><div className="label">เช่าเฉลี่ย</div><div className="value">{t.avgDays.toFixed(1)} วัน</div></div>
        </div>

        <div className="card stack-s">
          <h3>รถออกต่อวัน</h3>
          <p className="small muted num">{fmtDate(shown.date)}: {shown.out} คัน</p>
          <div className="bars" role="img" aria-label="จำนวนรถที่ออกแต่ละวัน">
            {a.perDay.map((d) => (
              <button key={d.date} type="button" onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} onClick={() => setHover(d)} aria-label={`${fmtDate(d.date)} ${d.out} คัน`}>
                <span style={{ height: `${(d.out / peak) * 100}%` }} />
              </button>
            ))}
          </div>
          <div className="between tiny faint"><span>{fmtDate(a.perDay[0].date)}</span><span>วันนี้</span></div>
        </div>

        <div className="card stack-s">
          <h3>ออนไลน์ เทียบ walk-in</h3>
          <div className="split">
            <span style={{ width: `${(t.online / total) * 100}%`, background: 'var(--accent)' }} />
            <span style={{ width: `${(t.walkin / total) * 100}%`, background: 'var(--coral)' }} />
          </div>
          <div className="legend-row">
            <span><i style={{ background: 'var(--accent)' }} />ออนไลน์ {t.online} ใบ</span>
            <span><i style={{ background: 'var(--coral)' }} />walk-in {t.walkin} ใบ</span>
          </div>
        </div>

        <div className="card stack">
          <h3>รายได้ต่อคัน</h3>
          {a.perVehicle.map((v) => (
            <div className="stack-s" style={{ gap: 3 }} key={v.vehicleId}>
              <div className="between small"><span className="clip">{v.plate} · {v.name}</span><span className="bold num">{baht(v.revenue)}</span></div>
              <div className="hbar" style={{ width: `${(v.revenue / topRevenue) * 100}%` }} title={`${v.rentedDays} วัน จาก ${v.availableDays} วัน`} />
              <div className="tiny faint num">ออก {v.rentedDays} จาก {v.availableDays} วัน ({pct(v.utilization)})</div>
            </div>
          ))}
        </div>
        <p className="tiny faint">ตัวเลขทั้งหมดในเดโม่เป็นของสมมุติ ของจริงจะแม่นเท่าที่ร้านคีย์ booking ครบ</p>
      </main>
    </>
  );
}

// ---------- กติกา = ใบตกลงที่แขกกดยอมรับ · EN บังคับ ภาษาอื่นร้านเลือกเปิด ----------
const LANG_TH = { en: 'อังกฤษ', th: 'ไทย', zh: 'จีน' };
const EXTRA_LANGS = ['th', 'zh'];

// รายการมาตรฐานที่ nakola แปลไว้ให้แล้ว ร้านแค่ใส่ราคา → ร้านไม่ต้องเขียนอังกฤษ/จีนเอง
const REPAIR_PRESETS = [
  { en: 'Broken side mirror', th: 'กระจกมองข้างแตก', zh: '后视镜破损' },
  { en: 'Scratched body panel (per panel)', th: 'รอยขีดข่วนชุดสี (ต่อชิ้น)', zh: '车身面板刮伤（每块）' },
  { en: 'Broken head/tail light', th: 'ไฟหน้า/ไฟท้ายแตก', zh: '前灯/尾灯破损' },
  { en: 'Lost key', th: 'กุญแจหาย', zh: '钥匙丢失' },
  { en: 'Flat or punctured tyre', th: 'ยางแบน/ยางรั่ว', zh: '轮胎漏气或被扎破' },
  { en: 'Broken brake or clutch lever', th: 'มือเบรก/มือคลัตช์หัก', zh: '刹车或离合把手断裂' },
  { en: 'Lost helmet', th: 'หมวกกันน็อกหาย', zh: '头盔丢失' },
  { en: 'Major crash: repair at garage price', th: 'รถล้มหนัก ซ่อมตามใบเสร็จอู่', zh: '严重事故：按修车厂收据维修', price: null },
];
const TEXT_PRESETS = {
  return: [
    { label: 'คืนที่ร้านเท่านั้น', en: 'Return to the shop only. Do not leave the bike at a hotel or pier. To return elsewhere, book the collection service.', th: 'คืนที่ร้านเท่านั้น ห้ามจอดทิ้งไว้ที่โรงแรมหรือท่าเรือ ถ้าจะคืนที่จุดอื่นต้องเลือกบริการรับรถคืน', zh: '只能在店里还车。不要把车留在酒店或码头。如需在其他地点还车，请预订上门取车服务。' },
    { label: 'คืนที่ร้านตามเวลา', en: 'Return to the shop by the agreed time.', th: 'คืนที่ร้านภายในเวลาที่ตกลง', zh: '请在约定时间内把车还到店里。' },
  ],
  hold: [
    { label: 'ถ่ายรูปพาสปอร์ต ไม่ยึด', en: 'We photograph your passport. We do not keep it.', th: 'ถ่ายรูปพาสปอร์ต ไม่ยึดเล่ม', zh: '我们会拍下您的护照照片，但不扣留护照。' },
    { label: 'ไม่ยึดเอกสาร', en: 'We do not keep any documents.', th: 'ไม่ยึดเอกสาร', zh: '我们不扣留任何证件。' },
    { label: 'ยึดพาสปอร์ตจนคืนรถ', en: 'We keep your passport until you return the bike.', th: 'ยึดพาสปอร์ตไว้จนคืนรถ', zh: '我们会保留您的护照，直到您还车。' },
  ],
};

const blank = (s) => !String(s || '').trim();

export function RulesPage() {
  const { shop, shopId, refresh } = useShop();
  const [r, setR] = useState(() => ({ ...shop.rules, langs: ruleLangs(shop.rules) }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);
  const [presets, setPresets] = useState(false);
  const langs = ['en', ...EXTRA_LANGS.filter((l) => r.langs.includes(l))];

  const toggleLang = (l) => setR({ ...r, langs: r.langs.includes(l) ? r.langs.filter((x) => x !== l) : [...r.langs, l] });
  const setRepair = (i, patch) => setR({ ...r, repairs: r.repairs.map((x, n) => (n === i ? { ...x, ...patch } : x)) });
  const applyText = (field, p) => setR({ ...r, ...Object.fromEntries(['en', ...EXTRA_LANGS].map((l) => [ruleField(field, l), p[l]])) });

  // EN ขาดที่ไหน = บันทึกไม่ได้ · ภาษาอื่นขาด = บันทึกได้ แขกเห็นอังกฤษในช่องนั้นแทน
  const missingEn = [
    ...r.repairs.map((x, i) => (blank(x.en) ? `ค่าซ่อมรายการที่ ${i + 1}` : null)),
    blank(r.returnEn) ? 'จุดคืนรถ' : null,
    blank(r.holdEn) ? 'ยึดอะไรไว้' : null,
  ].filter(Boolean);
  const gaps = langs.filter((l) => l !== 'en').map((l) => {
    const n = r.repairs.filter((x) => blank(x[l])).length + (blank(r[ruleField('return', l)]) ? 1 : 0) + (blank(r[ruleField('hold', l)]) ? 1 : 0);
    return n ? `${LANG_TH[l]} ${n} ช่อง` : null;
  }).filter(Boolean);

  const save = async () => {
    setTried(true);
    setError(null);
    if (missingEn.length) return;
    try {
      await api.patch(`/api/partner/${shopId}`, { rules: r });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) { setError(e); }
  };

  const bad = (l, value) => tried && l === 'en' && blank(value);
  const label = (l) => `${LANG_TH[l]}${l === 'en' ? ' (บังคับ)' : ''}`;
  // ช่องข้อความ 1 ช่องต่อภาษาที่เปิด (เรียกเป็นฟังก์ชัน ไม่ใช่ component → พิมพ์แล้วไม่หลุดโฟกัส)
  const textFields = (field, multiline) => langs.map((l) => {
    const k = ruleField(field, l);
    const id = `${field}-${l}`;
    const props = {
      id, lang: l, value: r[k] || '', 'aria-invalid': bad(l, r[k]) || undefined,
      style: bad(l, r[k]) ? { borderColor: 'var(--bad)' } : undefined,
      onChange: (e) => setR({ ...r, [k]: e.target.value }),
    };
    return <div className="field" key={l}><label htmlFor={id}>{label(l)}</label>{multiline ? <textarea {...props} /> : <input {...props} />}</div>;
  });
  const presetRow = (field) => (
    <div className="row wrap">
      <span className="tiny muted">ข้อความมาตรฐาน (แปลครบแล้ว):</span>
      {TEXT_PRESETS[field].map((p) => <button type="button" key={p.label} className="chip-btn" onClick={() => applyText(field, p)}>{p.label}</button>)}
    </div>
  );
  const unused = REPAIR_PRESETS.filter((p) => !r.repairs.some((x) => x.en === p.en));

  return (
    <>
      <Top title="กติกาของร้าน" />
      <main className="page page-tabbed">
        <p className="muted">กติกาชุดนี้ไปอยู่ในใบตกลงที่แขกต้องกดยอมรับก่อนรับรถ ตกลงกันก่อน เรื่องรถพังจะไม่ต้องเถียง</p>

        <div className="card stack-s">
          <h3 className="row"><Languages size={18} />ภาษาในใบตกลง</h3>
          <div className="row wrap" role="group" aria-label="ภาษาในใบตกลง">
            <button type="button" className="chip-btn" aria-pressed="true" disabled title="ต้องมีเสมอ">อังกฤษ · บังคับ</button>
            {EXTRA_LANGS.map((l) => <button type="button" key={l} className="chip-btn" aria-pressed={r.langs.includes(l)} onClick={() => toggleLang(l)}>{LANG_TH[l]}</button>)}
          </div>
          <p className="small muted">แขกเห็นใบตกลงเป็นภาษาของเขาถ้าร้านเปิดไว้ ไม่งั้นเห็นอังกฤษ · ฉบับอังกฤษคือฉบับที่ใช้ตกลงกัน · เลือกจากรายการมาตรฐานแล้วไม่ต้องแปลเอง</p>
        </div>

        <div className="stack">
          <h3>ค่าซ่อม</h3>
          {r.repairs.map((x, i) => (
            <div className="card stack-s" key={i}>
              <div className="between">
                <span className="bold clip">{x.th || x.en || `รายการที่ ${i + 1}`}</span>
                <button type="button" className="icon-btn" aria-label="ลบรายการ" onClick={() => setR({ ...r, repairs: r.repairs.filter((_, n) => n !== i) })}><Trash2 size={16} /></button>
              </div>
              {langs.map((l) => (
                <div className="field" key={l}>
                  <label htmlFor={`rp${i}-${l}`}>{label(l)}</label>
                  <input id={`rp${i}-${l}`} lang={l} value={x[l] || ''} aria-invalid={bad(l, x[l]) || undefined} style={bad(l, x[l]) ? { borderColor: 'var(--bad)' } : undefined} onChange={(e) => setRepair(i, { [l]: e.target.value })} />
                </div>
              ))}
              <div className="field" style={{ maxWidth: 160 }}><label htmlFor={`pr${i}`}>ราคา (บาท)</label><input id={`pr${i}`} type="number" placeholder="ตามใบเสร็จ" value={x.price ?? ''} onChange={(e) => setRepair(i, { price: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            </div>
          ))}
          <div className="row wrap">
            <button type="button" className="btn btn-primary grow" disabled={!unused.length} onClick={() => setPresets(true)}><ListPlus size={16} />เลือกจากรายการมาตรฐาน</button>
            <button type="button" className="btn btn-ghost grow" onClick={() => setR({ ...r, repairs: [...r.repairs, { en: '', th: '', zh: '', price: 0 }] })}><Plus size={16} />พิมพ์เอง</button>
          </div>
        </div>

        <div className="stack-s">
          <h3>จุดคืนรถ</h3>
          {presetRow('return')}
          {textFields('return', true)}
        </div>
        <div className="row">
          <div className="field grow"><label htmlFor="ab">ค่าปรับจอดทิ้ง (บาท)</label><input id="ab" type="number" value={r.abandonFee} onChange={(e) => setR({ ...r, abandonFee: Number(e.target.value) })} /></div>
          <div className="field grow"><label htmlFor="lt">คืนช้า/ชั่วโมง (บาท)</label><input id="lt" type="number" value={r.lateFeePerHour} onChange={(e) => setR({ ...r, lateFeePerHour: Number(e.target.value) })} /></div>
        </div>
        <div className="stack-s">
          <h3>ยึดอะไรไว้</h3>
          {presetRow('hold')}
          {textFields('hold', false)}
        </div>

        {tried && missingEn.length > 0 && <div className="callout callout-bad" role="alert">ยังขาดภาษาอังกฤษ: {missingEn.join(' · ')} — ภาษาอังกฤษต้องมีครบก่อนบันทึก</div>}
        {gaps.length > 0 && <div className="callout callout-info small">ยังว่าง: {gaps.join(' · ')} — บันทึกได้ ช่องที่ว่างแขกจะเห็นภาษาอังกฤษแทน</div>}
        <ErrorNote error={error} />
        <button type="button" className="btn btn-primary btn-block" onClick={save}>{saved ? 'บันทึกแล้ว' : 'บันทึกกติกา'}</button>
      </main>

      <Sheet open={presets} onClose={() => setPresets(false)} title="รายการมาตรฐาน">
        <p className="small muted">แปลอังกฤษ ไทย จีน ไว้ให้แล้ว เลือกแล้วใส่ราคาเอง</p>
        <div className="stack-s">
          {unused.map((p) => (
            <button type="button" key={p.en} className="card card-link stack-s" style={{ textAlign: 'left' }} onClick={() => { setR({ ...r, repairs: [...r.repairs, { ...p, price: p.price === null ? null : 0 }] }); setPresets(false); }}>
              <span className="bold">{p.th}</span>
              <span className="small muted">{p.en} · <span lang="zh">{p.zh}</span></span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

export function SettingsPage() {
  const { shop, shopId, refresh } = useShop();
  const [s, setS] = useState({ name: shop.name, nameEn: shop.nameEn, area: shop.area, areaEn: shop.areaEn, aboutTh: shop.aboutTh, aboutEn: shop.aboutEn });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const save = async () => {
    await api.patch(`/api/partner/${shopId}`, s);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const field = (k, label) => <div className="field"><label htmlFor={k}>{label}</label><input id={k} value={s[k]} onChange={set(k)} /></div>;
  return (
    <>
      <Top title="ข้อมูลร้าน" />
      <main className="page page-tabbed">
        {field('name', 'ชื่อร้าน')}
        {field('nameEn', 'ชื่อร้าน (อังกฤษ)')}
        {field('area', 'ที่ตั้ง')}
        {field('areaEn', 'ที่ตั้ง (อังกฤษ)')}
        {field('aboutTh', 'แนะนำร้าน')}
        {field('aboutEn', 'แนะนำร้าน (อังกฤษ)')}
        <button type="button" className="btn btn-primary btn-block" onClick={save}>{saved ? 'บันทึกแล้ว' : 'บันทึก'}</button>
      </main>
    </>
  );
}
