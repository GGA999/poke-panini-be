export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 5_000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
