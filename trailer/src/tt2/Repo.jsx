// Ролик «Го в R.E.P.O.?», 12 с, самый быстрый. Пати зовёт в игру, а денег нет: человек сам выбирает игру в виджете,
// записывает карманные через Ctrl+Alt+G, «2 недели спустя» — бабушка, награда открыта, «Купил!», а друзья уже
// сыграли три катки. Всё на рабочем столе, камера наезжает на действие, музыка — CC0-чиптюн.
import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, p, rub } from '../lib.jsx';
import { Brand, Camera, Chat, DeskCursor, DeskWidget, Desktop, Keys, Later, Meme, SPOT, Sounds, Win, WIDGET, camAt, pressAt, sent, typed, wpt } from './desk.jsx';

export const REPO_DUR = 720;
const G = GAMES.repo;
const DRAFTS = [{ from: 40, text: 'ща', send: 54 }, { from: 560, text: 'купил, я в лобби', send: 594 }];
const MSGS = [
  { at: -1, name: 'Тёма', text: 'го в R.E.P.O. сегодня?? 380₽' },
  { at: 16, name: 'Лёха', text: 'я уже купил' },
  { at: 28, name: 'Дэн', text: 'и я' },
  ...sent(DRAFTS),
  { at: 612, name: 'Тёма', text: 'мы уже 3 катки сыграли 💀' },
  { at: 640, name: 'Лёха', text: 'в следующий раз копи заранее 😂' },
];
const PICK_CLICK = 100, ROW_CLICK = 150, CHOSEN = 156;
const Q1 = { keys: 174, open: 180, type: 186, text: '200 карманные', enter: 220, amount: 200 };
const Q2 = { keys: 320, open: 326, type: 330, text: '180 @бабушка', enter: 362, amount: 180 };
const U0 = 410, BUY = 516, BACK = 548;
const POP = { x: WIDGET.x, y: WIDGET.y + 226, w: 412, h: 170 };

function unlockAt(f) {
  const lean = f < U0 + 42 ? 7 * p(f, U0 + 24, 18, x => x * x * (3 - 2 * x)) : 7 * (1 - p(f, U0 + 42, 6, x => x));
  return { show: p(f, U0, 12) * (1 - p(f, U0 + 90, 14, inQuart)), jc: { lean, gap: 150 * p(f, U0 + 48, 50), scale: 0.6 + 0.4 * p(f, U0, 24) }, glow: p(f, U0 + 48, 20) * .8, text: p(f, U0 + 70, 20) };
}

export function Repo() {
  const f = useCurrentFrame();
  const quick = [Q1, Q2].find(q => f >= q.open && f < q.enter + 4);
  const earned = [Q1, Q2].reduce((a, q) => a + q.amount * p(f, q.enter + 4, 40), 0);
  const w = {
    game: f >= CHOSEN ? G : null, earned, target: G.price, week: earned, weekGoal: 0, unlocked: f >= U0,
    buyPress: pressAt(f, BUY),
    quick: quick ? { show: true, text: typed(f, quick.type, quick.text), caret: Math.floor(f / 15) % 2 === 0 } : null,
    banner: f >= BUY + 6 ? { y: p(f, BUY + 6, 20), kind: 'На полку', text: G.name } : null,
    unlock: unlockAt(f),
  };
  const shake = f >= U0 + 42 && f < U0 + 60 ? 1 - p(f, U0 + 42, 18, x => x) : 0;
  const cam = camAt(f, [
    { f: 0, x: 330, y: 470, s: 2.0 },
    { f: 66, x: 1356, y: WIDGET.y + 110, s: 2.3, d: 20 },
    { f: 98, x: 1356, y: WIDGET.y + 230, s: 2.1, d: 16 },
    { f: 160, x: 1356, y: WIDGET.y + 120, s: 2.45, d: 18 },
    { f: BACK, x: 330, y: 470, s: 2.0, d: 22 },
  ], shake);
  const popK = p(f, PICK_CLICK + 4, 12) * (1 - p(f, CHOSEN - 2, 8, inQuart));
  return (
    <AbsoluteFill style={{ background: '#07080b' }}>
      <Camera cam={cam}>
        <Desktop>
          <Chat f={f} msgs={MSGS} drafts={DRAFTS} />
          <DeskWidget f={f} w={w} col={f >= CHOSEN ? G.col : { g1: '#4a6beb', g2: '#ed99db', t1: '#385cf2', t2: '#8f70f2', t3: '#f294d1' }} />
          {popK > 0 && (
            <Win x={POP.x} y={POP.y} w={POP.w} h={POP.h} title="Выбрать игру" k={popK} z={4}>
              <div style={{ padding: 12 }}>
                <div style={{ height: 34, borderRadius: 17, background: 'rgba(255,255,255,.06)', border: `1px solid ${G.col.t2}`, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 15 }}>
                  {typed(f, 110, 'repo', 3) || <span style={{ color: C.dim }}>Найти игру в Steam</span>}
                </div>
                {f >= 126 && (
                  <div style={{ marginTop: 10, height: 64, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px', opacity: p(f, 126, 10),
                    background: f >= ROW_CLICK ? `${G.col.t2}44` : 'rgba(255,255,255,.04)' }}>
                    <Img src={staticFile(`img/${G.img}`)} style={{ width: 100, height: 47, borderRadius: 8, objectFit: 'cover' }} />
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{G.name}</span><span style={{ fontSize: 15, color: C.muted }}>{rub(G.price)}</span>
                  </div>
                )}
              </div>
            </Win>
          )}
          <DeskCursor f={f} show={f >= 70 && f < 540 ? 1 : 0}
            path={[[0, 1240, WIDGET.y + 380], [PICK_CLICK - 4, ...wpt(SPOT.cover)], [ROW_CLICK - 4, POP.x + 200, POP.y + 34 + 12 + 34 + 10 + 32], [BUY - 4, ...wpt(SPOT.buy)]]}
            clicks={[PICK_CLICK, ROW_CLICK, BUY]} />
        </Desktop>
      </Camera>

      <Meme f={f} from={-1} to={96} text="когда пати зовёт в R.E.P.O., а у тебя 0 ₽" />
      <Meme f={f} from={176} to={262} text="записываю карманные" size={60} />
      <Meme f={f} from={U0 + 44} to={BUY} text="НАКОПИЛ 🔥" size={90} />
      <Keys f={f} from={Q1.keys} />
      <Keys f={f} from={Q2.keys} />
      <Later f={f} from={266} text={'2 недели\nспустя…'} />
      <Brand f={f} from={662} />

      <Audio src={staticFile('music/level2.mp3')} volume={t => interpolate(t, [0, 10, REPO_DUR - 24, REPO_DUR], [0, .32, .32, 0], { extrapolateRight: 'clamp' })} />
      <Sounds list={[
        ['tick', 16, .7], ['tick', 28, .7], ['tick', 54], ['open', 70, .7],
        ['tick', PICK_CLICK], ['open', PICK_CLICK + 4], ['confirm', ROW_CLICK], ['coin', CHOSEN + 2, .6],
        ['tick', Q1.open], ['confirm', Q1.enter], ['coin', Q1.enter + 12],
        ['open', 268],
        ['tick', Q2.open], ['confirm', Q2.enter], ['coin', Q2.enter + 12],
        ['unlock', U0 + 24], ['confirm', BUY], ['open', BUY + 10],
        ['tick', DRAFTS[1].send], ['remove', 612], ['tick', 640, .8],
      ]} />
    </AbsoluteFill>
  );
}
