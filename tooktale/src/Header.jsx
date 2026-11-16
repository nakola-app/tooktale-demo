import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Globe, Luggage, MessageCircle } from 'lucide-react';
import { LANGS, Logo, langInfo } from '@tooktale/shared';
import { useLang, useT } from './i18n.js';

// เลือกภาษา: select จริงซ้อนใสไว้บนป้าย → มือถือได้ตัวเลือกของระบบ ไม่กินที่หัวเว็บ
export function LangSelect() {
  const { lang, setLang } = useLang();
  return (
    <label className="lang-select">
      <Globe size={15} aria-hidden="true" />
      <span aria-hidden="true">{langInfo(lang).short}</span>
      <ChevronDown size={13} aria-hidden="true" />
      <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)}>
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}

export function Header({ title, back, nav = false, chatTo = null }) {
  const t = useT();
  return (
    <header className="site-head">
      <div className="site-head-in">
        {back ? <Link to={back} className="round-btn" aria-label={t('back')}><ArrowLeft size={19} /></Link> : null}
        <div className="grow head-title">{title ? <h2 className="clip">{title}</h2> : <Logo size={21} />}</div>
        {nav && (
          <nav className="site-nav" aria-label="Sections">
            <a href="#bikes">{t('bikes')}</a>
            <a href="#how">{t('how')}</a>
            <a href="#places">{t('places')}</a>
          </nav>
        )}
        <LangSelect />
        {chatTo && <Link to={chatTo} className="round-btn chat-btn" aria-label={t('chatShop')}><MessageCircle size={19} /></Link>}
        <Link to="/trips" className="round-btn" aria-label={t('myTrips')}><Luggage size={19} /></Link>
      </div>
    </header>
  );
}
