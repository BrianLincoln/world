import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import type { Body } from './movement';

// Placeholder explorer: rounded body, pointed red knit hat, satchel.
// Procedural animation driven only by Body + mode name.

function capsule(r: number, len: number, hex: string) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), makeSolidMaterial(hex));
  return m;
}

export class CharacterRig {
  readonly root = new THREE.Group();
  private hips = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private torso: THREE.Group;
  private phase = 0;
  private lean = 0;

  constructor() {
    const coat = '#3f6488';
    const skin = '#f1d6bf';
    const hat = '#b4483a';
    const trousers = '#3a3442';
    const boots = '#5a3a2c';
    this.root.add(this.hips);
    this.hips.position.y = 0.72;

    this.torso = new THREE.Group();
    this.hips.add(this.torso);
    const body = capsule(0.27, 0.36, coat);
    body.position.y = 0.34;
    body.scale.set(1, 1, 0.85);
    this.torso.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 14), makeSolidMaterial(skin));
    head.position.y = 0.86;
    this.torso.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), makeSolidMaterial('#5d8fb0'));
    hair.position.set(0, 0.88, -0.03);
    hair.rotation.x = -0.35;
    this.torso.add(hair);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 14), makeSolidMaterial(hat));
    cap.position.set(0, 1.18, -0.06);
    cap.rotation.x = -0.35;
    this.torso.add(cap);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), makeSolidMaterial('#f3ece2'));
    pom.position.set(0, 1.4, -0.19);
    this.torso.add(pom);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), makeSolidMaterial('#e8b8a0'));
    nose.position.set(0, 0.84, 0.23);
    this.torso.add(nose);
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.16), makeSolidMaterial('#7a5238'));
    satchel.position.set(0, 0.36, -0.28);
    this.torso.add(satchel);

    const leg = (g: THREE.Group, x: number) => {
      g.position.set(x, 0.02, 0);
      const l = capsule(0.1, 0.42, trousers);
      l.position.y = -0.33;
      g.add(l);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), makeSolidMaterial(boots));
      b.scale.set(1, 0.7, 1.4);
      b.position.set(0, -0.66, 0.04);
      g.add(b);
      this.hips.add(g);
    };
    leg(this.legL, 0.13);
    leg(this.legR, -0.13);
    const arm = (g: THREE.Group, x: number) => {
      g.position.set(x, 0.56, 0);
      const a = capsule(0.075, 0.36, coat);
      a.position.y = -0.24;
      g.add(a);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), makeSolidMaterial(skin));
      h.position.y = -0.48;
      g.add(h);
      this.torso.add(g);
    };
    arm(this.armL, 0.33);
    arm(this.armR, -0.33);
  }

  update(b: Body, mode: string, dt: number) {
    this.root.position.copy(b.pos);
    this.root.rotation.y = b.heading;
    const speed = Math.hypot(b.vel.x, b.vel.z);
    let swing = 0;
    let bob = 0;
    let targetLean = 0;
    if (mode === 'walk') {
      this.phase += dt * (2.2 + speed * 1.35);
      const amp = Math.min(1, speed / 3.4) * (speed > 5 ? 0.95 : 0.6);
      swing = Math.sin(this.phase) * amp;
      bob = Math.abs(Math.cos(this.phase)) * 0.05 * Math.min(1, speed / 3);
      targetLean = speed > 5 ? 0.18 : 0.05 * Math.min(1, speed);
      if (!b.grounded) swing = 0.4;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.set(-swing * 0.8, 0, 0.08);
      this.armR.rotation.set(swing * 0.8, 0, -0.08);
    } else if (mode === 'swim') {
      this.phase += dt * 3;
      targetLean = 0.9;
      this.legL.rotation.x = Math.sin(this.phase * 2) * 0.35;
      this.legR.rotation.x = -Math.sin(this.phase * 2) * 0.35;
      this.armL.rotation.set(-2.2 + Math.sin(this.phase) * 0.6, 0, 0.5);
      this.armR.rotation.set(-2.2 - Math.sin(this.phase) * 0.6, 0, -0.5);
    } else {
      this.phase += dt * 2;
      targetLean = 0.35 + Math.min(0.6, speed / 80);
      this.legL.rotation.x = 0.35 + Math.sin(this.phase) * 0.08;
      this.legR.rotation.x = 0.4 - Math.sin(this.phase) * 0.08;
      this.armL.rotation.set(0, 0, 1.3);
      this.armR.rotation.set(0, 0, -1.3);
    }
    this.lean += (targetLean - this.lean) * (1 - Math.exp(-6 * dt));
    this.hips.rotation.x = this.lean;
    this.hips.position.y = 0.72 + bob;
  }
}
