import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/lib/debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces a burst of calls into one invocation', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(); d(); d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('preserves the last arguments', () => {
    const fn = vi.fn();
    const d = debounce<(a: number) => void>(fn, 50);
    d(1); d(2); d(3);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('cancel() drops the pending call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d();
    d.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('flush() fires immediately with the latest args', () => {
    const fn = vi.fn();
    const d = debounce<(a: string) => void>(fn, 50);
    d('first');
    d('second');
    d.flush();
    expect(fn).toHaveBeenCalledWith('second');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // no extra fire after flush
  });
});
