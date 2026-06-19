export async function withTimeout(operation, timeoutMs = 5_000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await operation(controller.signal);
    }
    finally {
        clearTimeout(timeout);
    }
}
