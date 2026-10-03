// Молоток — плагин страницы Agents Hub: разбить экран, как в Windows Desktop Destroyer.
// Кнопка в верхней полосе; в руке молоток — каждый клик оставляет трещину в «стекле» поверх страницы, осколки
// отлетают, стекло звенит. Esc или «Убрать осколки» — всё как было. Это слой поверх страницы: хаб под ним работает,
// пока молоток в руке, клики до него не доходят. «Уменьшить движение» — без летящих осколков и тряски.

const HAMMER = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(-38 20 20)">' +
  '<rect x="18" y="14" width="4" height="23" rx="2" fill="#b07a46" stroke="#000" stroke-opacity=".35"/>' +
  '<rect x="8" y="7" width="24" height="9" rx="2.5" fill="#8c98a8" stroke="#000" stroke-opacity=".45"/>' +
  '<rect x="8" y="7" width="24" height="4" rx="2" fill="#c3ccd8"/></g></svg>');
const ICON = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" ' +
  'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 3.5l5 5-2.5 2.5-5-5z"/>' +
  '<path d="M9 6l-6.5 6.5a1.4 1.4 0 0 0 2 2L11 8"/></svg>';

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let layer = null;

function rnd(a, b) { return a + Math.random() * (b - a); }

// --- звон стекла: шум с полосовым фильтром и затуханием + несколько высоких «тинь» ---------------------------------
let audio = null;
function shatterSound(power) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, len = 0.45 * audio.sampleRate;
    const buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = audio.createBufferSource(), bp = audio.createBiquadFilter(), g = audio.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.7;
    g.gain.setValueAtTime(0.5 * power, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    src.connect(bp).connect(g).connect(audio.destination); src.start(t);
    for (let k = 0; k < 5; k++) {
      const o = audio.createOscillator(), og = audio.createGain(), at = t + rnd(0.02, 0.3);
      o.type = "sine"; o.frequency.value = rnd(2400, 6200);
      og.gain.setValueAtTime(0.0001, at); og.gain.exponentialRampToValueAtTime(0.06 * power, at + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, at + rnd(0.08, 0.25));
      o.connect(og).connect(audio.destination); o.start(at); o.stop(at + 0.3);
    }
  } catch { /* без звука — тоже разбито */ }
}

// --- трещина: лучи с изломами и ветками, «паутинка» между ними, белая вспышка в точке удара ---------------------------
function crack(ctx, x, y, size) {
  const rays = Math.round(rnd(9, 15)), ends = [];
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const stroke = (path, w) => {
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = w + 1.2; ctx.stroke(path);
    ctx.strokeStyle = "rgba(235,242,255,.92)"; ctx.lineWidth = w; ctx.stroke(path);
  };
  for (let r = 0; r < rays; r++) {
    const base = (r / rays) * Math.PI * 2 + rnd(-0.25, 0.25), len = size * rnd(0.45, 1.15);
    const path = new Path2D(), pts = [[x, y]];
    let a = base, px = x, py = y, done = 0;
    path.moveTo(x, y);
    while (done < len) {
      const step = rnd(14, 34);
      a += rnd(-0.28, 0.28);
      px += Math.cos(a) * step; py += Math.sin(a) * step; done += step;
      path.lineTo(px, py); pts.push([px, py]);
      if (Math.random() < 0.18) {  // ветка
        const b = new Path2D(); let bx = px, by = py, ba = a + rnd(-0.9, 0.9);
        b.moveTo(bx, by);
        for (let s = 0; s < 3; s++) { bx += Math.cos(ba) * rnd(10, 26); by += Math.sin(ba) * rnd(10, 26); ba += rnd(-0.4, 0.4); b.lineTo(bx, by); }
        stroke(b, 0.8);
      }
    }
    stroke(path, done > size * 0.8 ? 1.4 : 1.1);
    ends.push(pts);
  }
  for (const ring of [0.18, 0.34, 0.55]) {  // паутинка: дуги между соседними лучами
    const p = new Path2D();
    ends.forEach((pts, i) => {
      const next = ends[(i + 1) % ends.length];
      const a = pts[Math.min(pts.length - 1, Math.round(pts.length * ring))];
      const b = next[Math.min(next.length - 1, Math.round(next.length * ring))];
      if (Math.random() < 0.8) { p.moveTo(a[0], a[1]); p.quadraticCurveTo((a[0] + b[0]) / 2 + rnd(-6, 6), (a[1] + b[1]) / 2 + rnd(-6, 6), b[0], b[1]); }
    });
    stroke(p, 0.7);
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 0.12);
  g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- осколки: треугольники летят и падают ---------------------------------------------------------------------------
function shards(fx, x, y) {
  if (calm()) return;
  const parts = Array.from({ length: Math.round(rnd(14, 24)) }, () => {
    const a = rnd(0, Math.PI * 2), v = rnd(2, 9);
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(1, 4), r: rnd(0, 6.3), vr: rnd(-0.3, 0.3),
      s: rnd(3, 10), life: 1 };
  });
  const ctx = fx.getContext("2d"), dpr = devicePixelRatio || 1;
  const tick = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, fx.width, fx.height);
    let alive = 0;
    for (const p of parts) {
      if (p.life <= 0) continue;
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.018; alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.8, p.s * 0.6); ctx.lineTo(-p.s * 0.7, p.s * 0.5); ctx.closePath();
      ctx.fillStyle = "rgba(220,232,250,.5)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    if (alive && layer) requestAnimationFrame(tick); else ctx.clearRect(0, 0, fx.width, fx.height);
  };
  requestAnimationFrame(tick);
}

function shake() {
  if (calm()) return;
  document.body.animate([{ transform: "translate(0,0)" }, { transform: `translate(${rnd(-6, 6)}px,${rnd(-5, 5)}px)` },
    { transform: `translate(${rnd(-4, 4)}px,${rnd(-3, 3)}px)` }, { transform: "translate(0,0)" }], { duration: 160, easing: "ease-out" });
}

function canvas() {
  const c = document.createElement("canvas"), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
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

let current = null;
function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(current); } }

function open(button, hub) {
  if (layer) return close(button);
  current = button;
  button.setAttribute("aria-pressed", "true");
  layer = document.createElement("div");
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", "Молоток: щёлкайте по экрану, Esc — убрать осколки");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "2147483000",
    cursor: `url("data:image/svg+xml,${HAMMER}") 10 10, crosshair`, touchAction: "none" });
  const glass = canvas(), fx = canvas();
  const bar = hub.el("div");
  Object.assign(bar.style, { position: "absolute", top: "12px", right: "12px", display: "flex", gap: "8px",
    padding: "6px", borderRadius: "10px", background: "var(--card, #fff)", boxShadow: "0 8px 24px rgba(0,0,0,.25)",
    cursor: "default" });
  const done = hub.el("button", "btn small", "Убрать осколки");
  done.type = "button";
  done.addEventListener("click", (e) => { e.stopPropagation(); close(button); });
  const hint = hub.el("span", null, "Щёлкайте по экрану · Esc");
  Object.assign(hint.style, { alignSelf: "center", fontSize: "12px", color: "var(--muted-foreground, #666)", padding: "0 6px" });
  bar.append(hint, done);
  bar.addEventListener("pointerdown", (e) => e.stopPropagation());
  layer.append(glass, fx, bar);
  let hits = 0;
  layer.addEventListener("pointerdown", (e) => {
    hits++;
    const size = Math.min(innerWidth, innerHeight) * rnd(0.32, 0.5);
    crack(glass.getContext("2d"), e.clientX, e.clientY, size);
    shards(fx, e.clientX, e.clientY);
    shatterSound(Math.min(1, 0.6 + hits * 0.05));
    shake();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.append(layer);
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
