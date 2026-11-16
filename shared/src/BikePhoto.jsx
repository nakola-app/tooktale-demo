import { ANGLE_LABEL, fmtTime, tr } from './core.js';

// รูปตัวอย่างแทนการถ่ายจริง (feature-map ข้อ 6) วาดตามสีของรถแต่ละคัน
const TYRE = '#23272b';
const METAL = '#9aa3a8';

export function BikeSide({ color }) {
  return (
    <g>
      <path d="M204 152 A34 34 0 0 1 266 138" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <circle cx="92" cy="150" r="29" fill={TYRE} />
      <circle cx="92" cy="150" r="13" fill={METAL} />
      <circle cx="236" cy="150" r="29" fill={TYRE} />
      <circle cx="236" cy="150" r="13" fill={METAL} />
      <path d="M244 96 L236 150" stroke="#3d4347" strokeWidth="8" strokeLinecap="round" />
      <path d="M70 136 L140 136 L140 150 L84 150 Z" fill="#3d4347" />
      <path d="M62 120 Q64 96 96 92 L170 92 Q178 93 174 103 L162 124 L204 124 Q214 124 216 116 L228 62 L250 60 L236 128 Q232 148 208 148 L132 148 Q120 128 96 128 Q78 128 70 136 Z" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <path d="M228 60 L252 58 Q262 60 260 72 L246 122 Q242 132 232 130 Z" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <rect x="82" y="76" width="92" height="17" rx="8" fill="#2b2f33" />
      <path d="M228 46 L252 54" stroke="#2b2f33" strokeWidth="7" strokeLinecap="round" />
      <path d="M240 50 L238 62" stroke="#2b2f33" strokeWidth="7" />
      <path d="M230 46 L222 28" stroke="#2b2f33" strokeWidth="3" />
      <ellipse cx="220" cy="24" rx="8" ry="6" fill="#2b2f33" />
      <ellipse cx="257" cy="76" rx="6" ry="9" fill="#fff6cf" stroke="rgba(0,0,0,.25)" />
      <rect x="58" y="102" width="9" height="13" rx="3" fill="#d4372b" />
      <rect x="168" y="124" width="36" height="5" rx="2.5" fill="rgba(0,0,0,.2)" />
    </g>
  );
}

function Front({ color }) {
  return (
    <g>
      <rect x="146" y="118" width="28" height="62" rx="12" fill={TYRE} />
      <path d="M120 62 Q160 44 200 62 L190 132 Q160 148 130 132 Z" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <path d="M138 128 Q160 136 182 128 L176 148 Q160 154 144 148 Z" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <ellipse cx="160" cy="84" rx="20" ry="13" fill="#fff6cf" stroke="rgba(0,0,0,.25)" />
      <path d="M102 54 L218 54" stroke="#2b2f33" strokeWidth="8" strokeLinecap="round" />
      <path d="M112 52 L100 28" stroke="#2b2f33" strokeWidth="3" />
      <path d="M208 52 L220 28" stroke="#2b2f33" strokeWidth="3" />
      <ellipse cx="98" cy="24" rx="11" ry="8" fill="#2b2f33" />
      <ellipse cx="222" cy="24" rx="11" ry="8" fill="#2b2f33" />
      <rect x="130" y="108" width="12" height="6" rx="3" fill="#f2a93b" />
      <rect x="178" y="108" width="12" height="6" rx="3" fill="#f2a93b" />
    </g>
  );
}

function Rear({ color }) {
  return (
    <g>
      <rect x="144" y="120" width="32" height="60" rx="12" fill={TYRE} />
      <path d="M116 80 Q160 60 204 80 L196 132 Q160 150 124 132 Z" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <rect x="122" y="60" width="76" height="20" rx="9" fill="#2b2f33" />
      <path d="M128 100 Q160 112 192 100 L190 112 Q160 124 130 112 Z" fill="#d4372b" />
      <rect x="140" y="124" width="40" height="18" rx="2" fill="#f7f4ea" stroke="rgba(0,0,0,.3)" />
      <path d="M108 48 L212 48" stroke="#2b2f33" strokeWidth="6" strokeLinecap="round" />
      <path d="M116 46 L104 26" stroke="#2b2f33" strokeWidth="3" />
      <path d="M204 46 L216 26" stroke="#2b2f33" strokeWidth="3" />
      <ellipse cx="102" cy="22" rx="10" ry="7" fill="#2b2f33" />
      <ellipse cx="218" cy="22" rx="10" ry="7" fill="#2b2f33" />
    </g>
  );
}

// ตำแหน่งรอยในพิกัดรูปหลังหมุนแล้ว
const MARK_AT = {
  front: [146, 116], left: [150, 116], right: [152, 116], rear: [176, 126],
};

function Scratch({ x, y, heavy, contrast }) {
  const stroke = contrast;
  return (
    <g stroke={stroke} strokeWidth={heavy ? 2.4 : 1.5} fill="none" strokeLinecap="round" opacity={heavy ? 1 : 0.7}>
      <path d={`M${x - 16} ${y - 7} l10 5 l7 -3 l9 7 l10 2`} />
      <path d={`M${x - 12} ${y + 3} l8 3 l6 -2 l8 5`} />
      {heavy && <path d={`M${x - 18} ${y + 10} l14 2 l9 -3 l11 5`} />}
    </g>
  );
}

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

export function BikePhoto({ vehicle, angle = 'right', damage = null, takenAt, lang = 'th', highlight = false, caption = true, bg = 'studio' }) {
  const color = vehicle?.color || '#2b2f33';
  const [mx, my] = MARK_AT[angle];
  const contrast = luminance(color) > 0.55 ? '#5c4a3a' : '#f0ece2';
  const wall = bg === 'hero' ? 'var(--hero-wall, #dfeafb)' : 'var(--photo-wall, #e6ecf5)';
  const floor = bg === 'hero' ? 'var(--hero-floor, #eef3fc)' : 'var(--photo-floor, #cdd7e6)';
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label={`${vehicle?.name || 'รถ'} ${tr(ANGLE_LABEL[angle], lang)}`} style={{ width: '100%', display: 'block' }}>
      <rect width="320" height="220" style={{ fill: wall }} />
      <rect y="166" width="320" height="54" style={{ fill: floor }} />
      <ellipse cx="160" cy="182" rx="118" ry="7" fill="rgba(0,0,0,.14)" />
      {angle === 'front' && <Front color={color} />}
      {angle === 'rear' && <Rear color={color} />}
      {angle === 'right' && <g transform="translate(-4 2)"><BikeSide color={color} /></g>}
      {angle === 'left' && <g transform="translate(324 2) scale(-1 1)"><BikeSide color={color} /></g>}
      {damage && <Scratch x={mx} y={my} heavy={damage === 'new'} contrast={contrast} />}
      {damage === 'new' && highlight && (
        <circle cx={mx - 2} cy={my + 2} r="32" fill="none" stroke="#e2552f" strokeWidth="3.5" strokeDasharray="7 5" />
      )}
      {caption && (
        <g>
          <rect x="8" y="194" rx="6" width={takenAt ? 132 : 66} height="20" fill="rgba(15,30,28,.72)" />
          <text x="16" y="208" fill="#fff" fontSize="11.5" fontFamily="var(--font-body)">
            {tr(ANGLE_LABEL[angle], lang)}{takenAt ? ` · ${fmtTime(takenAt, lang)}` : ''}
          </text>
        </g>
      )}
    </svg>
  );
}
