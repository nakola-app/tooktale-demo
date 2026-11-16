import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bike, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, MapPin, MessageCircle, Search, UserRoundX } from 'lucide-react';
import {
  BikePhoto, ANGLES, ErrorNote, Loading, Sheet, api, addDays, baht, fmtDay, fmtDayRange, rentalDays, isoDay, langInfo, todayIso, toDate, useLive, useMeta,
} from '@tooktale/shared';
import { useLang, useT, pickName } from './i18n.js';
import { Header } from './Header.jsx';
import { Scene } from './Scene.jsx';

export const rememberToken = (token) => {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('tt.data.tokens') || '[]'); } catch { /* ไม่มีก็เริ่มใหม่ */ }
  if (!list.includes(token)) localStorage.setItem('tt.data.tokens', JSON.stringify([...list, token]));
};

const dayBusy = (v, day) => v.busy.some((r) => day >= r.from && day <= r.to);
const outOfWindow = (v, day) => (v.rentFrom && day < v.rentFrom) || (v.rentTo && day > v.rentTo);
const rangeClear = (v, from, to) => {
  for (let d = from; d <= to; d = addDays(d, 1)) if (dayBusy(v, d) || outOfWindow(v, d)) return false;
  return true;
};

const MOODS = ['sunset', 'lagoon', 'day', 'dusk'];

// รูปทรงโค้งของภาพหลัก อิงตามสัดส่วนกล่อง จึงยืดตามจอได้
function BlobDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <clipPath id="tt-blob-wide" clipPathUnits="objectBoundingBox">
          <path d="M.46 0 C.34 .09 .16 .13 .07 .3 C-.02 .47 .02 .66 .14 .75 C.28 .85 .46 .79 .62 .85 C.78 .91 .9 1 1 .86 L1 0 Z" />
        </clipPath>
        <clipPath id="tt-blob-phone" clipPathUnits="objectBoundingBox">
          <path d="M.1 .03 C.34 -.03 .68 .05 .92 .02 C1.01 .01 1 .2 1 .36 C1 .6 1.01 .86 .9 .94 C.72 1.04 .5 .9 .28 .95 C.12 .99 .01 .96 0 .74 C-.01 .5 -.01 .08 .1 .03 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function SearchField({ icon: Icon, label, wide, children }) {
  return (
    <label className={`sf ${wide ? 'sf-wide' : ''}`}>
      <span className="sf-icon"><Icon size={17} /></span>
      <span className="sf-body"><span className="sf-label">{label}</span>{children}</span>
    </label>
  );
}

function PointsSheet({ open, onClose, points, lang, t }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('pointsTitle')}>
      <div className="stack-s">
        {points.map((p) => (
          <div className="sum-row" key={p.id}><span>{pickName(p, lang)}</span><span className="bold num">{baht(p.fee)}</span></div>
        ))}
      </div>
    </Sheet>
  );
}

export function ShopPage() {
  const { slug } = useParams();
  const { lang } = useLang();
  const t = useT();
  const { data: shop, error, loading } = useLive(() => api.get(`/api/shops/${slug}`), [slug]);
  const [q, setQ] = useState({ point: 'shop', from: '', to: '', gear: 'all' });
  const [showPoints, setShowPoints] = useState(false);
  if (loading && !shop) return <Loading text="…" />;
  if (error && !shop) return <><Header /><div className="page"><ErrorNote error={error} /></div></>;

  const today = todayIso();
  const dated = q.from && q.to && q.from <= q.to;
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.value });
  const state = (v) => {
    if (dated) return rangeClear(v, q.from, q.to) ? 'free' : 'taken';
    if (outOfWindow(v, today)) return 'season';
    return dayBusy(v, today) ? 'out' : 'today';
  };
  const FLAG = {
    free: [t('freeDates'), ''], taken: [t('takenDates'), 'no'], today: [t('freeToday'), ''], out: [t('outToday'), 'no'], season: [t('seasonal'), 'season'],
  };
  const rank = (v) => (['free', 'today'].includes(state(v)) ? 0 : 1);
  const bikes = shop.vehicles.filter((v) => q.gear === 'all' || v.gear === q.gear);
  const shown = dated ? [...bikes].sort((a, b) => rank(a) - rank(b)) : bikes;
  const params = new URLSearchParams();
  if (dated) { params.set('from', q.from); params.set('to', q.to); }
  if (q.point !== 'shop') params.set('pickup', q.point);
  const suffix = params.toString() ? `?${params}` : '';
  const cheapest = Math.min(...shop.points.map((p) => p.fee));
  const goBikes = () => document.getElementById('bikes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <BlobDefs />
      <Header nav chatTo={`/${slug}/chat`} />
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{lang === 'th' ? shop.area : shop.areaEn}</span>
          <h1>{pickName(shop, lang)}<em>{t('tagline')}</em></h1>
          <p>{t(shop.deliveryOn ? 'heroSub' : 'heroSubShop')}</p>
          <button type="button" className="btn btn-primary hero-cta" onClick={goBikes}>{t('browse')}<span className="dot"><ArrowRight size={16} /></span></button>
        </div>
        <div className="hero-art">
          <Scene className="scene" mood="sunset" bike={shop.vehicles[4] || shop.vehicles[0]} label={t('sceneAlt')} />
          <div className="float-card">
            <div className="avatars">
              {shop.vehicles.slice(0, 3).map((v) => <span key={v.id}><Scene mood="lagoon" variant="card" bike={v} /></span>)}
            </div>
            {/* ส่งรถถึงจุดปิดอยู่ (รอ payment gateway) → โชว์จุดขายอื่นแทน */}
            {shop.deliveryOn ? (
              <>
                <b className="small">{t('floatTitle')}</b>
                <span className="tiny muted"><b className="num">{shop.points.length}</b> {t('floatSub')}</span>
              </>
            ) : (
              <>
                <b className="small">{t('cash')}</b>
                <span className="tiny muted">{t('noAccount')}</span>
              </>
            )}
          </div>
        </div>
        <Link to={`/${slug}/chat`} className="hero-chat" aria-label={t('chatShop')}>
          <svg className="ring" viewBox="0 0 128 128" aria-hidden="true">
            <defs><path id="tt-ring" d="M64 64 m-47 0 a47 47 0 1 1 94 0" /></defs>
            <text fontSize="12" fontWeight="500" fill="var(--ink)" fontFamily="var(--font-body)"><textPath href="#tt-ring" startOffset="50%" textAnchor="middle">{t('chatShop')}</textPath></text>
          </svg>
          <MessageCircle size={28} />
        </Link>
        <form className="search" onSubmit={(e) => { e.preventDefault(); goBikes(); }}>
          {shop.deliveryOn && (
          <SearchField icon={MapPin} label={t('whereGet')} wide>
            <select value={q.point} onChange={set('point')} aria-label={t('whereGet')}>
              <option value="shop">{t('atShop')}</option>
              {shop.points.map((p) => <option key={p.id} value={p.id}>{pickName(p, lang)}</option>)}
            </select>
          </SearchField>
          )}
          <SearchField icon={CalendarDays} label={t('pickDate')}>
            <input type="date" min={today} value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value, to: !q.to || q.to < e.target.value ? e.target.value : q.to })} aria-label={t('pickDate')} />
          </SearchField>
          <SearchField icon={CalendarDays} label={t('retDate')}>
            <input type="date" min={q.from || today} value={q.to} onChange={set('to')} aria-label={t('retDate')} />
          </SearchField>
          <SearchField icon={Bike} label={t('bikeType')} wide>
            <select value={q.gear} onChange={set('gear')} aria-label={t('bikeType')}>
              <option value="all">{t('anyBike')}</option>
              <option value="auto">{t('auto')}</option>
              <option value="semi">{t('semi')}</option>
            </select>
          </SearchField>
          <button className="btn btn-primary search-go" aria-label={t('search')}><Search size={20} /><span>{t('search')}</span></button>
        </form>
      </section>

      <main className="home">
        <div className="home-grid">
          <aside className="home-side">
            {shop.deliveryOn && (
            <div className="promo">
              <Scene className="scene" mood="day" variant="card" />
              <span className="tag">{t('promoTag')}</span>
              <h3>{t('promoA')}<br />{t('promoB')} <b className="num">{baht(cheapest)}</b></h3>
              <p className="small">{t('promoC')}</p>
              <button type="button" className="btn" onClick={() => setShowPoints(true)}>{t('seePoints')}</button>
            </div>
            )}
            <div className="stats">
              <div className="stat-i"><span className="ic"><Bike size={16} /></span><div><b className="num">{shop.vehicles.length}</b><span>{t('cBikes')}</span></div></div>
              {shop.deliveryOn && <div className="stat-i"><span className="ic"><MapPin size={16} /></span><div><b className="num">{shop.points.length}</b><span>{t('cPoints')}</span></div></div>}
              <div className="stat-i"><span className="ic"><UserRoundX size={16} /></span><div><b className="num">0</b><span>{t('cSignups')}</span></div></div>
            </div>
          </aside>
          <section className="stack" id="bikes" style={{ scrollMarginTop: 80 }}>
            <div className="section-title"><h2>{t('bikes')}</h2><span className="small muted num">{shown.length}{dated ? ` ${t('showing')}` : ''}</span></div>
            <div className="rides">
              {shown.map((v, i) => {
                const s = state(v);
                const [label, tone] = FLAG[s];
                return (
                  <Link key={v.id} className={`ride ${s === 'taken' ? 'dim' : ''}`} to={`/${slug}/v/${v.id}${suffix}`}>
                    <Scene className="scene" mood={MOODS[i % 4]} variant="card" bike={v} />
                    <span className={`ride-flag ${tone}`}><i />{label}</span>
                    <span className="ride-info">
                      <b>{v.name}</b>
                      <span>{lang === 'th' ? v.colorName : v.colorNameEn} · {v.gear === 'auto' ? t('auto') : t('semi')}</span>
                      <span className="cost num">{baht(v.pricePerDay)}{t('perDay')}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <section className="stack" id="how" style={{ scrollMarginTop: 80 }}>
          <h2>{t('how')}</h2>
          <div className="how">
            {['how1', 'how2', 'how3'].map((k, i) => <div className="how-step" key={k}><span className="n">{i + 1}</span><span>{t(k)}</span></div>)}
          </div>
        </section>

        <section className="stack" id="places" style={{ scrollMarginTop: 80 }}>
          <h2>{t('places')}</h2>
          <div className="places">
            {shop.spots.map((s, i) => (
              <article className="place" key={s.id}>
                <Scene className="scene" mood={MOODS[(i + 3) % 4]} variant="card" />
                <div>
                  <div className="bold">{pickName(s, lang)}</div>
                  <div className="small">{lang === 'th' ? s.noteTh : s.noteEn}</div>
                </div>
              </article>
            ))}
          </div>
          <p className="small muted">{t('placesMore')}</p>
        </section>
        <p className="site-foot">tooktale by nakola</p>
      </main>
      <PointsSheet open={showPoints} onClose={() => setShowPoints(false)} points={shop.points} lang={lang} t={t} />
    </>
  );
}

function RangeCalendar({ vehicle, from, to, onChange, lang }) {
  const today = todayIso();
  const [month, setMonth] = useState(() => {
    const d = toDate(from || today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1))), [month, daysInMonth]);
  const locale = langInfo(lang).locale;
  const dows = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, i + 1).toLocaleDateString(locale, { weekday: 'narrow' }));
  const pick = (day) => {
    // แตะครั้งแรก = เช่า 1 วัน (รับ-คืนวันเดียวกัน) · แตะวันถัดไป = ขยายถึงวันนั้น · แตะอีกที = เริ่มใหม่
    if (from && to === from && day > from) onChange(from, day);
    else onChange(day, day);
  };
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className="stack-s">
      <div className="between">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="previous month"><ChevronLeft size={18} /></button>
        <span className="bold">{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="next month"><ChevronRight size={18} /></button>
      </div>
      <div className="cal">
        {dows.map((d, i) => <div className="dow" key={i}>{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {cells.map((day) => {
          const past = day < today;
          const busy = dayBusy(vehicle, day) || outOfWindow(vehicle, day);
          const end = day === from || day === to;
          const inRange = from && to && day > from && day < to;
          return (
            <button type="button" key={day} disabled={past || busy} data-day={day} className={`${busy && !past ? 'busy' : ''} ${inRange ? 'in' : ''} ${end ? 'end' : ''}`} onClick={() => pick(day)}>
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VehiclePage() {
  const { slug, vid } = useParams();
  const [params] = useSearchParams();
  const { lang } = useLang();
  const t = useT();
  const nav = useNavigate();
  const { data: shop, error } = useLive(() => api.get(`/api/shops/${slug}`), [slug]);
  const [from, setFrom] = useState(params.get('from'));
  const [to, setTo] = useState(params.get('to'));
  if (error && !shop) return <div className="page"><ErrorNote error={error} /></div>;
  if (!shop) return <Loading text="…" />;
  const v = shop.vehicles.find((x) => x.id === vid);
  if (!v) return <div className="page">{t('notFound')}</div>;
  const days = rentalDays(from, to);
  const clear = days > 0 && rangeClear(v, from, to);
  const pickup = params.get('pickup');
  const go = () => nav(`/${slug}/v/${vid}/book?from=${from}&to=${to}${pickup ? `&pickup=${pickup}` : ''}`);
  return (
    <>
      <Header title={v.name} back={`/${slug}`} />
      <main className="page">
        <div className="split">
          <div className="col">
            <div className="gallery">
              {ANGLES.map((a) => <div key={a}><BikePhoto vehicle={v} angle={a} damage={v.oldMark === a ? 'old' : null} lang={lang} bg="hero" /></div>)}
            </div>
            <div className="between">
              <div>
                <h2>{v.name}</h2>
                <div className="small muted">{lang === 'th' ? v.colorName : v.colorNameEn} · {v.cc}cc · {v.gear === 'auto' ? t('auto') : t('semi')}</div>
              </div>
              <div className="center"><span className="price">{baht(v.pricePerDay)}</span><div className="tiny muted">{t('perDay')}</div></div>
            </div>
          </div>
          <div className="col side-sticky">
            <div className="card stack">
              <div>
                <h3>{t('chooseDates')}</h3>
                <p className="small muted">{t('pickDates')}</p>
              </div>
              <RangeCalendar vehicle={v} from={from} to={to} lang={lang} onChange={(a, b) => { setFrom(a); setTo(b); }} />
              <div className="legend">
                <span><i style={{ background: 'var(--accent)' }} />{t('selected')}</span>
                <span><i style={{ background: '#dfe6f2' }} />{t('taken')}</span>
              </div>
            </div>
            {days > 0 && !clear && <div className="callout callout-warn">{t('notFree')}</div>}
            <div className="bar-cta">
              {days > 0 && clear && (
                <div className="between small" style={{ marginBottom: 8 }}>
                  <span className="muted">{fmtDayRange(from, to, lang)}</span>
                  <span className="bold num">{days} {t(days === 1 ? 'day' : 'days')} · {baht(days * v.pricePerDay)}</span>
                </div>
              )}
              <button type="button" className="btn btn-primary btn-block" disabled={!clear} onClick={go}>{t('continue')}</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Option({ on, onClick, title, right }) {
  return (
    <button type="button" className="option" aria-pressed={on} onClick={onClick}>
      <span className="tick">{on && <Check size={13} />}</span>
      <span className="grow bold">{title}</span>
      {right && <span className="bold num">{right}</span>}
    </button>
  );
}

function LegPicker({ title, leg, setLeg, points, lang, t }) {
  return (
    <div className="stack-s">
      <h3>{title}</h3>
      <Option on={leg.mode === 'shop'} onClick={() => setLeg({ mode: 'shop' })} title={t('atShop')} right={t('atShopSub')} />
      {points.map((p) => (
        <Option key={p.id} on={leg.pointId === p.id} onClick={() => setLeg({ mode: 'point', pointId: p.id })} title={pickName(p, lang)} right={`+${baht(p.fee)}`} />
      ))}
    </div>
  );
}

export function BookPage() {
  const { slug, vid } = useParams();
  const [params] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const fromSearch = params.get('pickup');
  const { lang } = useLang();
  const t = useT();
  const nav = useNavigate();
  const { data: shop } = useLive(() => api.get(`/api/shops/${slug}`), [slug]);
  const [guest, setGuest] = useState({ name: '', email: '', whatsapp: '', license: '' });
  const [pickup, setPickup] = useState(fromSearch ? { mode: 'point', pointId: fromSearch } : { mode: 'shop' });
  const [dropoff, setDropoff] = useState({ mode: 'shop' });
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('17:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const meta = useMeta();
  const autoMin = meta?.autoConfirmMin ?? 15;
  if (!shop) return <Loading text="…" />;
  const v = shop.vehicles.find((x) => x.id === vid);
  const days = rentalDays(from, to);
  const fee = (leg) => shop.points.find((p) => p.id === leg.pointId)?.fee || 0;
  const delivery = fee(pickup) + fee(dropoff);
  const badTime = from === to && returnTime <= pickupTime;
  // ค่าธรรมเนียม tooktale: แขกจ่ายร้านพร้อมค่าเช่า (ร้านเก็บแทน) · ช่วงทดลอง = ฟรี
  const feePct = meta && todayIso() > meta.fee.trialUntil ? meta.fee.pct : 0;
  const svcFee = Math.round((days * (v?.pricePerDay || 0) * feePct) / 100);
  const set = (k) => (e) => setGuest({ ...guest, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/api/bookings', {
        shopSlug: slug, vehicleId: vid, from, to, pickupTime, returnTime, pickup, dropoff, guest, lang,
        threadToken: localStorage.getItem(`tt.data.thread.${slug}`) || undefined,
      });
      rememberToken(res.token);
      localStorage.removeItem(`tt.data.thread.${slug}`);
      nav(`/b/${res.token}`, { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <Header title={t('book')} back={`/${slug}/v/${vid}`} />
      <main className="page">
        <div className="split">
          <div className="col">
            <div className="card stack">
              <div className="between"><h3>{t('yourDetails')}</h3>
                <button type="button" className="btn btn-ghost btn-s" onClick={() => setGuest({ name: 'Sophie Weber', email: 'sophie@example.com', whatsapp: '+49 170 0000000', license: 'IDP-482910', country: 'Germany' })}>{t('fillSample')}</button>
              </div>
              <div className="field"><label htmlFor="g-name">{t('name')}</label><input id="g-name" required value={guest.name} onChange={set('name')} autoComplete="name" /></div>
              <div className="field"><label htmlFor="g-email">{t('email')}</label><input id="g-email" required type="email" value={guest.email} onChange={set('email')} autoComplete="email" /></div>
              <div className="field"><label htmlFor="g-wa">{t('whatsapp')}</label><input id="g-wa" required type="tel" value={guest.whatsapp} onChange={set('whatsapp')} /></div>
              <div className="field"><label htmlFor="g-lic">{t('license')}</label><input id="g-lic" value={guest.license} onChange={set('license')} /></div>
            </div>
            {shop.deliveryOn ? (
              <>
                <LegPicker title={t('pickupHow')} leg={pickup} setLeg={setPickup} points={shop.points} lang={lang} t={t} />
                <LegPicker title={t('returnHow')} leg={dropoff} setLeg={setDropoff} points={shop.points} lang={lang} t={t} />
              </>
            ) : <div className="callout callout-info small" data-testid="at-shop-only"><MapPin size={16} style={{ flex: 'none' }} />{t('atShopOnly')}</div>}
            <div className="row">
              <div className="field grow"><label htmlFor="pt"><Clock size={12} /> {t('pickupTime')}</label><input id="pt" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} /></div>
              <div className="field grow"><label htmlFor="rt"><Clock size={12} /> {t('returnTime')}</label><input id="rt" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></div>
            </div>
            {badTime && <div className="callout callout-warn">{t('sameDayTime')}</div>}
          </div>
          <div className="col side-sticky">
            <div className="card row">
              <div className="mini-bike"><BikePhoto vehicle={v} caption={false} bg="hero" /></div>
              <div className="grow">
                <div className="bold">{v.name}</div>
                <div className="small muted">{fmtDayRange(from, to, lang)}</div>
                <div className="small muted">{days} {t(days === 1 ? 'day' : 'days')}</div>
              </div>
            </div>
            <div className="card stack-s">
              <div className="sum-row"><span className="muted">{t('rent')} ({days} × {baht(v.pricePerDay)})</span><span className="num">{baht(days * v.pricePerDay)}</span></div>
              {delivery > 0 && <div className="sum-row"><span className="muted">{t('deliveryFee')}</span><span className="num">{baht(delivery)}</span></div>}
              <div className="sum-row"><span className="muted">{t('serviceFee')}</span>{svcFee > 0 ? <span className="num" data-testid="service-fee">{baht(svcFee)}</span> : <span className="chip chip-good">{t('freeTrial')}</span>}</div>
              <hr className="divider" />
              <div className="sum-row bold"><span>{t('total')}</span><span className="num">{baht(days * v.pricePerDay + delivery + svcFee)}</span></div>
              <p className="small muted">{t('payCash')}</p>
            </div>
            <ErrorNote error={error} />
            <p className="small muted center" data-testid="next-steps">{t('nextSteps', { min: autoMin })} {t('keepLink')}</p>
            <div className="bar-cta">
              <button className="btn btn-primary btn-block" disabled={busy || badTime}>{busy ? t('sending') : t('book')}</button>
            </div>
          </div>
        </div>
      </main>
    </form>
  );
}
