// shortcut: limite em memória por processo; com mais de uma instância do app, mover para o banco ou Redis.

// janela deslizante: guarda o horário de cada tentativa aceita e conta só as da janela
export function createRateLimiter({
  max,
  windowMs,
}: {
  max: number;
  windowMs: number;
}) {
  const attempts = new Map<string, number[]>();
  let lastSweep = 0;

  // sem isso o mapa guardaria para sempre cada chave que já tentou entrar
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, times] of attempts)
      if (times.every((time) => time <= now - windowMs)) attempts.delete(key);
  }

  return {
    // registra a tentativa; false quando a chave já usou as `max` da janela
    hit(key: string, now = Date.now()): boolean {
      sweep(now);
      const recent = (attempts.get(key) ?? []).filter(
        (time) => time > now - windowMs,
      );
      // tentativa bloqueada não entra na conta, senão o bloqueio nunca acabaria
      if (recent.length >= max) {
        attempts.set(key, recent);
        return false;
      }
      recent.push(now);
      attempts.set(key, recent);
      return true;
    },
  };
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const loginLimiter = createRateLimiter({
  max: LOGIN_MAX_ATTEMPTS,
  windowMs: LOGIN_WINDOW_MS,
});
