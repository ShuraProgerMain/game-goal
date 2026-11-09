// Виджет Game Goal, повторённый по widget.html и common.css: те же размеры (412×208), шрифт, цвета и элементы.
// Всё, что в программе двигают переходы CSS, здесь задаётся кадром — так ролик рендерится одинаково каждый раз.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, FONT, nf, tile, rub } from './lib.jsx';

const Star = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#fff" d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1L3.2 9.3l6.1-.9z" /></svg>
);
const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dbdee6" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
const Plus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/**
 * w: { earned, target, week, weekGoal, unlocked, buyPress (0..1), quick: { show, text, caret }, banner: { y (0..1), kind, text },
 *      unlock: { show, jc: { lean, gap, scale }, glow, text } }
 */
export function Widget({ f, w, col, scale = 1 }) {
  const pct = Math.min(1, w.earned / w.target);
  const left = Math.max(0, w.target - w.earned);
  const share = Math.round(1100 / Math.max(1, w.earned) * 100);
  return (
    <div style={{ width: 412 * scale, height: 208 * scale, position: 'relative' }}>
      <div style={{ width: 412, height: 208, transform: `scale(${scale})`, transformOrigin: '0 0', fontFamily: FONT, color: C.text, position: 'absolute' }}>
        {/* Карточка с переливающимся контуром */}
        <div style={{ position: 'relative', width: '100%', height: '100%', padding: 2, borderRadius: 26, overflow: 'hidden', isolation: 'isolate', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', zIndex: -1, left: '50%', top: '50%', width: 900, height: 900, margin: '-450px 0 0 -450px',
            background: `conic-gradient(${col.g1}, ${col.g2}, ${col.g1}, ${col.g2}, ${col.g1})`, transform: `rotate(${f * 0.6}deg)` }} />
          <div style={{ position: 'relative', height: '100%', borderRadius: 24, background: C.glass, overflow: 'hidden', padding: '14px 16px', boxSizing: 'border-box',
            display: 'grid', gridTemplateRows: 'auto auto auto 1fr', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '124px minmax(0, 1fr)', gap: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 124, height: 62, borderRadius: 13, overflow: 'hidden', background: tile(col) }}>
                <Img src={staticFile('img/hades-header.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', right: 5, bottom: 5, width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center',
                  background: w.unlocked ? tile(col) : 'rgba(14, 15, 20, .85)' }}>{w.unlocked ? <Star size={12} /> : <Lock />}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim, height: 24, display: 'flex', alignItems: 'center' }}>Награда</div>
                <div style={{ marginTop: 2, fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>Hades II</div>
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ height: 22, padding: '0 9px', borderRadius: 11, background: 'rgba(255, 255, 255, .06)', border: `1px solid ${C.line}`, color: C.muted,
                    fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 6, boxSizing: 'border-box' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: col.t3 }} />Steam</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: C.muted }}>1 100 ₽</span>
                  {w.unlocked && (
                    <span style={{ height: 24, padding: '0 11px', borderRadius: 12, background: tile(col), color: '#fff', fontSize: 12, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', transform: `scale(${1 - (w.buyPress || 0) * .1})` }}>Купил!</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {rub(w.earned)} <small style={{ fontSize: 13, fontWeight: 500, color: C.muted, letterSpacing: 0 }}>из {rub(w.target)}</small>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{Math.floor(pct * 100)}%</div>
            </div>
            <div style={{ position: 'relative', marginTop: -2, height: 9, borderRadius: 99, background: 'rgba(255, 255, 255, .07)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 99, background: tile(col), transform: `translateX(${(pct - 1) * 100}%)` }}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, borderRadius: 99, background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,.55), transparent 70%)' }} />
              </div>
            </div>

            {w.quick?.show ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 34px', gap: 6, alignItems: 'center', alignSelf: 'end' }}>
                <div style={{ height: 34, borderRadius: 17, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, background: 'rgba(255, 255, 255, .06)',
                  border: `1px solid ${col.t2}`, boxSizing: 'border-box' }}>
                  {w.quick.text}<span style={{ width: 1.5, height: 15, marginLeft: 1, background: w.quick.caret ? C.text : 'transparent' }} />
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: tile(col), display: 'grid', placeItems: 'center' }}><Check /></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 34px', gap: 8, alignItems: 'end' }}>
                <Stat label={`Неделя · из ${nf.format(w.weekGoal)}`}>
                  <svg width="16" height="16" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)', flex: 'none' }}>
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3.4" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke={w.week >= w.weekGoal ? C.plus : col.t3} strokeWidth="3.4" strokeLinecap="round"
                      pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(1, w.week / w.weekGoal) * 100} />
                  </svg>{rub(w.week)}
                </Stat>
                <Stat label="Игра съест">{share}%</Stat>
                <Stat label="Останется" color={C.plus}>{rub(Math.max(0, w.earned - 1100))}</Stat>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: tile(col), display: 'grid', placeItems: 'center' }}><Plus /></div>
              </div>
            )}

            {/* Баннер достижения выезжает сверху внутри карточки */}
            {w.banner && w.banner.y > 0 && (
              <div style={{ position: 'absolute', left: 12, right: 12, top: 10, zIndex: 6, height: 44, padding: '0 14px 0 8px', borderRadius: 22,
                background: 'rgba(22, 23, 32, .97)', boxShadow: '0 8px 20px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10,
                opacity: w.banner.y, transform: `translateY(${(w.banner.y - 1) * 130}%)` }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: tile(col), display: 'grid', placeItems: 'center' }}><Star /></div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: C.dim }}>{w.banner.kind}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.banner.text}</div>
                </div>
              </div>
            )}

            {/* Награда открыта: Joy-Con внутри карточки */}
            {w.unlock?.show > 0 && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 5, borderRadius: 24, background: 'rgba(15, 16, 22, .97)', opacity: w.unlock.show, display: 'grid', placeItems: 'center' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: 420, height: 420, margin: '-210px 0 0 -210px', borderRadius: '50%', opacity: w.unlock.glow,
                  background: `radial-gradient(circle, ${col.t2}88, ${col.t3}26 40%, transparent 66%)` }} />
                {[['l', C.blue, '14px 4px 4px 14px', '100% 100%', -1], ['r', C.red, '4px 14px 14px 4px', '0 100%', 1]].map(([k, bg, br, origin, s]) => (
                  <div key={k} style={{ position: 'absolute', top: 18, bottom: 18, width: 22, left: '50%', marginLeft: s < 0 ? -23 : 1, background: bg, borderRadius: br, transformOrigin: origin,
                    transform: `translateX(${s * w.unlock.jc.gap}px) rotate(${s * w.unlock.jc.lean}deg) scaleY(${w.unlock.jc.scale})` }} />
                ))}
                <div style={{ position: 'relative', textAlign: 'center', opacity: w.unlock.text }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: C.muted }}>Награда открыта</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Hades II</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children, color }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: C.dim, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, color: color || C.text, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
    </div>
  );
}
