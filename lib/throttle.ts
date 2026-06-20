export function throttleWithTrailingInvocation<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
) {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  function invoke() {
    lastCall = Date.now();
    fn(...(lastArgs ?? ([] as unknown as Parameters<T>)));
    lastArgs = null;
  }

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    const elapsed = Date.now() - lastCall;

    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (elapsed >= delay) { invoke(); return; }

    timeoutId = setTimeout(() => {
      if (lastArgs) invoke();
      timeoutId = null;
    }, delay);
  };

  throttled.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastArgs = null;
  };

  return throttled;
}