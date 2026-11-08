"""There and Back: score, foley and ambience, all synthesised, placed from events.json (exported from timeline.js).
Writes out/mix.wav (48 kHz stereo). Run with the library's Python: $LIB/.venv/bin/python mix.py"""
import json, os, sys
import numpy as np
import soundfile as sf

LIB = os.environ.get('LIB') or sys.exit('set LIB to the library folder')
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, click, whoosh, ding, add, limit  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = E['dur'], E['ev']
N = int(DUR * SR)
music, foley, amb = (np.zeros((N, 2)) for _ in range(3))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)


def attack(x, ms=3):
    n = int(ms * SR / 1000); x[:n] *= np.linspace(0, 1, n); return x


# ---------- instruments ----------
def marimba(m, v=1.0):
    f, d = hz(m), 1.1; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * env_exp(d, tau) for r, a, tau in [(1, 1, .38), (3.93, .32, .09), (9.2, .12, .03)])
    x += lp(noise(d), 3000) * env_exp(d, .004) * .15                       # mallet
    return attack(norm(x)) * v


def glock(m, v=1.0):
    f, d = hz(m), 1.8; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * env_exp(d, tau) for r, a, tau in [(1, 1, .7), (2.76, .35, .3), (5.4, .2, .12), (8.9, .08, .05)])
    return attack(norm(x), 1) * v


def blip(f, v=1.0):          # the clean electronic pulse
    d = .09; tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .022) + .25 * np.sin(2 * np.pi * 2 * f * tt) * env_exp(d, .01)
    return attack(x, 1.5) * v


def bass(m, d, v=1.0):       # sine with 2nd/3rd harmonics so it speaks on small speakers
    f = hz(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) + .45 * np.sin(2 * np.pi * 2 * f * tt) + .2 * np.sin(2 * np.pi * 3 * f * tt)
    e = np.minimum(1, tt / .01) * np.exp(-tt / (d * .6)); e[-int(.04 * SR):] *= np.linspace(1, 0, int(.04 * SR))
    return norm(x * e) * v


def woodblock(v=1.0):
    d = .08; tt = t_(d)
    x = np.sin(2 * np.pi * 1180 * tt) * env_exp(d, .018) + .5 * np.sin(2 * np.pi * 2650 * tt) * env_exp(d, .008) + bp(noise(d), 1500, 4000) * env_exp(d, .003) * .4
    return attack(norm(x), 1) * v


# ---------- foley ----------
def chirp(v=1.0):            # radio handshake at the antenna: rising FM blip pair
    d = .32; tt = t_(d); f = 1100 + 1900 * (tt / d) ** .6
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (.6 + .4 * np.sin(2 * np.pi * 38 * tt)) * np.sin(np.pi * tt / d) ** .5
    return norm(bp(x, 700, 5000)) * v


def scribe(d, v=1.0):        # the cut line: a pencil scratch
    tt = t_(d); x = bp(noise(d), 2500, 6500) * (.55 + .45 * np.abs(np.sin(2 * np.pi * 14 * tt))) * np.sin(np.pi * tt / d) ** .4
    return norm(x) * v


def slide(d, v=1.0):         # soil sliding away
    x = lp(brown(d + .15), 500) + lp(noise(d + .15), 1800) * .15
    tt = t_(d + .15); return norm(x * np.sin(np.pi * np.minimum(1, tt / (d + .15))) ** 1.5) * v


def zing(v=1.0):             # light entering glass
    d = 1.0; tt = t_(d); vib = 1 + .004 * np.sin(2 * np.pi * 11 * tt)
    x = sum(a * np.sin(2 * np.pi * f * vib * tt) * env_exp(d, tau) for f, a, tau in [(3520, 1, .35), (5274, .5, .22), (7040, .25, .12)])
    return attack(norm(x), 2) * v


def shimmer(d, v=1.0):
    tt = t_(d); x = bp(noise(d), 5500, 9000) * .5 + sum(np.sin(2 * np.pi * f * tt + p) for f, p in [(2349, 0), (2960, 1), (3520, 2)]) * .15
    return norm(x * np.sin(np.pi * tt / d) ** .7) * v


def hum(d, v=1.0):           # machine room: mains hum + fans
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(60, .25), (120, 1), (180, .35), (240, .25)]) + lp(noise(d), 900) * .5 + bp(noise(d), 2000, 3000) * .05
    return norm(x) * v


def air(d, v=1.0):           # light outdoor air
    tt = t_(d); x = lp(brown(d), 900) * (.8 + .2 * np.sin(2 * np.pi * .35 * tt)) + hp(lp(noise(d), 3500), 1200) * .04
    return norm(x) * v


# ---------- place every event ----------
hush = [(e['t'], e['until']) for e in EV if e['type'] == 'hush']
for e in EV:
    t, k = e['t'], e['type']
    if k == 'tap': add(foley, click(.75, 1), t, .55); add(foley, lp(noise(.03), 1200) * env_exp(.03, .006), t, .3)
    elif k == 'whoosh': add(foley, whoosh(e['d'], 1), t, .3, e.get('pan', 0))
    elif k == 'chirp': add(foley, chirp(), t, .3, .15)
    elif k == 'tick': add(foley, click(e['pitch'], 1), t, .22, .1)
    elif k == 'scribe': add(foley, scribe(e['d']), t, .16, .1)
    elif k == 'slide': add(foley, slide(e['d']), t, .35, .2)
    elif k == 'zing': add(foley, zing(), t, .2, .1)
    elif k == 'shimmer': add(amb, shimmer(e['d']), t, .1, .25); add(foley, whoosh(e['d'] * .9, 1), t + .05, .12, .3)
    elif k == 'led': add(foley, click(1.8 * e['pitch'], 1), t, .14, .35)
    elif k == 'reply': add(foley, zing() * .6, t, .18, .35)
    elif k == 'ping': add(foley, ding(1), t, .32)
    elif k == 'marimba': add(music, marimba(e['midi']), t, .55 if e['midi'] > 55 else .7, -.15)
    elif k == 'glock': add(music, glock(e['midi']), t, .3, .15)
    elif k == 'pulse':
        step = .25 if e['div'] == 2 else .125          # div 2 → eighths, div 4 → sixteenths
        n = int(round((e['until'] - t) / step))
        for i in range(n):
            acc = 1 if i % (2 if e['div'] == 2 else 4) == 0 else .6
            add(music, blip(880 if e['div'] == 2 else 1175, acc), t + i * step, .11, .3 if i % 2 else -.3)
    elif k == 'wood':
        for i in range(int(round((e['until'] - t) / .5))): add(music, woodblock(), t + i * .5, .12, -.4)
    elif k == 'bass': add(music, bass(e['midi'], e['d']), t, .32)
    elif k == 'chord':
        for m, g in [(38, .3), (50, .25), (57, .2), (62, .2), (66, .18), (69, .16)]:
            add(music, marimba(m, 1) if m > 45 else bass(m, 1.0), t, g, (m - 55) / 40)
        add(music, glock(74), t + .02, .18, .2)
    elif k == 'hum':
        d = e['until'] - t; h = hum(d); tt = t_(d)
        h *= np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .6)            # J-cut in from 3.5 s, out after the reply leaves
        add(amb, h, t, .14, .4)
    elif k == 'air':
        d = e['until'] - t; a = air(d); a[:int(.3 * SR)] *= np.linspace(0, 1, int(.3 * SR))
        add(amb, a, t, .07)

# near-silence before the reply: music and air drop out, only the hum stays
time = np.arange(N) / SR
for a, z in hush:
    g = np.ones(N); m = (time >= a) & (time < z); g[m] = 0.0
    ramp = int(.02 * SR); i0, i1 = int(a * SR), int(z * SR)
    g[i0:i0 + ramp] = np.linspace(1, 0, ramp); g[i1 - ramp // 2:i1] = 0
    music *= g[:, None]
foley[:int(.15 * SR)] = 0; music[:int(.15 * SR)] = 0; amb[:int(.15 * SR)] = 0          # digital silence before the tap

mixd = music * 1.0 + foley * 1.0 + amb * 1.0
for c in range(2): mixd[:, c] = limit(mixd[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mixd.astype(np.float32), SR, subtype='FLOAT')
print('mix', DUR, 's  peak', round(float(np.abs(mixd).max()), 3))
