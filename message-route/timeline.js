// Single source of truth: tempo grid, story times, camera keys, sound cues.
// 120 bpm, beat = 0.5 s. The page exports EV (via film.events()), the mixer reads it from events.json.
export const DUR = 7.0, BPM = 120, BEAT = 60 / BPM;
export const b = n => n * BEAT;                       // beat → seconds

export const T = {
  tap: 0.15,                 // pickup: the only off-grid sound
  launch: b(1),              // 0.5  packet leaves the phone
  tower: b(3),               // 1.5  hits the antenna
  ground: 2.15,              // reaches the tower foot
  cutA: 1.85, cutB: 2.15,    // cut line draws
  skinA: 2.15, skinB: 2.5,   // front skin slides out
  cable: 2.4,                // enters the fibre core
  cableEnd: 3.85,
  dc: b(8),                  // 4.0  enters the data centre
  hush: b(8.5),              // 4.25 near-silence
  reply: b(9),               // 4.5  reply leaves (downbeat)
  home: b(12),               // 6.0  reply lands on the phone
};

// Packet route (world units). Out: phone → antenna (air arc) → down the mast → riser → fibre → riser → data centre.
export const W = {
  screen: [1.26, 5.675, 1.0],
  antenna: [5.75, 5.85, 3.0],
  foot: [5.75, 6.32, 0.03],
  cable0: [5.75, 6.32, -0.55],
  cable1: [11.6, 6.32, -0.55],
  dcFoot: [11.6, 6.32, 0.03],
  dcWall: [11.6, 6.0, 0.35],
};

// Out-trip legs [t0, t1, kind]; the reply runs the same legs backwards, faster.
export const OUT = [
  [T.launch, T.tower, 'air'],
  [T.tower, T.ground, 'mast'],
  [T.ground, T.cable, 'riserA'],
  [T.cable, T.cableEnd, 'fibre'],
  [T.cableEnd, T.dc, 'riserB'],
];
export const BACK = [
  [4.5, 4.62, 'riserB'],
  [4.62, 5.15, 'fibre'],
  [5.15, 5.25, 'riserA'],
  [5.25, 5.5, 'mast'],
  [5.5, T.home, 'air'],
];

// Camera keys: world centre (x, y, z) + zoom k (px per unit, interpolated in log space).
export const CAM = [
  [0.0, 1.15, 5.75, 0.85, 230],
  [0.5, 1.25, 5.8, 0.9, 262],
  [1.5, 4.0, 5.9, 1.5, 150],
  [2.5, 6.5, 6.2, 1.35, 125],
  [3.9, 9.5, 5.0, 1.15, 95],
  [4.5, 10.6, 4.9, 1.2, 106],
  [6.0, 7.4, 3.5, -0.2, 70],
  [7.0, 7.4, 3.5, -0.2, 68],
];

// Labels: when the packet reaches each stage the pin starts drawing (0.4 s), then stays to the end.
export const LABELS = [
  { id: 'phone', title: 'PHONE', t: 0.2, at: [1.0, 6.15, 1.05], dir: -1, up: 0, len: 56 },
  { id: 'tower', title: 'CELL TOWER', t: T.tower, at: [5.75, 5.85, 2.2], dir: 1, up: 52, len: 54 },
  { id: 'fibre', title: 'FIBRE-OPTIC CABLE', t: T.cable, at: [8.4, 6.32, -0.66], dir: -1, up: 'auto', len: 40 },
  { id: 'dc', title: 'DATA CENTRE', t: T.dc, at: [13.2, 3.4, 1.55], dir: 1, up: 70, len: 54 },
];

// Score: D major pentatonic, one marimba note per station on the way out, the same notes descending on the way home.
export const NOTES_OUT = [[T.tap, 50], [T.tower, 69], [T.cable, 74], [T.dc, 78]];          // D3 pickup, A4, D5, F#5
export const NOTES_BACK = [[T.reply, 78], [5.15, 74], [5.5, 69], [T.home, 62]];          // F#5, D5, A4, D4
