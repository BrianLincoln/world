import * as THREE from 'three';

// Every icon in the story is drawn here with canvas paths, in the storybook
// look: flat cream/wood/stone fills, a warm plum ink line, no text. The same
// canvases feed the HUD (as data URLs) and the in-world billboards (as
// textures), so an icon always looks the same wherever it appears.

export type IconName = 'axe' | 'log' | 'stone' | 'flame' | 'heart' | 'home' | 'check' | 'hand' | 'hammer' | 'pick' | 'smash' | 'antlers' | 'up' | 'down' | 'ember' | 'bike' | 'finger' | 'mouse' | 'mouseDown' | 'fingerDown';

const INK = '#4a2e36';
const SIZE = 128;
const cache = new Map<string, HTMLCanvasElement>();

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return [c, g];
}

function ink(g: CanvasRenderingContext2D, w = 6) {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

function drawAxe(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(64, 66);
  g.rotate(-0.62);
  // Handle.
  g.beginPath();
  g.roundRect(-7, -44, 14, 92, 7);
  g.fillStyle = '#d9b27a';
  g.fill();
  ink(g);
  // Head: a rounded wedge with a bright bevelled edge.
  g.beginPath();
  g.moveTo(-6, -40);
  g.quadraticCurveTo(26, -46, 36, -52);
  g.quadraticCurveTo(46, -30, 36, -8);
  g.quadraticCurveTo(26, -16, -6, -18);
  g.closePath();
  g.fillStyle = '#9aa8b8';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(34, -47);
  g.quadraticCurveTo(42, -30, 34, -13);
  g.strokeStyle = '#eef3f6';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
}

function drawLog(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(64, 66);
  g.rotate(-0.18);
  // Bark body.
  g.beginPath();
  g.moveTo(-44, -22);
  g.lineTo(30, -22);
  g.ellipse(30, 0, 14, 22, 0, -Math.PI / 2, Math.PI / 2);
  g.lineTo(-44, 22);
  g.ellipse(-44, 0, 14, 22, 0, Math.PI / 2, -Math.PI / 2);
  g.closePath();
  g.fillStyle = '#9a6248';
  g.fill();
  ink(g);
  // Bark lines.
  g.beginPath();
  g.moveTo(-26, -9); g.lineTo(8, -9);
  g.moveTo(-18, 9); g.lineTo(18, 9);
  g.strokeStyle = '#6f4232';
  g.lineWidth = 4;
  g.stroke();
  // Cut end with rings.
  g.beginPath();
  g.ellipse(30, 0, 14, 22, 0, 0, Math.PI * 2);
  g.fillStyle = '#f0d6a2';
  g.fill();
  ink(g, 5);
  g.beginPath();
  g.ellipse(30, 0, 7, 12, 0, 0, Math.PI * 2);
  g.strokeStyle = '#c99a62';
  g.lineWidth = 3.5;
  g.stroke();
  g.restore();
}

function drawStone(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(22, 80);
  g.bezierCurveTo(14, 50, 40, 30, 66, 32);
  g.bezierCurveTo(96, 32, 112, 56, 106, 80);
  g.bezierCurveTo(100, 98, 30, 100, 22, 80);
  g.closePath();
  g.fillStyle = '#b3a8a4';
  g.fill();
  ink(g);
  // Lit top.
  g.beginPath();
  g.moveTo(40, 52);
  g.bezierCurveTo(52, 40, 76, 38, 88, 46);
  g.strokeStyle = '#e4dcd6';
  g.lineWidth = 6;
  g.stroke();
}

function flamePath(g: CanvasRenderingContext2D, s: number, oy: number) {
  g.beginPath();
  g.moveTo(64, 18 * s + oy);
  g.bezierCurveTo(78 * s + 64 * (1 - s), 46, 98 * s + 64 * (1 - s), 62, 92 * s + 64 * (1 - s), 84);
  g.bezierCurveTo(88 * s + 64 * (1 - s), 104, 40 * s + 64 * (1 - s), 104, 36 * s + 64 * (1 - s), 84);
  g.bezierCurveTo(32 * s + 64 * (1 - s), 64, 54 * s + 64 * (1 - s), 52, 64, 18 * s + oy);
  g.closePath();
}

function drawFlame(g: CanvasRenderingContext2D) {
  flamePath(g, 1, 0);
  g.fillStyle = '#f08a4b';
  g.fill();
  ink(g);
  flamePath(g, 0.55, 30);
  g.fillStyle = '#ffd36e';
  g.fill();
}

function drawHeart(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(64, 104);
  g.bezierCurveTo(20, 76, 14, 48, 30, 34);
  g.bezierCurveTo(44, 22, 60, 30, 64, 44);
  g.bezierCurveTo(68, 30, 84, 22, 98, 34);
  g.bezierCurveTo(114, 48, 108, 76, 64, 104);
  g.closePath();
  g.fillStyle = '#e8837a';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(36, 46);
  g.quadraticCurveTo(40, 38, 48, 38);
  g.strokeStyle = '#fbd3c8';
  g.lineWidth = 5;
  g.stroke();
}

function drawHome(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(28, 62); g.lineTo(64, 28); g.lineTo(100, 62); g.lineTo(100, 102); g.lineTo(28, 102); g.closePath();
  g.fillStyle = '#b8574a';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(20, 66); g.lineTo(64, 24); g.lineTo(108, 66);
  g.strokeStyle = '#5c3a3e';
  g.lineWidth = 12;
  g.stroke();
  g.beginPath();
  g.roundRect(54, 70, 20, 32, 3);
  g.fillStyle = '#ffd27a';
  g.fill();
  ink(g, 4);
}

/** "That's enough": a fat hand-inked tick on a soft green disc. */
function drawCheck(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.arc(64, 64, 50, 0, Math.PI * 2);
  g.fillStyle = '#9cc47a';
  g.fill();
  ink(g, 7);
  g.beginPath();
  g.moveTo(38, 66);
  g.quadraticCurveTo(48, 74, 56, 86);
  g.quadraticCurveTo(70, 58, 92, 40);
  g.strokeStyle = INK;
  g.lineWidth = 17;
  g.stroke();
  g.strokeStyle = '#fffaf0';
  g.lineWidth = 9;
  g.stroke();
}

/** "Pick it up": an open mitten reaching, palm down. */
function drawHand(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(64, 64);
  g.rotate(-0.35);
  // Cuff.
  g.beginPath();
  g.roundRect(-22, 20, 44, 26, 8);
  g.fillStyle = '#efe5d4';
  g.fill();
  ink(g);
  // Mitten: a rounded paddle with a thumb.
  g.beginPath();
  g.moveTo(-20, 22);
  g.bezierCurveTo(-26, -8, -24, -40, 0, -42);
  g.bezierCurveTo(24, -42, 26, -8, 20, 22);
  g.closePath();
  g.fillStyle = '#b8473a';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(20, 6);
  g.bezierCurveTo(40, 2, 44, -18, 34, -22);
  g.bezierCurveTo(26, -24, 22, -12, 20, -8);
  g.fillStyle = '#b8473a';
  g.fill();
  ink(g);
  g.restore();
}

/** "Build it": a mallet mid-knock with two little impact ticks. */
function drawHammer(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(60, 70);
  g.rotate(-0.6);
  g.beginPath();
  g.roundRect(-6, -10, 12, 58, 6);
  g.fillStyle = '#d9b27a';
  g.fill();
  ink(g);
  // Steel head (as the tool: a rounded block with a round striking face
  // on the right), same steel and highlight as the axe.
  g.beginPath();
  g.roundRect(-30, -32, 50, 24, 7);
  g.fillStyle = '#9aa8b8';
  g.fill();
  ink(g);
  g.beginPath();
  g.roundRect(18, -38, 16, 36, 6);
  g.fillStyle = '#9aa8b8';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(-22, -26); g.lineTo(12, -26);
  g.moveTo(26, -32); g.lineTo(26, -9);
  g.strokeStyle = '#eef3f6';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
  g.beginPath();
  g.moveTo(96, 30); g.lineTo(108, 22);
  g.moveTo(100, 44); g.lineTo(114, 44);
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.stroke();
}

/** The pickaxe: a long handle and a steel head curving down to a point and a chisel. */
function drawPick(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(64, 68);
  g.rotate(-0.62);
  g.beginPath();
  g.roundRect(-7, -40, 14, 90, 7);
  g.fillStyle = '#d9b27a';
  g.fill();
  ink(g);
  // Head: a crescent across the top of the handle, point right, chisel left.
  g.beginPath();
  g.moveTo(-44, -18);
  g.quadraticCurveTo(-30, -44, 0, -48);
  g.quadraticCurveTo(34, -44, 52, -10);
  g.quadraticCurveTo(28, -30, 0, -32);
  g.quadraticCurveTo(-24, -30, -38, -10);
  g.closePath();
  g.fillStyle = '#9aa8b8';
  g.fill();
  ink(g);
  g.beginPath();
  g.roundRect(-11, -52, 22, 26, 6);
  g.fillStyle = '#9aa8b8';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(10, -43);
  g.quadraticCurveTo(32, -40, 45, -18);
  g.strokeStyle = '#eef3f6';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
}

/** "Break it": a stone with a crack and flying chips. */
function drawSmash(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(0, 8);
  drawStone(g);
  g.restore();
  g.beginPath();
  g.moveTo(66, 42); g.lineTo(58, 60); g.lineTo(70, 70); g.lineTo(62, 92);
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.stroke();
  for (const [x, y, r] of [[26, 30, 7], [100, 26, 6], [110, 50, 5], [18, 56, 5]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = '#b3a8a4';
    g.fill();
    ink(g, 4);
  }
}

/** A pointing finger (touch screens): `down` = pressing, with a ripple. */
function drawFinger(g: CanvasRenderingContext2D, down: boolean) {
  if (down) {
    g.beginPath();
    g.arc(52, 22, 16, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(255, 214, 128, 0.9)';
    g.lineWidth = 6;
    g.stroke();
  }
  g.save();
  g.translate(0, down ? 6 : 0);
  // Index finger up, fist below.
  g.beginPath();
  g.moveTo(42, 70);
  g.lineTo(42, 24);
  g.quadraticCurveTo(52, 10, 62, 24);
  g.lineTo(62, 62);
  g.quadraticCurveTo(70, 56, 78, 62);
  g.quadraticCurveTo(86, 58, 92, 66);
  g.quadraticCurveTo(100, 64, 102, 74);
  g.lineTo(100, 96);
  g.quadraticCurveTo(96, 118, 72, 118);
  g.lineTo(56, 118);
  g.quadraticCurveTo(34, 116, 30, 96);
  g.lineTo(26, 80);
  g.quadraticCurveTo(28, 70, 42, 70);
  g.closePath();
  g.fillStyle = '#f2d7c0';
  g.fill();
  ink(g, 6);
  g.beginPath();
  g.moveTo(62, 62); g.lineTo(62, 76);
  g.moveTo(78, 62); g.lineTo(78, 78);
  g.moveTo(92, 66); g.lineTo(92, 80);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.restore();
}

/** A mouse with its left button lit (computers): `down` = the button pressed in. */
function drawMouse(g: CanvasRenderingContext2D, down: boolean) {
  g.beginPath();
  g.roundRect(34, 16, 60, 98, 30);
  g.fillStyle = '#fbf3e4';
  g.fill();
  ink(g, 6);
  // Left button.
  g.beginPath();
  g.moveTo(64, 18);
  g.lineTo(64, 56);
  g.lineTo(36, 56);
  g.lineTo(36, 46);
  g.quadraticCurveTo(36, 18, 64, 18);
  g.closePath();
  g.fillStyle = down ? '#e8a13e' : '#f0c26a';
  g.fill();
  ink(g, 5);
  g.beginPath();
  g.moveTo(64, 18); g.lineTo(64, 56);
  g.moveTo(36, 56); g.lineTo(92, 56);
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.stroke();
  if (down) {
    g.beginPath();
    g.moveTo(20, 20); g.lineTo(30, 28);
    g.moveTo(14, 40); g.lineTo(26, 42);
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.stroke();
  }
}

/** A pair of elk antlers (riding an elk: knock the tree down). */
function drawAntlers(g: CanvasRenderingContext2D) {
  const beam = (s: number) => {
    g.save();
    g.translate(64, 100);
    g.scale(s, 1);
    g.beginPath();
    // Main beam sweeping up and out, with three tines.
    g.moveTo(6, 0);
    g.quadraticCurveTo(26, -18, 34, -44);
    g.quadraticCurveTo(40, -64, 36, -86);
    g.moveTo(14, -12); g.quadraticCurveTo(10, -26, 2, -32);
    g.moveTo(30, -36); g.quadraticCurveTo(20, -50, 14, -62);
    g.moveTo(38, -62); g.quadraticCurveTo(48, -72, 52, -84);
    g.lineWidth = 17;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = 7.5;
    g.strokeStyle = '#f3e6c8';
    g.stroke();
    g.restore();
  };
  beam(1);
  beam(-1);
  // The brow between them.
  g.beginPath();
  g.ellipse(64, 104, 16, 10, 0, 0, Math.PI * 2);
  g.fillStyle = '#c9a27a';
  g.fill();
  ink(g, 5);
}

/** Up you go: a fat rounded arrow in the warm amber of the spirits' arms. */
function drawUp(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(64, 14);
  g.lineTo(106, 60);
  g.quadraticCurveTo(110, 66, 102, 67);
  g.lineTo(80, 67);
  g.lineTo(80, 106);
  g.quadraticCurveTo(80, 114, 72, 114);
  g.lineTo(56, 114);
  g.quadraticCurveTo(48, 114, 48, 106);
  g.lineTo(48, 67);
  g.lineTo(26, 67);
  g.quadraticCurveTo(18, 66, 22, 60);
  g.closePath();
  g.fillStyle = '#ffb35c';
  g.fill();
  ink(g);
  g.beginPath();
  g.moveTo(64, 30);
  g.lineTo(88, 56);
  g.strokeStyle = '#ffe2a8';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.stroke();
}

/** Back down and out: the same arrow, pointing down. */
function drawDown(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(64, 64);
  g.rotate(Math.PI);
  g.translate(-64, -64);
  drawUp(g);
  g.restore();
}

/** Fly as an ember: a glowing spark on a high arc, its dotted trail behind. */
function drawEmber(g: CanvasRenderingContext2D) {
  g.lineCap = 'round';
  g.strokeStyle = '#ffcf73';
  g.lineWidth = 8;
  g.setLineDash([2, 15]);
  g.beginPath();
  g.moveTo(16, 108);
  g.quadraticCurveTo(34, 26, 80, 40);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.arc(90, 44, 20, 0, Math.PI * 2);
  g.fillStyle = '#ffb35c';
  g.fill();
  ink(g);
  g.beginPath();
  g.arc(85, 38, 7, 0, Math.PI * 2);
  g.fillStyle = '#fff1c9';
  g.fill();
}

/** A bicycle: two wheels, a frame, bars and a saddle. */
function drawBike(g: CanvasRenderingContext2D) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const x of [32, 96]) {
    g.beginPath();
    g.arc(x, 82, 22, 0, Math.PI * 2);
    g.strokeStyle = '#4a2e36';
    g.lineWidth = 9;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(32, 82); g.lineTo(56, 50); g.lineTo(86, 50); g.lineTo(96, 82);
  g.moveTo(56, 50); g.lineTo(64, 82); g.lineTo(86, 50);
  g.moveTo(50, 40); g.lineTo(64, 40);
  g.moveTo(86, 50); g.lineTo(82, 34); g.lineTo(94, 32);
  g.strokeStyle = '#4a2e36';
  g.lineWidth = 13;
  g.stroke();
  g.strokeStyle = '#d9604a';
  g.lineWidth = 7;
  g.stroke();
}

const DRAW: Record<IconName, (g: CanvasRenderingContext2D) => void> = {
  up: drawUp, down: drawDown, ember: drawEmber, bike: drawBike,
  antlers: drawAntlers,
  axe: drawAxe, log: drawLog, stone: drawStone, flame: drawFlame, heart: drawHeart, home: drawHome, check: drawCheck, hand: drawHand, hammer: drawHammer, pick: drawPick, smash: drawSmash,
  finger: (g) => drawFinger(g, false), fingerDown: (g) => drawFinger(g, true), mouse: (g) => drawMouse(g, false), mouseDown: (g) => drawMouse(g, true),
};

/** The bare icon on a transparent ground. */
export function iconCanvas(name: IconName): HTMLCanvasElement {
  const key = 'i:' + name;
  let c = cache.get(key);
  if (!c) {
    const [cc, g] = canvas();
    DRAW[name](g);
    cache.set(key, (c = cc));
  }
  return c;
}

/**
 * A slot badge: `filled` = a cream disc with the icon; empty = a dashed ink
 * ring with a faint ghost of the icon (matching the dashed sketch lines).
 */
export function slotCanvas(name: IconName, filled: boolean): HTMLCanvasElement {
  const key = `s:${name}:${filled}`;
  let c = cache.get(key);
  if (!c) {
    const [cc, g] = canvas();
    g.beginPath();
    g.arc(64, 64, 54, 0, Math.PI * 2);
    if (filled) {
      g.fillStyle = '#fbf1de';
      g.fill();
      ink(g, 7);
    } else {
      g.fillStyle = 'rgba(251, 241, 222, 0.62)';
      g.fill();
      g.setLineDash([15, 11]);
      ink(g, 7);
      g.setLineDash([]);
    }
    g.save();
    g.translate(64, 64);
    g.scale(0.72, 0.72);
    g.translate(-64, -64);
    g.globalAlpha = filled ? 1 : 0.38;
    DRAW[name](g);
    g.restore();
    cache.set(key, (c = cc));
  }
  return c;
}

/** The spirit's thought bubble with an icon inside. */
export function bubbleCanvas(name: IconName): HTMLCanvasElement {
  const key = 'b:' + name;
  let c = cache.get(key);
  if (!c) {
    const [cc, g] = canvas();
    const blob = (x: number, y: number, r: number) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = '#fbf3e4';
      g.fill();
      ink(g, 5);
    };
    blob(30, 118, 5);
    blob(42, 104, 8);
    // Cloud-ish bubble: a circle with soft scallops.
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 46 + 3 * Math.cos(a * 7);
      const x = 68 + Math.cos(a) * r, y = 54 + Math.sin(a) * r * 0.9;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = '#fbf3e4';
    g.fill();
    ink(g, 6);
    g.save();
    g.translate(68, 54);
    g.scale(0.58, 0.58);
    g.translate(-64, -64);
    DRAW[name](g);
    g.restore();
    cache.set(key, (c = cc));
  }
  return c;
}

/** A soft warm glow with a little four-point twinkle (the far window at night). */
export function glowCanvas(): HTMLCanvasElement {
  const key = 'glow';
  let c = cache.get(key);
  if (!c) {
    const [cc, g] = canvas();
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 60);
    grd.addColorStop(0, 'rgba(255, 244, 205, 1)');
    grd.addColorStop(0.12, 'rgba(255, 214, 128, 0.95)');
    grd.addColorStop(0.35, 'rgba(255, 190, 100, 0.35)');
    grd.addColorStop(1, 'rgba(255, 170, 90, 0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'lighter';
    for (const [w, h] of [[3, 44], [44, 3]]) {
      const lg = g.createRadialGradient(64, 64, 0, 64, 64, Math.max(w, h));
      lg.addColorStop(0, 'rgba(255, 236, 190, 0.8)');
      lg.addColorStop(1, 'rgba(255, 236, 190, 0)');
      g.fillStyle = lg;
      g.fillRect(64 - w, 64 - h, w * 2, h * 2);
    }
    cache.set(key, (c = cc));
  }
  return c;
}

const texCache = new Map<HTMLCanvasElement, THREE.CanvasTexture>();
export function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  let t = texCache.get(c);
  if (!t) {
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    texCache.set(c, t);
  }
  return t;
}
