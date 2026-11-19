// shortcut: limite em memória por processo; com mais de uma instância do app, mover para o banco ou Redis.

const MAX_TRACKED_KEYS = 10_000;

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
    if (now - lastSweep < windowMs && attempts.size < MAX_TRACKED_KEYS) return;
    lastSweep = now;
    for (const [key, times] of attempts) {
      if (times.every((time) => time <= now - windowMs)) attempts.delete(key);
    }
    // proteção extra contra flood de chaves únicas na mesma janela
    while (attempts.size >= MAX_TRACKED_KEYS) {
      const oldestKey = attempts.keys().next().value;
      if (oldestKey === undefined) break;
      attempts.delete(oldestKey);
    }
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

export const registerEmailLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});

export const registerIpLimiter = createRateLimiter({
  max: 20,
  windowMs: 15 * 60 * 1000,
});

export const submitEventLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 60 * 1000,
});

export const profileUpdateLimiter = createRateLimiter({
  max: 15,
  windowMs: 15 * 60 * 1000,
});

export const passwordResetEmailLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});

export const passwordResetIpLimiter = createRateLimiter({
  max: 15,
  windowMs: 15 * 60 * 1000,
});

export const resetPasswordLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});

export const accountSecurityLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});
