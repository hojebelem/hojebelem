import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const WINDOW = 1000;
const MAX = 3;

function setup() {
  return createRateLimiter({ max: MAX, windowMs: WINDOW });
}

describe("createRateLimiter", () => {
  it("libera até o máximo de tentativas", () => {
    const limiter = setup();
    for (let i = 0; i < MAX; i++) expect(limiter.hit("a", 0)).toBe(true);
  });

  it("bloqueia a tentativa seguinte ao máximo", () => {
    const limiter = setup();
    for (let i = 0; i < MAX; i++) limiter.hit("a", 0);
    expect(limiter.hit("a", 1)).toBe(false);
    expect(limiter.hit("a", 2)).toBe(false);
  });

  it("libera de novo depois da janela", () => {
    const limiter = setup();
    for (let i = 0; i < MAX; i++) limiter.hit("a", 0);
    expect(limiter.hit("a", 1)).toBe(false);
    expect(limiter.hit("a", WINDOW + 1)).toBe(true);
  });

  it("não conta as tentativas bloqueadas para estender o bloqueio", () => {
    const limiter = setup();
    for (let i = 0; i < MAX; i++) limiter.hit("a", 0);
    limiter.hit("a", WINDOW - 1);
    expect(limiter.hit("a", WINDOW + 1)).toBe(true);
  });

  it("chaves diferentes não se afetam", () => {
    const limiter = setup();
    for (let i = 0; i < MAX; i++) limiter.hit("a", 0);
    expect(limiter.hit("a", 1)).toBe(false);
    expect(limiter.hit("b", 1)).toBe(true);
  });
});
