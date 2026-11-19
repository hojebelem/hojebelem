import { describe, expect, it } from "vitest";
import {
  createResetToken,
  parseResetToken,
  verifyResetToken,
} from "./password-reset";

const SECRET = "test-secret-for-vitest";

describe("password reset tokens", () => {
  it("gera e valida token dentro do prazo", () => {
    const now = 1_700_000_000_000;
    const token = createResetToken("user-1", "$2a$12$hash1", now, SECRET);
    expect(
      verifyResetToken(
        token,
        { id: "user-1", passwordHash: "$2a$12$hash1" },
        now + 1000,
        SECRET,
      ),
    ).toBe(true);
  });

  it("rejeita token expirado, adulterado ou de outro usuário", () => {
    const now = 1_700_000_000_000;
    const token = createResetToken("user-1", "$2a$12$hash1", now, SECRET);

    expect(
      verifyResetToken(
        token,
        { id: "user-1", passwordHash: "$2a$12$hash1" },
        now + 31 * 60 * 1000,
        SECRET,
      ),
    ).toBe(false);
    expect(
      verifyResetToken(
        token,
        { id: "user-2", passwordHash: "$2a$12$hash1" },
        now + 1000,
        SECRET,
      ),
    ).toBe(false);
    expect(parseResetToken(`${token}x`, SECRET, now + 1000)).toBeNull();
    expect(parseResetToken("malformed", SECRET, now + 1000)).toBeNull();
    expect(parseResetToken(token, SECRET, now + 31 * 60 * 1000)).toBeNull();
  });

  it("invalida o token assim que a senha muda", () => {
    const now = 1_700_000_000_000;
    const token = createResetToken("user-1", "$2a$12$hash1", now, SECRET);
    expect(
      verifyResetToken(
        token,
        { id: "user-1", passwordHash: "$2a$12$hash2" },
        now + 1000,
        SECRET,
      ),
    ).toBe(false);
  });
});
