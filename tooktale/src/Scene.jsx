import { useId } from 'react';
import { BikeSide } from '@tooktale/shared';

// ฉากทะเลอันดามันวาดเอง ใช้แทนรูปถ่ายจนกว่าจะมีรูปจริงของเกาะ และทำงานได้โดยไม่มีเน็ต
const MOODS = {
  sunset: { sky: ['#7FB2EC', '#FAD9BC', '#FDB97E'], sun: '#FFF0C9', sea: ['#3D92CC', '#0D4F86'], far: '#7E9BBE', near: '#3F6078', cap: '#5C8A72', sand: ['#F8E3C0', '#EBC893'] },
  day: { sky: ['#5FA8F2', '#CDE7FB', '#EAF6FD'], sun: '#FFFFFF', sea: ['#22A9CF', '#0B6FA6'], far: '#8FB4CF', near: '#3E7A63', cap: '#5FA77F', sand: ['#FBEBCB', '#F0D5A6'] },
  lagoon: { sky: ['#9CD3F5', '#DDF1FB', '#F2FAFD'], sun: '#FFFFFF', sea: ['#3FCFC9', '#0E93B3'], far: '#9CC4D6', near: '#3F8A73', cap: '#6DB98C', sand: ['#FCEFD3', '#F3DCB2'] },
  dusk: { sky: ['#2F4A92', '#B97FAE', '#F6AE80'], sun: '#FFD9A8', sea: ['#2C4D8E', '#142C5E'], far: '#5A6AA3', near: '#2A3768', cap: '#3D5A7E', sand: ['#E3C3AE', '#BE967F'] },
};

const K1 = 'M0 0 C10 -60 30 -110 58 -125 C74 -134 84 -160 108 -162 C138 -164 146 -125 170 -108 C192 -92 205 -45 220 0 Z';
const K2 = 'M0 0 C14 -30 20 -80 44 -98 C62 -112 70 -140 96 -134 C118 -130 120 -94 142 -80 C160 -68 170 -30 182 0 Z';

function Karst({ d, x, y, s = 1, fill, cap }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={d} fill={fill} />
      {cap && <path d={d} fill={cap} opacity=".75" transform="translate(16 -14) scale(.86 .62)" />}
    </g>
  );
}

function Palm({ x, y, s = 1, tint = '#1F5C4A' }) {
  const leaf = (r, l = 1) => <path key={`${r}${l}`} d="M0 0 C40 -34 96 -34 132 6 C96 -8 44 -6 0 0 Z" fill={tint} transform={`rotate(${r}) scale(${l})`} />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 330 C-4 220 8 110 54 0 L68 6 C30 110 18 230 16 330 Z" fill="#6E5540" />
      <g transform="translate(60 0)">
        {[-168, -130, -92, -52, -14, 26].map((r) => leaf(r))}
        {[-150, -70, 8].map((r) => leaf(r, 0.78))}
      </g>
    </g>
  );
}

function Boat({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-74 -16 C-44 4 40 6 62 -4 L80 -34 C84 -22 76 8 56 14 C10 22 -46 20 -66 8 Z" fill="#1E3350" />
      <path d="M-46 -2 L-46 -26 L30 -26 L30 0" fill="none" stroke="#1E3350" strokeWidth="3" />
      <path d="M-54 -28 L38 -28 L30 -36 L-46 -36 Z" fill="#E8743B" />
      <path d="M80 -34 L86 -44" stroke="#2F7DE1" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

export function Scene({ mood = 'sunset', bike = null, variant = 'hero', className, label = '' }) {
  const id = useId().replace(/:/g, '');
  const m = MOODS[mood];
  const hero = variant === 'hero';
  const horizon = hero ? 300 : 244;
  return (
    <svg className={className} viewBox="0 0 800 600" preserveAspectRatio={hero ? 'xMidYMax slice' : 'xMidYMid slice'} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.sky[0]} /><stop offset=".62" stopColor={m.sky[1]} /><stop offset="1" stopColor={m.sky[2]} />
        </linearGradient>
        <linearGradient id={`sea${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.sea[0]} /><stop offset="1" stopColor={m.sea[1]} />
        </linearGradient>
        <linearGradient id={`sand${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.sand[0]} /><stop offset="1" stopColor={m.sand[1]} />
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor={m.sun} stopOpacity="1" /><stop offset=".22" stopColor={m.sun} stopOpacity=".85" /><stop offset="1" stopColor={m.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height={horizon + 2} fill={`url(#sky${id})`} />
      <circle cx="600" cy={horizon - 70} r="190" fill={`url(#sun${id})`} />
      <g fill="#fff" opacity=".55">
        <ellipse cx="170" cy="86" rx="92" ry="11" /><ellipse cx="240" cy="104" rx="60" ry="8" />
        <ellipse cx="620" cy="60" rx="70" ry="8" />
      </g>
      <Karst d={K2} x={-20} y={horizon} s={1.05} fill={m.far} />
      <Karst d={K1} x={120} y={horizon} s={0.8} fill={m.far} />
      <Karst d={K2} x={330} y={horizon} s={0.62} fill={m.far} />
      <Karst d={K1} x={640} y={horizon} s={1.2} fill={m.far} />
      <rect y={horizon} width="800" height={600 - horizon} fill={`url(#sea${id})`} />
      <g fill="#fff" opacity=".28">
        {[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={600 - i * 7} cy={horizon + 12 + i * 22} rx={46 + i * 15} ry="2.6" />)}
      </g>
      <g fill="#fff" opacity=".14">
        <ellipse cx="180" cy={horizon + 52} rx="110" ry="2" /><ellipse cx="330" cy={horizon + 96} rx="150" ry="2.4" />
      </g>
      <Karst d={K1} x={-50} y={horizon + 40} s={1.2} fill={m.near} cap={m.cap} />
      {hero && <Karst d={K2} x={455} y={horizon + 24} s={0.7} fill={m.near} cap={m.cap} />}
      {hero && <Boat x={420} y={horizon + 72} s={0.95} />}
      <path d={hero ? 'M0 446 C170 404 340 412 520 436 C640 452 730 434 800 414 L800 600 L0 600 Z' : 'M0 372 C170 340 330 348 500 364 C630 376 720 358 800 344 L800 600 L0 600 Z'} fill={`url(#sand${id})`} />
      {hero && <Palm x={694} y={296} s={0.74} />}
      {bike && (
        <g transform={hero ? 'translate(318 284) scale(1.02)' : 'translate(170 146) scale(1.4)'}>
          <ellipse cx="164" cy="182" rx="122" ry="7" fill="rgba(40,30,20,.22)" />
          <BikeSide color={bike.color} />
        </g>
      )}
    </svg>
  );
}
