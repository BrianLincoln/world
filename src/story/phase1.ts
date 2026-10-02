import type { PartId } from './build';
import type { IconName } from './icons';
import type { Pose } from './spirit';

// Objectives are data. A phase lists the repairable parts, the resources, and
// an ordered list of steps; the director (story.ts) only knows the step
// *kinds*. Later phases (more cabins, a workshop, the bike, mounts) add new
// phase tables, and new kinds only when a genuinely new verb appears.
// (Phase 2, the journey, is its own director: story/journey.ts. Phase 3,
// the stable, is a table again: phase3.ts.)

export type Resource = 'logs' | 'stones';

/** Named places the spirit can wait at or point to (resolved by the site). */
export type Anchor =
  | 'hearthSpot' | 'hearthSeat' | 'hearth' | 'door' | 'doorstep' | 'stumpSpot' | 'axe' | 'seat' | 'grove'
  | 'yard' | 'cabin' | 'roof' | 'bank' | 'stones' | 'chimneySpot' | 'chimney' | 'far' | 'lookout' | 'pickSpot' | 'pick' | 'rocks'
  // Phase 3: the stable and its pasture.
  | 'plotSpot' | 'stableSite' | 'stableFront' | 'stableBase' | 'roofTop' | 'gate' | 'gateIn' | 'gateOut' | 'lasso' | 'woods' | 'fenceSide' | 'fenceView' | 'pasture';

/** Interactable groups a step can switch on (they glint while it's active). */
export type TargetTag = 'axe' | 'pick' | 'tree' | 'rock' | 'hearth' | 'lasso';

interface StepBase {
  id: string;
  /** Where the spirit goes and waits during this step. */
  anchor: Anchor;
  /** What it looks at / points to while waiting. */
  face?: Anchor;
  pose?: Pose;
  /** Its thought-bubble icon. */
  icon?: IconName | null;
  /** Spirit warmth while this step is active (0 cold .. 1 glowing). It stays ash-grey until the hearth is lit. */
  warmth: number;
  /** The hour this step begins at: the clock drifts there as it starts, then
   *  runs on naturally until the next step's hour. */
  hour?: number;
  /** When set, the clock time-lapses to this hour as the step begins. */
  easeTo?: number;
  /** Wait for you to keep up on the way (default: every kind but meet). */
  lead?: boolean;
  /** Repeat-the-hint behaviour after ~20 s without progress. */
  hint: 'tug' | 'none';
  /** The spirit's reaction as the step completes. */
  onDone?: 'celebrate' | 'greet' | 'praise';
}

export type StepDef =
  /** Done when the explorer comes within `radius` of an anchor. */
  | (StepBase & { kind: 'meet'; near: Anchor; radius: number })
  /** Pick up a tool (every target with the tag). */
  | (StepBase & { kind: 'pickup'; targets: TargetTag; item: 'axe' | 'pick' | 'lasso' })
  /** Collect enough of a resource to finish `for` (minus what's already built in). */
  | (StepBase & { kind: 'gather'; targets: TargetTag; resource: Resource; for: PartId[] })
  /** Bring the resource to the sketched parts; fall back to `gather` if you run out. */
  | (StepBase & { kind: 'build'; parts: PartId[]; resource: Resource; gather: string; zone: Anchor; zoneRadius: number })
  /** Light something, possible from `readyAt` o'clock. */
  | (StepBase & { kind: 'light'; targets: TargetTag; readyAt: number })
  /** Lasso a creature: done once one's on your lead. The spirit takes you
   *  to one and shows you how (story.ts, catch step). */
  | (StepBase & { kind: 'catch' })
  /** Bring creatures home to the pasture until `count` live there; back to
   *  `catch` if you've nothing on a lead. */
  | (StepBase & { kind: 'herd'; count: number; catch: string })
  /** Nothing to ask for: the spirit potters (fire, yard, fire). At `doneAt`
   *  o'clock the story lets go of the clock. */
  | (StepBase & { kind: 'rest'; doneAt: number });

export interface PartDef { id: PartId; resource: Resource; need: number }

export interface PhaseDef {
  id: string;
  /** The clock the phase starts at (null: it doesn't touch the time of day). */
  startHour: number | null;
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
    { id: 'axe', kind: 'pickup', targets: 'axe', item: 'axe', anchor: 'stumpSpot', face: 'axe', icon: 'axe', warmth: 0, hour: 7.9, hint: 'tug', onDone: 'celebrate' },
    { id: 'logs', kind: 'gather', targets: 'tree', resource: 'logs', for: ['roof', 'door'], anchor: 'seat', face: 'grove', pose: 'sit', icon: 'log', warmth: 0, hour: 9.0, hint: 'tug', onDone: 'celebrate' },
    { id: 'repair', kind: 'build', parts: ['roof', 'door'], resource: 'logs', gather: 'logs', zone: 'yard', zoneRadius: 6.5, anchor: 'yard', face: 'roof', icon: 'log', warmth: 0, hour: 10.6, hint: 'tug', onDone: 'celebrate' },
    { id: 'pick', kind: 'pickup', targets: 'pick', item: 'pick', anchor: 'pickSpot', face: 'pick', icon: 'pick', warmth: 0, hour: 12.2, hint: 'tug', onDone: 'celebrate' },
    { id: 'stones', kind: 'gather', targets: 'rock', resource: 'stones', for: ['chimney'], anchor: 'pickSpot', face: 'rocks', icon: 'stone', warmth: 0, hour: 13.4, hint: 'tug', onDone: 'celebrate' },
    { id: 'chimney', kind: 'build', parts: ['chimney'], resource: 'stones', gather: 'stones', zone: 'chimneySpot', zoneRadius: 5.5, anchor: 'chimneySpot', face: 'chimney', icon: 'stone', warmth: 0, hour: 15.0, hint: 'tug', onDone: 'celebrate' },
    { id: 'hearth', kind: 'light', targets: 'hearth', readyAt: 0, anchor: 'hearthSpot', face: 'hearth', pose: 'warm', icon: 'flame', warmth: 0, hour: 16.2, hint: 'tug', onDone: 'celebrate' },
    { id: 'home', kind: 'rest', doneAt: 0, anchor: 'hearthSeat', face: 'hearth', pose: 'sit', icon: null, warmth: 1, hint: 'none' },
  ],
};
