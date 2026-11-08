// There and Back — a message from a phone to a data centre and home again, as one isometric diorama.
import { Iso, tri, PAL, pin, cutLine, hatch, haloText, clamp, lerp, seg, ss, eo, eio, back, TAU, FONT, mix, hex } from './engine.js';
import { DUR as D, T, W, OUT, BACK, CAM, LABELS, NOTES_OUT, NOTES_BACK, b } from './timeline.js';
export const DUR = D;

// ---------- palette (one hue per meaning) ----------
const INK = '#231A2C', GROUND = '#F3F0E8', PAPER = '#FBF8F1';
const C = {
  amber: '#F2A33A', mint: '#3FC8A0', blue: '#2F6BFF', graphite: '#4A4E5C', coral: '#E8735A',
  turf: '#9DB98A', soil: '#9A7656', rock: '#7C8291', tree: '#6E9A63', stone: '#D9D3C6', slate: '#8B90A0',
};
const TR = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, tri(v)]));
PAL.ink = INK; PAL.paper = PAPER;            // pins and halos use our ink and paper

// ---------- camera: Catmull-Rom through the keys, zoom in log space ----------
function camAt(t) {
  const K = CAM; let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(K.length - 1, i + 2)];
  const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
  const cr = (a, b_, c, d, s) => { // non-uniform-safe: tangents scaled by segment duration
    const dt = k2[0] - k1[0];
    const m1 = (c - a) / Math.max(1e-6, k2[0] - k0[0]) * dt * (k0 === k1 ? 0 : 1);
    const m2 = (d - b_) / Math.max(1e-6, k3[0] - k1[0]) * dt * (k3 === k2 ? 0 : 1);
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * b_ + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * c + (s3 - s2) * m2;
  };
  const f = j => cr(k0[j], k1[j], k2[j], k3[j], u);
  const L = j => Math.log(j);
  const lk = cr(L(k0[4]), L(k1[4]), L(k2[4]), L(k3[4]), u);
  return { x: f(1), y: f(2), z: f(3), k: Math.exp(lk) };
}

// ---------- the packet's route ----------
const polyAt = (pts, u) => {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const L = d[d.length - 1] * clamp(u); let i = 1; while (i < pts.length - 1 && d[i] < L) i++;
  const f = (L - d[i - 1]) / Math.max(1e-9, d[i] - d[i - 1]);
  return [0, 1, 2].map(j => lerp(pts[i - 1][j], pts[i][j], f));
};
const AIR_C = [(W.screen[0] + W.antenna[0]) / 2, (W.screen[1] + W.antenna[1]) / 2, Math.max(W.screen[2], W.antenna[2]) + 1.7];
const LEG = {
  air: u => { const a = W.screen, c = AIR_C, e = W.antenna; return [0, 1, 2].map(j => (1 - u) * (1 - u) * a[j] + 2 * (1 - u) * u * c[j] + u * u * e[j]); },
  mast: u => polyAt([W.antenna, [5.75, 5.85, 0.06], W.foot], u),
  riserA: u => polyAt([W.foot, W.cable0], u),
  fibre: u => polyAt([W.cable0, W.cable1], u),
  riserB: u => polyAt([W.cable1, W.dcFoot, W.dcWall], u),
};
const EASE = { air: eio, mast: u => u * u * (1.6 - .6 * u), riserA: ss, fibre: eio, riserB: ss };
const UNDER = { riserA: 1, fibre: 1, riserB: 1 };
function packet(t) {          // → {p, col, kind, vis}
  for (const [a, e, kind] of OUT) if (t >= a && t < e) return { p: LEG[kind](EASE[kind](seg(t, a, e))), col: C.amber, kind, vis: 1 };
  for (const [a, e, kind] of BACK) if (t >= a && t < e) return { p: LEG[kind](1 - ss(seg(t, a, e))), col: C.mint, kind, vis: 1 };
  if (t < T.launch) return { p: W.screen, col: C.amber, kind: 'air', vis: t < T.tap ? 0 : back(seg(t, T.tap, T.tap + .2), 2.2) };
  if (t >= T.dc && t < T.reply) return { p: W.dcWall, col: C.amber, kind: 'riserB', vis: 0 };
  if (t >= T.home) return { p: W.screen, col: C.mint, kind: 'air', vis: 1 - ss(seg(t, T.home, T.home + .25)) };
  return { p: W.screen, col: C.amber, kind: 'air', vis: 0 };
}
// sampled route for the dashed line drawn just ahead of the packet
const ROUTE = [];
for (const [a, e, kind] of OUT) for (let i = 0; i <= 24; i++) { const u = i / 24; ROUTE.push({ p: LEG[kind](EASE[kind](u)), kind, tt: a + (e - a) * u }); }

// ---------- scene ----------
const BOARD = { x0: 0, x1: 15, y0: 0, y1: 7, notchX0: 5, notchX1: 12.2, notchY: 6.2 };
const STRATA = [[-0.15, 0, 'turf'], [-0.95, -0.15, 'soil'], [-1.4, -0.95, 'rock']];

function board(iso, t) {
  const { notchX0: a, notchX1: e, notchY: ny } = BOARD;
  for (const [z0, z1, m] of STRATA) {
    iso.box(0, 0, z0, a, 7, z1 - z0, TR[m], { layer: 0, cull: false });
    iso.box(a, 0, z0, e - a, ny, z1 - z0, TR[m], { layer: 0, cull: false });
    iso.box(e, 0, z0, 15 - e, 7, z1 - z0, TR[m], { layer: 0, cull: false });
  }
  // the front skin over the fibre: slides out along +y and fades (cutaway)
  const p = seg(t, T.skinA, T.skinB);
  if (p < 1) {
    const dy = 1.4 * eo(p), al = 1 - seg(p, .1, .75);
    iso.alpha = al;
    for (const [z0, z1, m] of STRATA) iso.box(a, ny + dy, z0, e - a, 7 - ny, z1 - z0, TR[m], { layer: 2, cull: false });
    iso.alpha = 1;
  }
  // hatched section rim where the cut meets the left block (x = a face, revealed)
  const hp = ss(seg(p, .6, 1));
  if (hp > 0) iso.add(-1e3, () => { const g = iso.g; g.save(); g.globalAlpha = hp; for (const [z0, z1, m] of STRATA) hatch(g, [iso.P(a, ny, z1), iso.P(a, 7, z1), iso.P(a, 7, z0), iso.P(a, ny, z0)], { sp: Math.max(5, iso.cam.k * .05), color: 'rgba(35,26,44,.45)', fill: TR[m][0], edge: 1.2 }); g.restore(); }, 2);
}

function cable(iso, t) {
  const [x0, y, z] = W.cable0, x1 = W.cable1[0];
  iso.cyl(x0 - .4, y, z, .11, x1 - x0 + .8, TR.graphite, { axis: 'x', layer: 1, n: 14, cull: false });
  // the glass core: a blue line along the cable's top, brighter where the packet is
  iso.line3([[x0 - .4, y, z + .02], [x1 + .4, y, z + .02]], C.blue, .05, { world: true, layer: 1, depth: 900 });
  // risers into the tower foot and into the data centre
  iso.cyl(W.foot[0], y, z, .07, .58, TR.graphite, { layer: 1, n: 10, cull: false });
  iso.cyl(W.dcFoot[0], y, z, .07, .58, TR.graphite, { layer: 1, n: 10, cull: false });
  iso.box(W.foot[0] - .06, 5.9, -.02, .12, .48, .06, TR.graphite, { layer: 3 });
  iso.box(W.dcFoot[0] - .06, 6.0, -.02, .12, .36, .06, TR.graphite, { layer: 3 });
}

function plate(iso, x0, y0, x1, y1) {
  iso.flat([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], .005, PAPER, { layer: 2.5, depth: 0 });
  iso.line3([[x0, y0, .01], [x1, y0, .01], [x1, y1, .01], [x0, y1, .01], [x0, y0, .01]], INK, 1.6, { dash: [6, 5], layer: 2.5, depth: 1 });
}

function context(iso) {   // a little town around the phone: low, quiet, stone and trees
  const houses = [[0.3, 2.3, 1.0, .9, .55], [0.4, 0.5, 1.1, .9, .65], [8.4, 0.4, 1.1, .9, .6], [9.9, 1.9, .9, .8, .5]];
  for (const [x, y, w, d, h] of houses) { iso.box(x, y, 0, w, d, h, TR.stone, { layer: 3 }); iso.roof(x, y, h, w, d, .38, TR.slate, { layer: 3, ridge: 'x', over: .05 }); }
  const trees = [[2.0, 1.2], [2.0, 4.0], [3.4, 2.6], [4.0, 4.3], [6.6, 3.6], [7.4, 1.6], [9.4, 4.4], [8.0, 4.9], [14.2, 1.2], [14.4, 6.5], [11.0, 1.2], [1.9, 2.6]];
  for (const [x, y] of trees) { iso.cyl(x, y, 0, .05, .2, TR.soil, { layer: 3, n: 6 }); iso.cone(x, y, .18, .32, .75, TR.tree, { layer: 3, n: 7 }); }
}

function phone(iso, t) {
  const x = 1.0, y = 5.2, w = .18, d = .95, h = 1.7;
  plate(iso, .45, 4.85, 1.75, 6.5);
  const tap = seg(t, T.tap, T.tap + .35), home = seg(t, T.home, T.home + .3);
  const base = '#2B3247';
  let scr = hex(mix(base, '#7FA2FF', .55 * (1 - tap) * (t >= T.tap ? 1 : 0) + .18 * (t >= T.tap && t < T.home ? 1 : 0)));
  if (t >= T.home) scr = hex(mix(scr, C.mint, .75 * ss(home)));
  iso.box(x, y, 0, w, d, h, TR.coral, {
    layer: 3, decal: I => {
      const X = x + w + .001, f = (yy, zz) => I.P(X, yy, zz);
      I.poly([f(y + .07, .12), f(y + d - .07, .12), f(y + d - .07, h - .14), f(y + .07, h - .14)], scr);
      I.poly([f(y + .38, h - .08), f(y + d - .38, h - .08), f(y + d - .38, h - .1), f(y + .38, h - .1)], '#3A2A30');   // speaker slit
      if (t >= T.home) {               // the reply has arrived: a check mark
        const a = eo(seg(t, T.home + .05, T.home + .35)), g = I.g, P0 = f(y + .3, .9), P1 = f(y + .45, .72), P2 = f(y + .7, 1.1);
        g.save(); g.strokeStyle = PAPER; g.lineWidth = Math.max(3, I.cam.k * .055); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(...P0);
        if (a < .4) g.lineTo(lerp(P0[0], P1[0], a / .4), lerp(P0[1], P1[1], a / .4)); else { g.lineTo(...P1); const q = (a - .4) / .6; g.lineTo(lerp(P1[0], P2[0], q), lerp(P1[1], P2[1], q)); }
        g.stroke(); g.restore();
      }
    }
  });
}

function tower(iso) {
  const cx = 5.75, cy = 5.85;
  plate(iso, 5.3, 5.4, 6.2, 6.15);
  iso.box(cx - .3, cy - .3, 0, .6, .6, .1, TR.graphite, { layer: 3 });
  const brace = '#6C7182';
  const secs = [[.36, .1, 1.1], [.28, 1.1, 2.1], [.2, 2.1, 3.0]];
  for (const [s, z0, z1] of secs) iso.box(cx - s / 2, cy - s / 2, z0, s, s, z1 - z0, TR.graphite, {
    layer: 3, decal: I => {   // cross-bracing on the two visible faces (tone, not ink)
      const g = I.g; g.save(); g.strokeStyle = I.col(brace); g.lineWidth = Math.max(1, I.cam.k * .012);
      const X = cx + s / 2, Y = cy + s / 2, n = 2;
      for (let i = 0; i < n; i++) { const za = lerp(z0, z1, i / n), zb = lerp(z0, z1, (i + 1) / n);
        for (const [p, q] of [[I.P(cx - s / 2, Y, za), I.P(X, Y, zb)], [I.P(X, Y, za), I.P(cx - s / 2, Y, zb)], [I.P(X, cy - s / 2, za), I.P(X, Y, zb)], [I.P(X, Y, za), I.P(X, cy - s / 2, zb)]]) { g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); } }
      g.restore();
    }
  });
  iso.box(cx - .03, cy - .03, 3.0, .06, .06, .35, TR.graphite, { layer: 3 });
  const panel = tri('#C9CCD6');
  iso.box(cx - .09, cy + .1, 2.45, .18, .07, .5, panel, { layer: 3, bias: .3 });      // +y panel
  iso.box(cx + .1, cy - .09, 2.45, .07, .18, .5, panel, { layer: 3, bias: .3 });      // +x panel
  iso.box(cx - .17, cy - .17, 2.45, .07, .18, .5, panel, { layer: 3, bias: -.3 });    // back panel
}

function dataCentre(iso, t) {
  const x = 11.1, y = 3.0, w = 3.1, d = 3.0, h = 1.5;
  plate(iso, 10.8, 2.7, 14.5, 6.15);
  const rowsLit = t < T.dc ? 0 : Math.min(4, 1 + Math.floor((t - T.dc) / b(.25)));
  const idle = t >= T.reply ? .55 + .45 * Math.max(0, Math.sin((t - T.reply) * TAU * 4)) : 1;
  iso.box(x, y, 0, w, d, h, TR.graphite, {
    layer: 3, decal: I => {
      const g = I.g, Y = y + d + .001;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {      // rack LEDs on the +y face
        const px = x + .3 + c * .27, pz = .3 + r * .27, [sx, sy] = I.P(px, Y, pz), R = Math.max(1.5, I.cam.k * .045);
        const lit = r < rowsLit ? (r === rowsLit - 1 && t < T.reply ? 1 : idle) : 0;
        g.beginPath(); g.ellipse(sx, sy, R, R * 1.15, 0, 0, TAU); g.fillStyle = lit ? I.col(mix('#3D4458', '#8DB2FF', lit)) : I.col('#3D4458'); g.fill();
      }
      const X = x + w + .001;                                         // vents on the +x face
      g.strokeStyle = I.col('#2F323D'); g.lineWidth = Math.max(1, I.cam.k * .02);
      for (let i = 0; i < 6; i++) { const z = .3 + i * .18, p = I.P(X, y + .3, z), q = I.P(X, y + d - .3, z); g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); }
    }
  });
  // rooftop cooling: three units with fans
  for (let i = 0; i < 3; i++) {
    const ux = x + .3 + i * .95, uy = y + .55;
    iso.box(ux, uy, h, .75, 1.9, .28, tri('#8E93A3'), { layer: 3 });
    for (let j = 0; j < 2; j++) iso.cyl(ux + .375, uy + .5 + j * .9, h + .28, .26, .03, tri('#5A5F70'), { layer: 3, n: 14 });
  }
}

// ---------- screen-space overlays ----------
function bgLattice(iso) {
  const g = iso.g; g.fillStyle = GROUND; g.fillRect(0, 0, iso.W, iso.H);
  const z = -3, cs = [[0, 0], [iso.W, 0], [0, iso.H], [iso.W, iso.H]].map(([a, c]) => iso.unP(a, c, z));
  const xs = cs.map(p => p[0]), ys = cs.map(p => p[1]);
  g.fillStyle = 'rgba(35,26,44,.16)'; const r = Math.max(1.2, Math.min(2.4, iso.cam.k * .02));
  for (let X = Math.floor(Math.min(...xs)); X <= Math.max(...xs); X++) for (let Y = Math.floor(Math.min(...ys)); Y <= Math.max(...ys); Y++) {
    const [sx, sy] = iso.P(X, Y, z); if (sx < -5 || sx > iso.W + 5 || sy < -5 || sy > iso.H + 5) continue; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
  }
  // soft board shadow
  const s = [iso.P(0, 0, -2.6), iso.P(15, 0, -2.6), iso.P(15, 7, -2.6), iso.P(0, 7, -2.6)];
  g.save(); g.filter = `blur(${Math.round(iso.cam.k * .4)}px)`; g.beginPath(); s.forEach((p, i) => i ? g.lineTo(p[0], p[1] + iso.cam.k * .3) : g.moveTo(p[0], p[1] + iso.cam.k * .3)); g.closePath(); g.fillStyle = 'rgba(35,26,44,.16)'; g.fill(); g.restore();
}

function routeLine(iso, t) {   // drawn 0.25 s ahead of the packet on the way out; stays
  const lead = Math.min(t + .25, T.dc + .1); if (t < T.launch - .25) return;
  const pts = ROUTE.filter(r => r.tt <= lead);
  if (pts.length < 2) return;
  for (const kind of ['air', 'mast', 'riserA', 'fibre', 'riserB']) {
    const P = pts.filter(r => r.kind === kind).map(r => r.p); if (P.length < 2) continue;
    const under = UNDER[kind];
    if (kind === 'air') iso.line3(P, C.blue, 2.5, { dash: [8, 7], layer: 3, depth: 500 });
    else iso.line3(P, INK, 2, { dash: [5, 6], layer: under ? 1 : 3, depth: 950 });
  }
}

function glow(g, sx, sy, col, R, a = 1) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, R * 3.2);
  gr.addColorStop(0, col + 'CC'); gr.addColorStop(.35, col + '55'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, R * 3.2, 0, TAU); g.fill();
  g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(sx - R * .25, sy - R * .25, R * .45, 0, TAU); g.fillStyle = '#FFFBEF'; g.fill();
  g.restore();
}

function drawPacket(iso, t) {
  const P = packet(t); if (P.vis <= 0) return;
  const layer = UNDER[P.kind] && t < T.skinB ? 1 : 3;
  const R = Math.max(7, Math.min(16, iso.cam.k * .085));
  iso.add(1e4, () => {
    const g = iso.g;
    for (let i = 7; i >= 1; i--) {                 // trail: where it was a moment ago
      const q = packet(t - i * .018); if (q.vis <= 0 || q.col !== P.col) continue;
      const [x, y] = iso.P(...q.p); g.beginPath(); g.arc(x, y, R * (1 - i / 9), 0, TAU); g.fillStyle = P.col + Math.round(150 * (1 - i / 8)).toString(16).padStart(2, '0'); g.fill();
    }
    const [sx, sy] = iso.P(...P.p); glow(g, sx, sy, P.col, R * P.vis);
  }, layer);
}

function rings(iso, t) {   // radio rings at the antenna (out at 1.5 s, back at 5.5 s) and the tap ripple
  const g = iso.g;
  for (const [t0, col] of [[T.tower, C.blue], [5.5, C.blue]]) for (let i = 0; i < 3; i++) {
    const u = seg(t, t0 + i * .1, t0 + i * .1 + .55); if (u <= 0 || u >= 1) continue;
    const [sx, sy] = iso.P(...W.antenna), R = (.15 + 1.1 * eo(u)) * iso.cam.k;
    g.save(); g.globalAlpha = 1 - u; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.ellipse(sx, sy, R, R * .62, 0, 0, TAU); g.stroke(); g.restore();
  }
  for (const [t0, col] of [[T.tap, INK], [T.home, C.mint]]) {
    const u = seg(t, t0, t0 + .45); if (u <= 0 || u >= 1) continue;
    const [sx, sy] = iso.P(...W.screen), R = (.08 + .55 * eo(u)) * iso.cam.k;
    g.save(); g.globalAlpha = 1 - u; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.stroke(); g.restore();
  }
}

// labels: positions computed once per frame so the reading check sees exactly what is drawn
const LBL = { ts: 30, track: 3.6 };
const upOf = (iso, L) => L.up === 'auto' ? -(1.2 * iso.cam.k + 46) : L.up;
function labelGeo(iso, L) {
  const [ax, ay] = iso.P(...L.at), tx = ax + L.dir * (L.len + 12), ty = ay - upOf(iso, L) - 10;
  return { ax, ay, tx, ty };
}
const mctx = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas')).getContext('2d');
function measure(s, px, track) { mctx.font = `600 ${px}px ${FONT}`; mctx.letterSpacing = track + 'px'; return mctx.measureText(s).width; }

function labels(iso, t) {
  for (const L of LABELS) {
    const a = seg(t, L.t, L.t + .4); if (a <= 0) continue;
    pin(iso, ...L.at, { title: L.title, dir: L.dir, up: upOf(iso, L), len: L.len, a, ts: LBL.ts });
  }
}

const TITLE = 'A MESSAGE, THERE AND BACK';
const TITLE_OUT = 3.0;   // read for 3 s, then it leaves so the board can fill the frame
function title(g, t) {
  const f = 1 - ss(seg(t, TITLE_OUT, TITLE_OUT + .25)); if (f <= 0) return;
  g.save(); g.globalAlpha = f; haloText(g, TITLE, 64, 92 - 10 * (1 - f), { font: `600 30px ${FONT}`, track: 3.6, haloColor: GROUND }); g.restore();
}

const LEG_T = T.reply;
const LEGEND = { x: 56, y: 952, w: 520, h: 76 };
function legend(g, t) {
  const a = seg(t, LEG_T, LEG_T + .45); if (a <= 0) return;
  const { x, y, w, h } = LEGEND, bd = eo(seg(a, 0, .45)), tx = ss(seg(a, .4, 1));
  g.save();
  g.fillStyle = PAPER; g.globalAlpha = bd; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 10); g.setLineDash([(2 * (w + h)) * bd, 9999]); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.rect(x, y, w * tx, h); g.clip();
  const chip = (cx, cy, col) => { const t3 = tri(col), s = 11, P = (X, Y, Z) => [cx + (X - Y) * .866 * s, cy + ((X + Y) * .5 - Z) * s];
    const f = (pts, c) => { g.beginPath(); pts.forEach((p, i) => { const q = P(...p); i ? g.lineTo(...q) : g.moveTo(...q); }); g.closePath(); g.fillStyle = c; g.fill(); };
    f([[-.5, .5, -.5], [.5, .5, -.5], [.5, .5, .5], [-.5, .5, .5]], t3[1]); f([[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]], t3[2]); f([[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], t3[0]); };
  const by = y + h / 2 + 9;
  chip(x + 32, by - 9, C.amber); haloText(g, 'REQUEST', x + 54, by, { font: `600 26px ${FONT}`, track: 3, halo: false });
  chip(x + 222, by - 9, C.mint); haloText(g, 'REPLY', x + 244, by, { font: `600 26px ${FONT}`, track: 3, halo: false });
  haloText(g, 'NOT TO SCALE', x + w - 24, by - 2, { font: `500 18px ${FONT}`, track: 2.5, halo: false, align: 'right', color: '#6B6470' });
  g.restore();
}

function cut(iso, t) {
  const a = seg(t, T.cutA, T.cutB), fade = 1 - seg(t, T.skinA + .1, T.skinB);
  if (a <= 0 || fade <= 0) return;
  const { notchX0: x0, notchX1: x1, notchY: ny } = BOARD, g = iso.g;
  g.save(); g.globalAlpha = fade;
  cutLine(g, [iso.P(x0, 7, 0), iso.P(x0, ny, 0), iso.P(x1, ny, 0), iso.P(x1, 7, 0)], eo(a), { color: INK });
  g.restore();
}

// ---------- frame ----------
let ISO = null;
export function render(g, t) {
  const iso = ISO || (ISO = new Iso(g));
  iso.g = g; iso.cam = camAt(t);
  bgLattice(iso);
  board(iso, t); cable(iso, t); context(iso); phone(iso, t); tower(iso); dataCentre(iso, t);
  routeLine(iso, t); drawPacket(iso, t);
  iso.flush();
  cut(iso, t); rings(iso, t); labels(iso, t);
  title(g, t); legend(g, t);
}

// ---------- reading check: every text on screen, with its box ----------
export function texts(t) {
  const iso = new Iso(null); iso.cam = camAt(t); const out = [];
  if (t < TITLE_OUT) out.push({ id: 'title', text: TITLE, x0: 64, y0: 64, x1: 64 + measure(TITLE, 30, 3.6), y1: 100 });
  for (const L of LABELS) {
    if (seg(t, L.t, L.t + .4) < .45) continue;
    const { tx, ty } = labelGeo(iso, L), w = measure(L.title, LBL.ts, LBL.track);
    out.push({ id: L.id, text: L.title, x0: L.dir > 0 ? tx : tx - w, x1: L.dir > 0 ? tx + w : tx, y0: ty - 32, y1: ty + 6 });
  }
  if (seg(t, LEG_T, LEG_T + .45) >= .4) {
    const { x, y, w, h } = LEGEND;
    out.push({ id: 'req', text: 'REQUEST', x0: x + 20, y0: y, x1: x + 200, y1: y + h });
    out.push({ id: 'rep', text: 'REPLY', x0: x + 210, y0: y, x1: x + 340, y1: y + h });
    out.push({ id: 'nts', text: 'NOT TO SCALE', x0: x + 350, y0: y, x1: x + w, y1: y + h, pass: true });
  }
  return out;
}

// ---------- sound events for the mixer (all from timeline.js) ----------
export function events() {
  const E = [];
  E.push({ t: T.tap, type: 'tap' }, { t: T.launch, type: 'whoosh', d: .9, pan: -.3 }, { t: T.tower, type: 'chirp' });
  for (let i = 0; i < 5; i++) E.push({ t: 1.62 + i * .1, type: 'tick', pitch: 1.3 - i * .1 });
  E.push({ t: T.cutA, type: 'scribe', d: T.cutB - T.cutA }, { t: T.skinA, type: 'slide', d: T.skinB - T.skinA });
  E.push({ t: T.cable, type: 'zing' }, { t: T.cable, type: 'shimmer', d: T.cableEnd - T.cable });
  E.push({ t: 3.5, type: 'hum', until: 5.4 });
  for (let i = 0; i < 4; i++) E.push({ t: T.dc + i * b(.25), type: 'led', pitch: 1 + i * .12 });
  E.push({ t: T.reply, type: 'reply' }, { t: 4.62, type: 'whoosh', d: .55, pan: -.1 }, { t: 5.25, type: 'tick', pitch: 1.4 }, { t: 5.5, type: 'chirp' }, { t: 5.5, type: 'whoosh', d: .5, pan: -.4 });
  E.push({ t: T.home, type: 'ping' });
  for (const [t, m] of NOTES_OUT) E.push({ t, type: 'marimba', midi: m });
  for (const [t, m] of NOTES_BACK) E.push({ t, type: 'glock', midi: m });
  E.push({ t: T.launch, type: 'pulse', until: T.hush, div: 2 }, { t: T.reply, type: 'pulse', until: T.home, div: 4 });
  E.push({ t: b(4), type: 'wood', until: b(8) });
  E.push({ t: T.reply, type: 'bass', midi: 38, d: 1.0 }, { t: b(11), type: 'bass', midi: 45, d: .5 }, { t: T.home, type: 'chord', d: 1.0 });
  E.push({ t: T.tap, type: 'air', until: D }, { t: T.hush, type: 'hush', until: T.reply });
  return E.sort((p, q) => p.t - q.t);
}
