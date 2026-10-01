import type { PhaseDef } from './phase1';

// Phase 3: the stable (DESIGN.md, Player Sequence). The first time you come
// home after lighting the second tower, the spirit walks you out to the
// open ground by the cabin, where marker stakes show a pasture. You build a
// stable there (stones for the footing and trough, logs for the frame and
// the turf roof, then logs for the fence), and the spirit pulls a lasso out
// of its heart for you. Lasso a creature, lead it in through the gate, and
// it lives there: saddled, rideable, always home again.
//
// While the stable goes up the spirit keeps a home base in it, stood in
// the middle bay, and runs the job from there with its arms: it points out
// at the rocks or the woods ("go and get those") and waves you back in
// ("bring them here"), then throws its arms wide at the sketch ("build
// this"). It doesn't walk you to single trees and rocks.
//
// With the lasso in hand, it takes you out to a creature grazing near the
// pasture (one's always there: story/herd.ts) and shows you how, twirling
// a little loop of its own and flinging it; then, with the creature on your
// lead, it runs back to the gate and waves you both in. When it's home the
// spirit comes over to you, full of joy, and then goes quietly about its
// day: a while at the fence watching the new arrival, then pottering.
//
// Nothing here moves the clock: the day runs on as it likes.

export const PHASE3: PhaseDef = {
  id: 'stable',
  startHour: null,
  parts: [
    { id: 'footing', resource: 'stones', need: 6 },
    { id: 'frame', resource: 'logs', need: 8 },
    { id: 'sroof', resource: 'logs', need: 4 },
    { id: 'fence', resource: 'logs', need: 8 },
  ],
  steps: [
    { id: 'plot', kind: 'meet', near: 'plotSpot', radius: 9, lead: true, anchor: 'plotSpot', face: 'stableSite', pose: 'point', icon: 'stable', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'stones3', kind: 'gather', targets: 'rock', resource: 'stones', for: ['footing'], anchor: 'stableBase', face: 'stableSite', icon: 'stone', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'footing', kind: 'build', parts: ['footing'], resource: 'stones', gather: 'stones3', zone: 'stableFront', zoneRadius: 7, anchor: 'stableBase', face: 'stableSite', icon: 'stone', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'logs3', kind: 'gather', targets: 'tree', resource: 'logs', for: ['frame', 'sroof'], anchor: 'stableBase', face: 'woods', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'raise', kind: 'build', parts: ['frame', 'sroof'], resource: 'logs', gather: 'logs3', zone: 'stableFront', zoneRadius: 7, anchor: 'stableBase', face: 'roofTop', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'logs4', kind: 'gather', targets: 'tree', resource: 'logs', for: ['fence'], anchor: 'gateOut', face: 'woods', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'fence', kind: 'build', parts: ['fence'], resource: 'logs', gather: 'logs4', zone: 'gateOut', zoneRadius: 7, anchor: 'gateOut', face: 'fenceSide', icon: 'log', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'lasso', kind: 'pickup', targets: 'lasso', item: 'lasso', anchor: 'gateOut', face: 'lasso', icon: 'lasso', warmth: 1, hint: 'tug', onDone: 'celebrate' },
    { id: 'catch', kind: 'catch', anchor: 'gateOut', icon: 'lasso', warmth: 1, hint: 'none', onDone: 'celebrate' },
    { id: 'herd', kind: 'herd', count: 1, catch: 'catch', anchor: 'gateOut', face: 'gate', icon: 'creature', lead: false, warmth: 1, hint: 'none', onDone: 'praise' },
    { id: 'ranch', kind: 'rest', doneAt: 0, anchor: 'hearthSeat', face: 'hearth', pose: 'sit', icon: null, warmth: 1, hint: 'none' },
  ],
};
