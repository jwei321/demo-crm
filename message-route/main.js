const cv = document.getElementById('c'), g = cv.getContext('2d');
for (const w of [400, 500, 600]) await document.fonts.load(`${w} 40px Jost`);
const film = await import('./film.js');
window.DUR = film.DUR;
window.EV = film.events();
window.TEXTS = film.texts;
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); film.render(g, t); };
window.READY = true;
