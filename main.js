// Молоток — плагин страницы Agents Hub в духе Desktop Destroyer / Desktop Toys: молоток-спрайт у курсора, клик —
// три кадра удара (замах, смазанный взмах, удар), в точке удара — спрайт пробоины в стекле (дыра, крошево, трещины),
// отлетают осколки, звенит стекло. Esc или «Убрать осколки» — всё как было. Это слой поверх страницы: хаб под ним
// работает, пока молоток в руке, клики до него не доходят. «Уменьшить движение» — без кадров взмаха и осколков.
// hammer.png — 3D-иконка «hammer» от Icons8 (https://icons8.com, 3D Fluency).

const HAMMER_URL = new URL("hammer.png", import.meta.url).href;
const SRC = 376;                    // hammer.png — 376×376
const FACE = [300, 200], PIVOT = [55, 305];   // боёк и конец рукояти на рисунке
const SIZE = 120;                   // молоток на экране, px
const FRAMES = [-48, -20, 0];       // кадры удара: угол рукояти, градусы (0 — боёк в точке)
const FRAME_MS = 45;
const ICON = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" ' +
  'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 3.5l5 5-2.5 2.5-5-5z"/>' +
  '<path d="M9 6l-6.5 6.5a1.4 1.4 0 0 0 2 2L11 8"/></svg>';

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a, b) => a + Math.random() * (b - a);
let layer = null, current = null;

// --- звон стекла: шум с полосовым фильтром и затуханием, глухой удар, несколько высоких «тинь» -----------------------
let audio = null;
function shatterSound(power) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, len = 0.45 * audio.sampleRate;
    const buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = audio.createBufferSource(), bp = audio.createBiquadFilter(), g = audio.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 0.7;
    g.gain.setValueAtTime(0.55 * power, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    src.connect(bp).connect(g).connect(audio.destination); src.start(t);
    const thud = audio.createOscillator(), tg = audio.createGain();
    thud.type = "triangle"; thud.frequency.setValueAtTime(180, t); thud.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    tg.gain.setValueAtTime(0.35 * power, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    thud.connect(tg).connect(audio.destination); thud.start(t); thud.stop(t + 0.16);
    for (let k = 0; k < 5; k++) {
      const o = audio.createOscillator(), og = audio.createGain(), at = t + rnd(0.02, 0.3);
      o.type = "sine"; o.frequency.value = rnd(2400, 6200);
      og.gain.setValueAtTime(0.0001, at); og.gain.exponentialRampToValueAtTime(0.06 * power, at + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, at + rnd(0.08, 0.25));
      o.connect(og).connect(audio.destination); o.start(at); o.stop(at + 0.3);
    }
  } catch { /* без звука — тоже разбито */ }
}

// --- спрайты пробоин: рисуются один раз, при ударе — штамп случайного с поворотом -----------------------------------
function decal(px) {
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d"), m = px / 2;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const line = (pts, w) => {
    const draw = (dx, dy, color, lw) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x + dx, y + dy);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    };
    draw(1, 1.2, "rgba(0,0,0,.55)", w + 1);
    draw(0, 0, "rgba(240,247,255,.95)", w);
  };
  const rays = Math.round(rnd(10, 16));  // трещины от центра: изломанные лучи с ветками
  for (let r = 0; r < rays; r++) {
    let a = (r / rays) * Math.PI * 2 + rnd(-0.2, 0.2), x = m, y = m;
    const pts = [[x, y]], len = m * rnd(0.55, 0.98);
    for (let d = 0; d < len;) {
      const s = rnd(6, 14); a += rnd(-0.3, 0.3); x += Math.cos(a) * s; y += Math.sin(a) * s; d += s; pts.push([x, y]);
      if (Math.random() < 0.15) line([[x, y], [x + Math.cos(a + 0.8) * rnd(6, 16), y + Math.sin(a + 0.8) * rnd(6, 16)]], 0.7);
    }
    line(pts, r % 3 ? 0.9 : 1.4);
  }
  for (const k of [0.3, 0.5]) {  // кольца-паутинка
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2, rr = m * k * rnd(0.85, 1.12);
      if (i === 0 || Math.random() < 0.25) ctx.moveTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr);
      else ctx.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr);
    }
    ctx.strokeStyle = "rgba(240,247,255,.7)"; ctx.lineWidth = 0.8; ctx.stroke();
  }
  for (let i = 0; i < 70; i++) {  // крошево
    const a = rnd(0, Math.PI * 2), r0 = rnd(m * 0.08, m * 0.24), r1 = r0 + rnd(3, 8), b = a + rnd(-0.4, 0.4);
    line([[m + Math.cos(a) * r0, m + Math.sin(a) * r0], [m + Math.cos(b) * r1, m + Math.sin(b) * r1]], 0.6);
  }
  ctx.beginPath();  // дыра: рваный край, тёмная глубина, блик по кромке
  for (let i = 0, n = 14; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = m * rnd(0.07, 0.14), x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(m - 2, m - 2, 1, m, m, m * 0.14);
  g.addColorStop(0, "rgba(5,6,8,.95)"); g.addColorStop(0.7, "rgba(25,28,34,.9)"); g.addColorStop(1, "rgba(80,90,105,.85)");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.2; ctx.stroke();
  return c;
}

// --- осколки: треугольники с бликом летят и падают ------------------------------------------------------------------
function shards(fx, x, y) {
  if (calm()) return;
  const parts = Array.from({ length: Math.round(rnd(12, 20)) }, () => {
    const a = rnd(0, Math.PI * 2), v = rnd(2, 8);
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(1, 4), r: rnd(0, 6.3), vr: rnd(-0.3, 0.3), s: rnd(3, 9), life: 1 };
  });
  const ctx = fx.getContext("2d"), dpr = devicePixelRatio || 1;
  const tick = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, fx.width, fx.height);
    let alive = 0;
    for (const p of parts) {
      if (p.life <= 0) continue;
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.02; alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.8, p.s * 0.6); ctx.lineTo(-p.s * 0.7, p.s * 0.5); ctx.closePath();
      const sh = ctx.createLinearGradient(-p.s, -p.s, p.s, p.s);
      sh.addColorStop(0, "rgba(255,255,255,.8)"); sh.addColorStop(1, "rgba(150,180,220,.5)");
      ctx.fillStyle = sh; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    if (alive && layer) requestAnimationFrame(tick); else ctx.clearRect(0, 0, fx.width, fx.height);
  };
  requestAnimationFrame(tick);
}

function canvas() {
  const c = document.createElement("canvas"), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
}

// --- молоток-спрайт: кадр с углом рукояти; при угле 0 боёк — в точке (x, y) -----------------------------------------
function drawHammer(ctx, img, x, y, angle, ghost) {
  const k = SIZE / SRC, deg = (angle * Math.PI) / 180;
  const px = PIVOT[0] * k, py = PIVOT[1] * k, fx = FACE[0] * k, fy = FACE[1] * k;
  ctx.save();
  ctx.globalAlpha = ghost || 1;
  ctx.translate(x + (px - fx), y + (py - fy)); ctx.rotate(deg); ctx.translate(-px, -py);
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 8;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  ctx.restore();
}

function close(button) {
  if (!layer) return;
  const l = layer;
  layer = null;
  document.removeEventListener("keydown", onKey, true);
  button?.setAttribute("aria-pressed", "false");
  if (calm()) l.remove();
  else l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" }).onfinish = () => l.remove();
}

function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(current); } }

function open(button, hub) {
  if (layer) return close(button);
  current = button;
  button.setAttribute("aria-pressed", "true");
  layer = document.createElement("div");
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", "Молоток: щёлкайте по экрану, Esc — убрать осколки");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "2147483000", cursor: "none", touchAction: "none",
    overflow: "hidden" });
  const glass = canvas(), fx = canvas(), hand = canvas();
  const img = new Image();
  img.src = HAMMER_URL;
  const decals = Array.from({ length: 5 }, () => decal(220));

  let mx = innerWidth / 2, my = innerHeight / 2, angle = FRAMES[0], trail = [];
  const paint = () => {
    const ctx = hand.getContext("2d");
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!img.complete || !img.naturalWidth) return;
    for (const [a, alpha] of trail) drawHammer(ctx, img, mx, my, a, alpha);  // смазанный след взмаха
    drawHammer(ctx, img, mx, my, angle);
  };
  img.onload = paint;
  layer.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; paint(); });

  const bar = hub.el("div");
  Object.assign(bar.style, { position: "absolute", top: "12px", right: "12px", display: "flex", gap: "8px",
    padding: "6px", borderRadius: "10px", background: "var(--card, #fff)", boxShadow: "0 8px 24px rgba(0,0,0,.25)",
    cursor: "default" });
  const done = hub.el("button", "btn small", "Убрать осколки");
  done.type = "button";
  done.addEventListener("click", (e) => { e.stopPropagation(); close(button); });
  const hint = hub.el("span", null, "Бейте молотком · Esc");
  Object.assign(hint.style, { alignSelf: "center", fontSize: "12px", color: "var(--muted-foreground, #666)", padding: "0 6px" });
  bar.append(hint, done);
  bar.addEventListener("pointerdown", (e) => e.stopPropagation());
  layer.append(glass, fx, hand, bar);

  let hits = 0, busy = null;
  const strike = (x, y) => {
    hits++;
    const d = decals[Math.floor(Math.random() * decals.length)], s = rnd(0.75, 1.25), ctx = glass.getContext("2d");
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd(0, Math.PI * 2)); ctx.scale(s, s);
    ctx.drawImage(d, -d.width / 2, -d.height / 2);
    ctx.restore();
    shards(fx, x, y);
    shatterSound(Math.min(1, 0.6 + hits * 0.05));
  };
  layer.addEventListener("pointerdown", (e) => {
    mx = e.clientX; my = e.clientY;
    const x = mx, y = my;
    if (busy) { clearTimeout(busy.timer); busy.finish(); }  // частые клики — каждый бьёт
    if (calm()) { angle = FRAMES[2]; paint(); strike(x, y); setTimeout(() => { angle = FRAMES[0]; paint(); }, 120); return; }
    let i = 0, struck = false;
    const back = () => { trail = []; angle = FRAMES[0]; paint(); busy = null; };
    const step = () => {
      trail = i === 1 ? [[FRAMES[0], 0.25]] : i === 2 ? [[FRAMES[0], 0.15], [FRAMES[1], 0.3]] : [];
      angle = FRAMES[i]; paint();
      if (i === FRAMES.length - 1) { struck = true; strike(x, y); busy.timer = setTimeout(back, 110); return; }
      i++; busy.timer = setTimeout(step, FRAME_MS);
    };
    busy = { timer: 0, finish: () => { if (!struck) strike(x, y); back(); } };
    step();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.append(layer);
  paint();
  done.focus();
}

export default function register(hub) {
  hub.addSlot("topbar", {
    id: "hammer", order: 90,
    render(root) {
      if (root.firstChild) return;
      const b = hub.el("button", "btn quiet small");
      b.type = "button";
      b.innerHTML = ICON;
      b.append(" Молоток");
      b.title = "Разбить экран (Esc — убрать осколки)";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => open(b, hub));
      root.append(b);
    },
  });
}
