export interface Debounced<F extends (...args: never[]) => void> {
  (...args: Parameters<F>): void;
  cancel(): void;
  flush(): void;
}

export function debounce<F extends (...args: never[]) => void>(
  fn: F,
  ms: number,
): Debounced<F> {
  let timer: number | null = null;
  let lastArgs: Parameters<F> | null = null;

  const wrapped = ((...args: Parameters<F>) => {
    lastArgs = args;
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, ms);
  }) as Debounced<F>;

  wrapped.cancel = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  wrapped.flush = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return wrapped;
}
