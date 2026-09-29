import * as THREE from 'three';
import { OverlayLines } from '../story/overlay';
import type { WorldGen } from '../world/worldgen';

// Dev views of the beacon-tower network (never part of the player
// experience; the keys only work while the debug panel is showing):
// - L: sight lines between towers that can see each other, drawn in the
//   world flame to flame, plus a tall marker over every tower (home in red).
// - M: a top-down map of the whole network: relief, towers (home ringed),
//   links, the home cabin and where you are.

const MAP_PX = 560;
const RELIEF = 220;

export class TowerDebug {
  readonly settings = { links: false, map: false, index: 0 };
  readonly group = new THREE.Group();
  private links = new OverlayLines('#fff4d0', 2, 0.3);
  private homeLinks = new OverlayLines('#ff7448', 3.2, 0.3);
  private marks = new OverlayLines('#ffcf5a', 3, 0.55);
  private homeMark = new OverlayLines('#ff4a2e', 5, 0.7);
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private relief = document.createElement('canvas');
  private reliefRow = RELIEF;
  private reliefData: ImageData;
  private gen: WorldGen | null = null;
  private box = [0, 0, 1, 1];

  constructor() {
    this.group.add(this.links.mesh, this.homeLinks.mesh, this.marks.mesh, this.homeMark.mesh);
    this.group.visible = false;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = MAP_PX;
    this.canvas.style.cssText = `position:fixed;left:12px;bottom:12px;width:${MAP_PX}px;height:${MAP_PX}px;border:2px solid #4c2a38;border-radius:6px;display:none;z-index:20;pointer-events:none;box-shadow:0 4px 18px #0005`;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.relief.width = this.relief.height = RELIEF;
    this.reliefData = new ImageData(RELIEF, RELIEF);
  }

  /** A new world: rebuild the lines and start redrawing the relief. */
  setGen(gen: WorldGen) {
    this.gen = gen;
    const net = gen.towers;
    const segs: number[][] = [], home: number[][] = [], marks: number[][] = [];
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const t of net.towers) {
      x0 = Math.min(x0, t.x); z0 = Math.min(z0, t.z); x1 = Math.max(x1, t.x); z1 = Math.max(z1, t.z);
      const f = t.flame;
      (t.home ? home : marks).push([f.x, f.y + 2, f.z, f.x, f.y + 140, f.z]);
      for (const j of t.links) {
        if (j < t.id) continue;
        const o = net.towers[j].flame;
        (t.home || net.towers[j].home ? home : segs).push([f.x, f.y, f.z, o.x, o.y, o.z]);
      }
    }
    this.links.set(segs);
    this.homeLinks.set(home);
    this.marks.set(marks);
    this.homeMark.set(home.length ? [[net.home.flame.x, net.home.flame.y + 2, net.home.flame.z, net.home.flame.x, net.home.flame.y + 220, net.home.flame.z]] : []);
    // Square map around the network.
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = Math.max(x1 - x0, z1 - z0) / 2 + 500;
    this.box = [cx - h, cz - h, cx + h, cz + h];
    this.reliefRow = 0;
  }

  update(pos: THREE.Vector3, heading: number, camYaw: number) {
    this.group.visible = this.settings.links;
    this.canvas.style.display = this.settings.map ? '' : 'none';
    if (!this.settings.map || !this.gen) return;
    this.drawRelief(24);
    this.draw(pos, heading, camYaw);
  }

  /** A few rows of height bands and hill shading per frame. */
  private drawRelief(rows: number) {
    const gen = this.gen!;
    if (this.reliefRow >= RELIEF) return;
    const [x0, z0, x1] = this.box;
    const step = (x1 - x0) / RELIEF;
    const d = this.reliefData.data;
    for (let r = 0; r < rows && this.reliefRow < RELIEF; r++, this.reliefRow++) {
      const j = this.reliefRow;
      for (let i = 0; i < RELIEF; i++) {
        const x = x0 + (i + 0.5) * step, z = z0 + (j + 0.5) * step;
        const h = gen.baseHeight(x, z);
        const k = (j * RELIEF + i) * 4;
        if (h < 0) {
          d[k] = 150; d[k + 1] = 170; d[k + 2] = 178;
        } else {
          const shade = (gen.baseHeight(x - step, z - step) - h) / step;
          const band = Math.min(6, Math.floor(h / 60));
          const base = [[214, 196, 140], [198, 180, 126], [182, 166, 118], [168, 150, 116], [160, 142, 124], [186, 176, 166], [236, 232, 226]][band];
          const f = gen.forestDensity(x, z, h) > 0.5 ? 0.8 : 1;
          const s = THREE.MathUtils.clamp(1 + shade * 0.9, 0.7, 1.2) * f;
          d[k] = base[0] * s; d[k + 1] = base[1] * s; d[k + 2] = base[2] * s;
        }
        d[k + 3] = 255;
      }
    }
    this.relief.getContext('2d')!.putImageData(this.reliefData, 0, 0);
  }

  private draw(pos: THREE.Vector3, heading: number, camYaw: number) {
    const gen = this.gen!;
    const net = gen.towers;
    const c = this.ctx;
    const [x0, z0, x1] = this.box;
    const sc = MAP_PX / (x1 - x0);
    const X = (x: number) => (x - x0) * sc, Z = (z: number) => (z - z0) * sc;
    c.imageSmoothingEnabled = true;
    c.drawImage(this.relief, 0, 0, MAP_PX, MAP_PX);
    // Sight lines.
    c.lineWidth = 1.2;
    for (const t of net.towers) for (const j of t.links) {
      if (j < t.id) continue;
      const o = net.towers[j];
      c.strokeStyle = t.home || o.home ? '#d8401e' : '#5a3446aa';
      c.lineWidth = t.home || o.home ? 2.2 : 1.2;
      c.beginPath(); c.moveTo(X(t.x), Z(t.z)); c.lineTo(X(o.x), Z(o.z)); c.stroke();
    }
    // Towers: size by links, home ringed.
    c.font = '9px system-ui';
    c.textAlign = 'center';
    for (const t of net.towers) {
      const r = t.home ? 6 : 3.5;
      c.fillStyle = t.home ? '#ff5a2e' : '#ffcf5a';
      c.strokeStyle = '#3a1e2a';
      c.lineWidth = 1.2;
      c.beginPath(); c.arc(X(t.x), Z(t.z), r, 0, Math.PI * 2); c.fill(); c.stroke();
      if (t.home) { c.beginPath(); c.arc(X(t.x), Z(t.z), 11, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#3a1e2a';
      c.fillText(String(t.id), X(t.x), Z(t.z) - r - 2);
    }
    // The home cabin.
    const st = gen.story;
    c.fillStyle = '#b8402e';
    c.fillRect(X(st.x) - 4, Z(st.z) - 4, 8, 8);
    // You, and which way the camera looks.
    const px = X(pos.x), pz = Z(pos.z);
    c.fillStyle = '#ffffff55';
    c.beginPath(); c.moveTo(px, pz);
    const half = 0.32;
    const cy = camYaw + Math.PI; // the camera looks back past the explorer
    c.arc(px, pz, 60, Math.atan2(Math.cos(cy), Math.sin(cy)) - half, Math.atan2(Math.cos(cy), Math.sin(cy)) + half);
    c.fill();
    c.fillStyle = '#1d5fa8';
    c.save(); c.translate(px, pz); c.rotate(-heading);
    c.beginPath(); c.moveTo(0, 7); c.lineTo(-4.5, -5); c.lineTo(4.5, -5); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = '#3a1e2a';
    c.textAlign = 'left';
    c.fillText(`${net.towers.length} towers · built in ${net.ms.toFixed(0)} ms · ${(1 / sc * 100).toFixed(0)} m per 100 px`, 8, MAP_PX - 8);
  }
}
