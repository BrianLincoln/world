import type { PhaseDef } from './phase1';

// Phase 4: the bridge (docs/NEXT-bridge.md; the quest's own beats are
// story/bridgeQuest.ts). Home from the strait on bikes, the guide walks you
// over to the free plot by the lane where a lumber mill is to stand and shows
// it as a sketch: stones for its footing, logs for its frame and roof, as the
// stable was. Once it stands the villagers work it (story/village.ts,
// `MillWorks`), and the guide has you build a wagon out in front of it
// (story/wagon.ts). Then the villagers load the wagon with the mill's boards,
// and you can bring wood to it too; the guide stands by it, its thought the
// wood still wanted. Full, it's the quest's again (the haul).

export const PHASE4: PhaseDef = {
  id: 'bridge',
  startHour: null,
  parts: [
    { id: 'mfoot', resource: 'stones', need: 6 },
    { id: 'mframe', resource: 'logs', need: 7 },
    { id: 'mroof', resource: 'logs', need: 5 },
    { id: 'wheels', resource: 'logs', need: 5 },
    { id: 'bed', resource: 'logs', need: 7 },
  ],
  steps: [
    { id: 'millplot', kind: 'meet', near: 'millBase', radius: 7, lead: true, anchor: 'millBase', face: 'millSite', pose: 'point', icon: 'mill', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'mstones', kind: 'gather', targets: 'rock', resource: 'stones', for: ['mfoot'], anchor: 'millBase', face: 'millSite', icon: 'stone', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'mfoot', kind: 'build', parts: ['mfoot'], resource: 'stones', gather: 'mstones', zone: 'millFront', zoneRadius: 7, anchor: 'millBase', face: 'millSite', icon: 'stone', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'mlogs', kind: 'gather', targets: 'tree', resource: 'logs', for: ['mframe', 'mroof'], anchor: 'millBase', face: 'millWoods', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'mraise', kind: 'build', parts: ['mframe', 'mroof'], resource: 'logs', gather: 'mlogs', zone: 'millFront', zoneRadius: 7, anchor: 'millBase', face: 'millRoof', icon: 'log', warmth: 1, hint: 'tug', onDone: 'praise' },
    // The wagon: its sketch out in front of the mill, logs for its wheels and its bed (the mill's boards are yours too).
    { id: 'wplot', kind: 'meet', near: 'wagonBase', radius: 6, lead: true, anchor: 'wagonBase', face: 'wagonSite', pose: 'point', icon: 'wagon', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'wlogs', kind: 'gather', targets: 'tree', resource: 'logs', for: ['wheels', 'bed'], anchor: 'wagonBase', face: 'millWoods', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'wagon', kind: 'build', parts: ['wheels', 'bed'], resource: 'logs', gather: 'wlogs', zone: 'wagonFront', zoneRadius: 6, anchor: 'wagonBase', face: 'wagonSite', icon: 'log', warmth: 1, hint: 'tug', onDone: 'praise' },
    // It's loaded: the villagers carry the mill's boards out to it, and any wood you bring goes in too.
    { id: 'loading', kind: 'rest', doneAt: 0, anchor: 'wagonView', face: 'wagonSite', pose: 'stand', icon: null, warmth: 1, hint: 'none' },
  ],
};
