import type { Beast } from './beast';
import { BogHag } from './boghag';
import { Brambler } from './brambler';
import { Glimmer } from './glimmer';
import { LanternHare } from './lanternhare';
import { Moonmoth } from './moonmoth';
import { Mossback } from './mossback';
import { Mudsnoot } from './mudsnoot';
import { Rockhopper } from './rockhopper';
import { Stormback } from './stormback';
import { Wurm } from './wurm';

// The wilder creatures, in one list for main.ts (see beast.ts). Each lives
// in its own kind of place:
//   mossback     forest edges and meadows      glimmer      glimmerwood; any forest at night
//   mudsnoot     bogs                          moonmoth     forests, glimmerwood, the hollows
//   rockhopper   crags: high, steep, rocky     boghag       bogs and marshy shores
//   brambler     deep forest                   wurm         the hollows, cliffs
//   stormback    open downs                    lanternhare  meadows and woodland edges
export function makeBeasts(): Beast[] {
  return [new Mossback(), new Glimmer(), new Mudsnoot(), new Moonmoth(), new Rockhopper(), new BogHag(), new Brambler(), new Wurm(), new Stormback(), new LanternHare()];
}
