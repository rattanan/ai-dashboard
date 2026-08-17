export async function fetchAiWithRetry(
  url: string,
  init: Omit<RequestInit, "signal">,
  options: { timeoutMs: number; maxRetries: number },
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      const retryable =
        [408, 409, 425, 429].includes(response.status) ||
        response.status >= 500;
      if (response.ok || !retryable || attempt === options.maxRetries)
        return response;
    } catch (error) {
      lastError = error;
      if (attempt === options.maxRetries) throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(2_000, 250 * 2 ** attempt)),
    );
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("AI endpoint request failed");
}
