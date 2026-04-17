import type { TaskId } from './task';

export interface Tree {
  taskId: TaskId;
  plantedAt: string;
  seed: number;
}

export interface TreeVisual {
  speciesIndex: number; // 0..SPECIES_COUNT-1
  x: number; // 0..1 relative to scene width
  y: number; // 0..1 relative to scene depth (0 back, 1 front)
  scale: number; // 0.75..1.1
}

export const SPECIES_COUNT = 4;

/**
 * xmur3 string hash → deterministic 32-bit seed.
 */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * mulberry32 PRNG — deterministic, small, fast.
 */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedForTaskId(taskId: TaskId): number {
  return xmur3(taskId);
}

export function visualForTree(seed: number): TreeVisual {
  const rand = mulberry32(seed);
  const speciesIndex = Math.floor(rand() * SPECIES_COUNT);
  const x = rand();
  const y = rand();
  const scale = 0.75 + rand() * 0.35;
  return { speciesIndex, x, y, scale };
}
