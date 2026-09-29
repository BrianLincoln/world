import type { PartId } from './cabin';
import type { IconName } from './icons';
import type { Pose } from './spirit';

// Objectives are data. A phase lists the repairable parts, the resources, and
// an ordered list of steps; the director (story.ts) only knows the step
// *kinds*. Later phases (more cabins, a workshop, the bike, mounts) add new
// phase tables, and new kinds only when a genuinely new verb appears.

export type Resource = 'logs' | 'stones';

/** Named places the spirit can wait at or point to (resolved by the site). */
export type Anchor =
  | 'hearthSpot' | 'hearthSeat' | 'hearth' | 'door' | 'doorstep' | 'stumpSpot' | 'axe' | 'seat' | 'grove'
  | 'yard' | 'cabin' | 'roof' | 'bank' | 'stones' | 'chimneySpot' | 'chimney' | 'far' | 'lookout' | 'pickSpot' | 'pick' | 'rocks';

/** Interactable groups a step can switch on (they glint while it's active). */
export type TargetTag = 'axe' | 'pick' | 'tree' | 'rock' | 'hearth';

interface StepBase {
  id: string;
  /** Where the spirit goes and waits during this step. */
  anchor: Anchor;
  /** What it looks at / points to while waiting. */
  face?: Anchor;
  pose?: Pose;
  /** Its thought-bubble icon. */
  icon?: IconName | null;
  /** Spirit warmth while this step is active (0 cold .. 1 glowing). */
  warmth: number;
  /** The hour this step begins at: the clock drifts there as it starts, then
   *  runs on naturally until the next step's hour. */
  hour?: number;
  /** When set, the clock time-lapses to this hour as the step begins. */
  easeTo?: number;
  /** Repeat-the-hint behaviour after ~20 s without progress. */
  hint: 'tug' | 'none';
  /** The spirit's reaction as the step completes. */
  onDone?: 'celebrate' | 'greet';
}

export type StepDef =
  /** Done when the explorer comes within `radius` of an anchor. */
  | (StepBase & { kind: 'meet'; near: Anchor; radius: number })
  /** Pick up a tool (every target with the tag). */
  | (StepBase & { kind: 'pickup'; targets: TargetTag; item: 'axe' | 'pick' })
  /** Collect enough of a resource to finish `for` (minus what's already built in). */
  | (StepBase & { kind: 'gather'; targets: TargetTag; resource: Resource; for: PartId[] })
  /** Bring the resource to the sketched parts; fall back to `gather` if you run out. */
  | (StepBase & { kind: 'build'; parts: PartId[]; resource: Resource; gather: string; zone: Anchor; zoneRadius: number })
  /** Light something, possible from `readyAt` o'clock. */
  | (StepBase & { kind: 'light'; targets: TargetTag; readyAt: number })
  /** Nothing to ask for: the spirit potters (fire, yard, fire). At `doneAt`
   *  o'clock the story lets go of the clock. */
  | (StepBase & { kind: 'rest'; doneAt: number });

export interface PartDef { id: PartId; resource: Resource; need: number }

export interface PhaseDef {
  id: string;
  startHour: number;
  parts: PartDef[];
  steps: StepDef[];
}

export const PHASE1: PhaseDef = {
  id: 'hearth',
  startHour: 7.3,
  parts: [
    { id: 'roof', resource: 'logs', need: 4 },
    { id: 'door', resource: 'logs', need: 2 },
    { id: 'chimney', resource: 'stones', need: 3 },
  ],
  steps: [
    { id: 'meet', kind: 'meet', near: 'door', radius: 24, anchor: 'hearthSpot', face: 'hearth', pose: 'shiver', icon: null, warmth: 0, hour: 7.3, hint: 'tug', onDone: 'greet' },
    { id: 'axe', kind: 'pickup', targets: 'axe', item: 'axe', anchor: 'stumpSpot', face: 'axe', icon: 'axe', warmth: 0.06, hour: 7.9, hint: 'tug', onDone: 'celebrate' },
    { id: 'logs', kind: 'gather', targets: 'tree', resource: 'logs', for: ['roof', 'door'], anchor: 'seat', face: 'grove', pose: 'sit', icon: 'log', warmth: 0.14, hour: 9.0, hint: 'tug', onDone: 'celebrate' },
    { id: 'repair', kind: 'build', parts: ['roof', 'door'], resource: 'logs', gather: 'logs', zone: 'yard', zoneRadius: 6.5, anchor: 'yard', face: 'roof', icon: 'log', warmth: 0.24, hour: 10.6, hint: 'tug', onDone: 'celebrate' },
    { id: 'pick', kind: 'pickup', targets: 'pick', item: 'pick', anchor: 'pickSpot', face: 'pick', icon: 'pick', warmth: 0.36, hour: 12.2, hint: 'tug', onDone: 'celebrate' },
    { id: 'stones', kind: 'gather', targets: 'rock', resource: 'stones', for: ['chimney'], anchor: 'pickSpot', face: 'rocks', icon: 'stone', warmth: 0.46, hour: 13.4, hint: 'tug', onDone: 'celebrate' },
    { id: 'chimney', kind: 'build', parts: ['chimney'], resource: 'stones', gather: 'stones', zone: 'chimneySpot', zoneRadius: 5.5, anchor: 'chimneySpot', face: 'chimney', icon: 'stone', warmth: 0.58, hour: 15.0, hint: 'tug', onDone: 'celebrate' },
    { id: 'hearth', kind: 'light', targets: 'hearth', readyAt: 0, anchor: 'hearthSpot', face: 'hearth', pose: 'warm', icon: 'flame', warmth: 0.68, hour: 16.2, hint: 'tug', onDone: 'celebrate' },
    { id: 'home', kind: 'rest', doneAt: 0, anchor: 'hearthSeat', face: 'hearth', pose: 'sit', icon: null, warmth: 1, hint: 'none' },
  ],
};
