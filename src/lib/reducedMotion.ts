import type { ReducedMotionPref } from '../storage/schema';

export function shouldReduceMotion(pref: ReducedMotionPref): boolean {
  if (pref === 'always') return true;
  if (pref === 'never') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
