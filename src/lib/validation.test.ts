import { describe, expect, it } from "vitest";
import {
  isHttpUrl,
  isSafeLocalPath,
  isSafeUrlOrPath,
  normalizeEmail,
  safeAvatarUrl,
} from "./validation";

describe("validation helpers", () => {
  it("aceita apenas URLs http/https", () => {
    expect(isHttpUrl("https://www.sympla.com.br/evento/1")).toBe(true);
    expect(isHttpUrl("http://localhost:3000/teste")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isHttpUrl("/images/hero.webp")).toBe(false);
  });

  it("aceita caminhos locais seguros e bloqueia protocol-relative", () => {
    expect(isSafeLocalPath("/images/hero.webp")).toBe(true);
    expect(isSafeLocalPath("/uploads/avatar-1.png")).toBe(true);
    expect(isSafeLocalPath("//evil.com/x.png")).toBe(false);
    expect(isSafeLocalPath("/\\evil.com")).toBe(false);
    expect(isSafeLocalPath("https://example.com")).toBe(false);
  });

  it("aceita URL HTTP(S) ou caminho local seguro", () => {
    expect(isSafeUrlOrPath("/uploads/a.webp")).toBe(true);
    expect(isSafeUrlOrPath("https://images.sympla.com.br/a.jpg")).toBe(true);
    expect(isSafeUrlOrPath("javascript:alert(1)")).toBe(false);
    expect(isSafeUrlOrPath("//evil.com/a.jpg")).toBe(false);
  });

  it("normaliza e-mails removendo espaços e maiúsculas", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("sanitiza avatarUrl para uso seguro em CSS", () => {
    expect(safeAvatarUrl('/uploads/a"b.webp')).toBe("/uploads/ab.webp");
    expect(safeAvatarUrl("javascript:alert(1)")).toBeNull();
  });
});
