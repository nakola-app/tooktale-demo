import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bike, CheckCircle2, Clock, FastForward, FileSignature, Languages, MapPinned, MessageCircle, Route as RouteIcon, Smartphone, TriangleAlert } from 'lucide-react';
import {
  BikePhoto, ANGLES, ANGLE_LABEL, ChatInput, ChatLog, ErrorNote, EvidenceChain, FUEL, IslandMap, JOB_KIND, JobChip, Loading, PhotoCompare,
  SelfieView, StatusChip, agreementLang, api, baht, fmtDay, fmtDayRange, fmtStamp, minutesLeft, repairText, ruleText, tr, useLive, useMeta, useNow,
} from '@tooktale/shared';
import { useLang, useT, pickName } from './i18n.js';
import { Header } from './Header.jsx';
import { rememberToken } from './shop.jsx';

const DEVICE_KEY = { guest_phone: 'onYourPhone', shop_phone: 'onShopPhone', runner_phone: 'onRunnerPhone' };

// ใบตกลงที่กดจากเครื่องร้าน/คนเดินรถ: บอกแขกให้ชัด และให้แขกแจ้งได้ถ้าไม่ได้กดเอง
function NotMe({ b, token, onDone }) {
  const t = useT();
  const [sent, setSent] = useState(false);
  if (b.agreement.status !== 'accepted' || !b.agreement.acceptedOn || b.agreement.acceptedOn === 'guest_phone') return null;
  if (sent || b.agreement.guestDisputedAt) {
    return <div className="callout callout-bad" data-testid="not-me-sent"><TriangleAlert size={18} style={{ flex: 'none' }} />{t('notMeSent')}</div>;
  }
  const report = async () => {
    await api.post(`/api/b/${token}/not-me`);
    setSent(true);
    onDone?.();
  };
  // แจ้งได้จนถึงตอนคืนรถเท่านั้น
  if (b.status !== 'active') {
    return (
      <div className="callout callout-info small" data-testid="not-me-closed">
        <Smartphone size={16} style={{ flex: 'none' }} /><span className="grow"><b>{t(DEVICE_KEY[b.agreement.acceptedOn])}</b> · {t('notMeClosed')}</span><SelfieView selfie={b.agreement.selfie} size={56} caption={t('selfieCap')} />
      </div>
    );
  }
  return (
    <div className="callout callout-warn stack-s" data-testid="accepted-elsewhere">
      <span className="row-top"><Smartphone size={18} style={{ flex: 'none', marginTop: 2 }} /><span className="grow"><b>{t(DEVICE_KEY[b.agreement.acceptedOn])}</b><br />{t('notMeHint')}</span><SelfieView selfie={b.agreement.selfie} size={64} caption={t('selfieCap')} /></span>
      <button type="button" className="btn btn-ghost btn-s" style={{ alignSelf: 'flex-start' }} onClick={report}>{t('notMe')}</button>
    </div>
  );
}

function useBooking(token) {
  useEffect(() => { rememberToken(token); }, [token]);
  return useLive(() => api.get(`/api/b/${token}`), [token]);
}

const legText = (point, t, lang) => (point ? pickName(point, lang) : t('shopPickup'));

function Steps({ b, t }) {
  const order = ['requested', 'confirmed', 'active', 'returned', 'completed'];
  const at = order.indexOf(b.status);
  const labels = [t('stepReq'), t('stepConf'), t('stepAgree'), t('stepRet'), t('stepDone')];
  return (
    <div className="steps">
      {labels.map((label, i) => {
        const done = i < at || b.status === 'completed';
        const now = i === at && b.status !== 'completed';
        return (
          <div key={label} className={`step ${done ? 'done' : ''} ${now ? 'now' : ''}`}>
            <span className="step-dot">{done ? '✓' : i + 1}</span>
            <span className={now ? 'bold' : 'muted'}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BookingPage() {
  const { token } = useParams();
  const { lang } = useLang();
  const t = useT();
  const { data: b, error, refresh } = useBooking(token);
  const nowMs = useNow(10000);
  const autoMin = useMeta()?.autoConfirmMin ?? 15;
  if (error && !b) {
    return (
      <>
        <Header title={t('booking')} back="/" />
        <div className="page"><ErrorNote error={error} /><Link to="/" className="btn btn-ghost">{t('home')}</Link></div>
      </>
    );
  }
  if (!b) return <Loading text="…" />;
  const cancel = async () => { await api.post(`/api/b/${token}/cancel`); refresh(); };
  const dead = ['rejected', 'cancelled'].includes(b.status);
  const msgs = b.thread?.messages.length || 0;
  return (
    <>
      <Header title={`${t('booking')} ${b.code}`} back={`/${b.shop.slug}`} />
      <main className="page">
        <div className={b.handoffs.length > 0 ? 'split' : 'narrow-col'}>
          <div className="col">
        <div className="card row">
          <div style={{ width: 96, flex: 'none', borderRadius: 8, overflow: 'hidden' }}><BikePhoto vehicle={b.vehicle} caption={false} bg="hero" /></div>
          <div className="grow stack-s" style={{ gap: 2 }}>
            <div className="between"><span className="bold clip">{b.vehicle.name}</span><StatusChip status={b.status} lang={lang} /></div>
            <div className="small muted">{pickName(b.shop, lang)}</div>
            <div className="small muted">{b.vehicle.plate}</div>
          </div>
        </div>

        {b.status === 'rejected' && <div className="callout callout-bad">{t('rejected')} {b.rejectReason}</div>}
        {b.status === 'cancelled' && (
          <div className="callout callout-bad" data-testid="cancelled-note">
            {b.cancelledBy === 'shop' ? <span>{t('shopCancelled')}{b.cancelReason ? ` ${b.cancelReason}` : ''}</span> : t('cancelled')}
          </div>
        )}
        {b.status === 'requested' && (
          <div className="callout callout-info stack-s" data-testid="wait-shop">
            <span className="row-top"><Clock size={18} style={{ flex: 'none', marginTop: 2 }} /><span>{t('waitShop', { n: minutesLeft(b.autoConfirmAt, nowMs) })}</span></span>
            <button type="button" className="btn btn-ghost btn-s" style={{ alignSelf: 'flex-start' }} onClick={async () => { await api.post(`/api/demo/bookings/${b.id}/skip-wait`); refresh(); }}>
              <FastForward size={15} />{t('skipDemo')}
            </button>
          </div>
        )}
        {b.confirmedBy === 'auto' && !dead && <div className="callout callout-good" data-testid="auto-confirmed"><CheckCircle2 size={18} style={{ flex: 'none' }} />{t('autoConfirmed', { min: autoMin })}</div>}
        {b.swappedFrom && !dead && (
          <div className="callout callout-info" data-testid="swapped-note">
            <Bike size={18} style={{ flex: 'none' }} />
            <span>{t('swappedNote', { from: `${b.swappedFrom.name} (${b.swappedFrom.plate})` })} {b.pricePerDay < b.swappedFrom.pricePerDay ? t('priceLower', { price: baht(b.pricePerDay) }) : t('priceSame')}</span>
          </div>
        )}
        {dead && <Link to={`/${b.shop.slug}`} className="btn btn-primary">{t('tryOther')}</Link>}

        {b.agreement.status === 'ready' && (
          <div className="card stack attention">
            <div className="row-top"><FileSignature size={22} style={{ color: "var(--accent)", flex: "none" }} />
              <div><h3>{t('agreementReady')}</h3><p className="small muted">{t('agreementReadySub')}</p></div>
            </div>
            <Link to={`/b/${token}/agreement`} className="btn btn-coral btn-block">{t('openAgreement')}</Link>
          </div>
        )}

        {!dead && <div className="card"><Steps b={b} t={t} /></div>}

        <div className="card stack-s">
          <div className="sum-row"><span className="muted">{t('pickup')}</span><span className="bold" style={{ textAlign: 'right' }}>{fmtDay(b.from, lang)} · {b.pickupTime}<br /><span className="small muted">{legText(b.pickupPoint, t, lang)}</span></span></div>
          <div className="sum-row"><span className="muted">{t('ret')}</span><span className="bold" style={{ textAlign: 'right' }}>{fmtDay(b.to, lang)} · {b.returnTime}<br /><span className="small muted">{legText(b.dropoffPoint, t, lang)}</span></span></div>
          <hr className="divider" />
          <div className="sum-row"><span className="muted">{t('rent')} ({b.days} {t(b.days === 1 ? 'day' : 'days')})</span><span className="num">{baht(b.rentTotal)}</span></div>
          {b.deliveryFee > 0 && <div className="sum-row"><span className="muted">{t('deliveryFee')}</span><span className="num">{baht(b.deliveryFee)}</span></div>}
          <div className="sum-row"><span className="muted">{t('serviceFee')}</span>{b.fee > 0 ? <span className="num">{baht(b.fee)}</span> : <span className="chip chip-good">{t('freeTrial')}</span>}</div>
          <div className="sum-row bold"><span>{t('total')}</span><span className="num">{baht(b.rentTotal + b.deliveryFee + (b.fee || 0))}</span></div>
          <p className="small muted">{t('payCash')}</p>
        </div>

        {b.jobs.length > 0 && (
          <div className="card stack-s">
            <h3 className="row"><RouteIcon size={17} />{t('runnerTrack')}</h3>
            {b.jobs.map((j) => (
              <div className="between" key={j.id}>
                <span className="small">{tr(JOB_KIND[j.kind], lang)} · {pickName(j.point, lang)}</span>
                <JobChip status={j.status} lang={lang} />
              </div>
            ))}
          </div>
        )}

        {!dead && (
          <div className="row">
            {b.thread && (
              <Link to={`/b/${token}/chat`} className="btn btn-ghost grow"><MessageCircle size={18} />{t('chat')}{msgs > 0 && <span className="chip num">{msgs}</span>}</Link>
            )}
            <Link to={`/b/${token}/map`} className="btn btn-ghost grow"><MapPinned size={18} />{t('map')}</Link>
          </div>
        )}

        {b.agreement.status === 'accepted' && (
          <Link to={`/b/${token}/agreement`} className="card card-link row">
            <CheckCircle2 size={20} style={{ color: 'var(--good)' }} />
            <span className="grow"><span className="bold">{t('agreement')}</span><br /><span className="small muted">{fmtStamp(b.agreement.acceptedAt, lang)} · {t(DEVICE_KEY[b.agreement.acceptedOn] || 'onYourPhone')}</span></span>
            <ArrowRight size={18} />
          </Link>
        )}
        <NotMe b={b} token={token} onDone={refresh} />
        {b.status === 'confirmed' && b.agreement.status === 'none' && <div className="callout callout-info stack-s" data-testid="confirmed-next"><span>{t('confirmedNext')}</span><span>{t('agreementWait')}</span></div>}
        {['requested', 'confirmed'].includes(b.status) && b.agreement.status === 'none' && (
          <button type="button" className="btn btn-danger" onClick={cancel}>{t('cancel')}</button>
        )}
          </div>
          <div className="col">
        {['returned', 'completed'].includes(b.status) && (
          <>
            {b.damage ? (
              <div className="card stack-s">
                <h3 className="row"><TriangleAlert size={17} style={{ color: 'var(--bad)' }} />{t('damage')}</h3>
                {b.damage.items.map((d) => (
                  <div className="sum-row" key={d.label}><span>{tr({ th: d.label, en: d.labelEn, zh: d.labelZh }, lang)}</span><span className="bold num">{d.price === null ? t('byReceipt') : baht(d.price)}</span></div>
                ))}
                {lang === 'th' && b.damage.note && <p className="small muted">{b.damage.note}</p>}
              </div>
            ) : b.status === 'completed' && <div className="callout callout-good"><CheckCircle2 size={18} />{t('noDamage')}</div>}
            <div className="stack-s">
              <h3>{t('comparison')}</h3>
              <PhotoCompare booking={b} lang={lang} />
            </div>
          </>
        )}

        {b.handoffs.length > 0 && (
          <div className="stack">
            <h3>{t('photos')}</h3>
            <EvidenceChain booking={b} lang={lang} />
          </div>
        )}
          </div>
        </div>
      </main>
    </>
  );
}

export function AgreementPage() {
  const { token } = useParams();
  const { lang } = useLang();
  const t = useT();
  const nav = useNavigate();
  const { data: b, error } = useBooking(token);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewEn, setViewEn] = useState(false);
  if (error && !b) return <div className="page"><ErrorNote error={error} /></div>;
  if (!b) return <Loading text="…" />;
  const rules = b.agreement.rules || b.shop.rules;
  // ทั้งใบเป็นภาษาเดียว: ภาษาของแขกถ้าร้านเปิดไว้ ไม่งั้นอังกฤษ
  const shown = agreementLang(rules, lang);
  const L = viewEn ? 'en' : shown;
  const set = b.handoffs.find((h) => h.stage === 'to_guest');
  const accepted = b.agreement.status === 'accepted';
  const accept = async () => {
    setBusy(true);
    await api.post(`/api/b/${token}/accept`, { on: 'guest_phone', lang: shown });
    nav(`/b/${token}`, { replace: true });
  };
  return (
    <>
      <Header title={t('agreement')} back={`/b/${token}`} />
      <main className="page narrow">
        {accepted && <div className="callout callout-good"><CheckCircle2 size={18} />{t('accepted')} · {fmtStamp(b.agreement.acceptedAt, lang)} · {t(DEVICE_KEY[b.agreement.acceptedOn] || 'onYourPhone')}</div>}
        {accepted && <NotMe b={b} token={token} />}
        {!accepted && b.agreement.status !== 'ready' && <div className="callout callout-warn">{t('notReady')}</div>}

        {shown !== lang && <div className="callout callout-info" data-testid="agreement-en-only"><Languages size={18} style={{ flex: 'none' }} />{t('onlyEn')}</div>}
        {shown !== 'en' && (
          <div className="callout callout-info between wrap" data-testid="agreement-translation">
            <span className="small">{viewEn ? t('viewingEn') : t('enBinding')}</span>
            <button type="button" className="btn btn-ghost btn-s" onClick={() => setViewEn(!viewEn)}>{viewEn ? t('viewMine') : t('viewEn')}</button>
          </div>
        )}

        <div className="card stack-s" lang={L}>
          <h3>{t('repairs')}</h3>
          <p className="small muted">{t('repairsSub')}</p>
          {rules.repairs.map((r, i) => (
            <div className="sum-row" key={i}><span>{repairText(r, L)}</span><span className="bold num" style={{ whiteSpace: 'nowrap' }}>{r.price === null ? t('byReceipt') : baht(r.price)}</span></div>
          ))}
        </div>
        <div className="card stack-s" lang={L}>
          <h3>{t('whereReturn')}</h3>
          <p>{ruleText(rules, 'return', L)}</p>
          <div className="sum-row"><span className="muted">{t('abandon')}</span><span className="bold num">{baht(rules.abandonFee)}</span></div>
          <div className="sum-row"><span className="muted">{t('late')}</span><span className="bold num">{baht(rules.lateFeePerHour)}{t('perHour')}</span></div>
        </div>
        <div className="card stack-s" lang={L}>
          <h3>{t('whatHold')}</h3>
          <p>{ruleText(rules, 'hold', L)}</p>
        </div>
        {set && (
          <div className="stack-s">
            <h3>{t('condition')}</h3>
            <p className="small muted">{t('fuelLabel')}: {tr(FUEL[set.fuel], lang)}</p>
            <div className="pair-grid">
              {ANGLES.map((a) => {
                const p = set.photos.find((x) => x.angle === a);
                return <div className="shot" key={a}><BikePhoto vehicle={b.vehicle} angle={a} damage={p?.damage} takenAt={p?.takenAt} lang={lang} highlight /></div>;
              })}
            </div>
            {set.photos.some((p) => p.damage === 'old') && (
              <p className="small muted">{t('oldMark')}: {set.photos.filter((p) => p.damage === 'old').map((p) => tr(ANGLE_LABEL[p.angle], lang)).join(', ')}</p>
            )}
          </div>
        )}
        {b.agreement.status === 'ready' && (
          <label className="agree-box">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>{t('iAgree')}</span>
          </label>
        )}
      {b.agreement.status === 'ready' && (
        <div className="bar-cta"><button type="button" className="btn btn-coral btn-block" disabled={!checked || busy} onClick={accept}>{t('accept')}</button></div>
      )}
      </main>
    </>
  );
}

const ROAD_TONE = { easy: 'good', medium: 'warn', hard: 'bad' };

export function MapPage() {
  const { token } = useParams();
  const { lang } = useLang();
  const t = useT();
  const { data: b } = useBooking(token);
  const [selected, setSelected] = useState(null);
  if (!b) return <Loading text="…" />;
  const pins = b.spots.map((s, i) => ({ id: s.id, x: s.mapX, y: s.mapY, label: String(i + 1), color: 'var(--accent)' }));
  return (
    <>
      <Header title={t('localMap')} back={`/b/${token}`} />
      <main className="page">
        <p className="small muted">{t('mapIntro')}</p>
        <div className="split"><div className="col side-sticky"><IslandMap pins={pins} selected={selected} onPick={setSelected} height={420} note={t('mapNote')} />
        <p className="tiny faint">{t('sampleSpots')}</p></div>
        <div className="stack">
          {b.spots.map((s, i) => (
            <button type="button" key={s.id} className="card card-link stack-s" onClick={() => setSelected(s.id)} style={selected === s.id ? { boxShadow: 'inset 0 0 0 2px var(--accent), var(--shadow)' } : undefined}>
              <div className="row-top"><span className="chip chip-coral num">{i + 1}</span><span className="bold">{pickName(s, lang)}</span></div>
              <p className="small">{lang === 'th' ? s.noteTh : s.noteEn}</p>
              <div className="row wrap"><span className={`chip chip-${ROAD_TONE[s.roadLevel]}`}>{t(s.roadLevel)}</span><span className="small muted">{lang === 'th' ? s.roadTh : s.roadEn}</span></div>
              <p className="small muted"><b>{t('respect')}:</b> {lang === 'th' ? s.respectTh : s.respectEn}</p>
            </button>
          ))}
        </div>
        </div>
      </main>
    </>
  );
}

// ใช้ได้ทั้งก่อนจอง (/:slug/chat) และหลังจอง (/b/:token/chat) แชทเดียวกันผูกกับ booking
export function ChatPage() {
  const { slug, token } = useParams();
  const { lang } = useLang();
  const t = useT();
  const storeKey = slug ? `tt.data.thread.${slug}` : null;
  const [threadToken, setThreadToken] = useState(() => (storeKey ? localStorage.getItem(storeKey) : null));
  const booking = useLive(() => (token ? api.get(`/api/b/${token}`) : Promise.resolve(null)), [token]);
  const resolved = token ? booking.data?.thread?.token : threadToken;
  const thread = useLive(() => (resolved ? api.get(`/api/threads/${resolved}`) : Promise.resolve(null)), [resolved]);

  const send = async (text) => {
    let tk = resolved;
    if (!tk) {
      const created = await api.post('/api/threads', { shopSlug: slug, lang });
      tk = created.token;
      localStorage.setItem(storeKey, tk);
      rememberToken(tk);
      setThreadToken(tk);
    }
    await api.post(`/api/threads/${tk}/messages`, { text });
    thread.refresh();
  };
  const back = token ? `/b/${token}` : `/${slug}`;
  const messages = thread.data?.messages || [];
  return (
    <>
      <Header title={t('chatShop')} back={back} />
      <main className="page narrow" style={{ paddingBottom: 0 }}>
        {messages.length === 0 && <div className="empty">{t('chatEmpty')}</div>}
        <div className="grow"><ChatLog messages={messages} me="guest" lang={lang} /></div>
        <ChatInput onSend={send} placeholder={t('chatPlaceholder')} />
      </main>
    </>
  );
}

export function TripsPage() {
  const { lang } = useLang();
  const t = useT();
  const { data, loading } = useLive(async () => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('tt.data.tokens') || '[]'); } catch { /* ว่าง */ }
    const items = await Promise.all(list.map((k) => api.get(`/api/b/${k}`).catch(() => null)));
    return items.filter(Boolean).reverse();
  }, []);
  return (
    <>
      <Header title={t('myTrips')} back="/" />
      <main className="page narrow">
        {!loading && !data?.length && <div className="empty">{t('noTrips')}</div>}
        {data?.map((b) => (
          <Link key={b.id} to={`/b/${b.token}`} className="card card-link row">
            <div style={{ width: 72, flex: 'none', borderRadius: 8, overflow: 'hidden' }}><BikePhoto vehicle={b.vehicle} caption={false} bg="hero" /></div>
            <div className="grow">
              <div className="between"><span className="bold clip">{b.vehicle.name}</span><StatusChip status={b.status} lang={lang} /></div>
              <div className="small muted">{fmtDayRange(b.from, b.to, lang)}</div>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
