import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const RESET_TTL_MS = 30 * 60 * 1000;

type ResetPayload = {
  uid: string;
  exp: number;
  fp: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado.");
  return secret;
}

// Vincula o token ao hash atual: trocar a senha invalida links anteriores sem tabela extra
function passwordFingerprint(passwordHash: string | null) {
  return createHash("sha256")
    .update(passwordHash ?? "")
    .digest("hex")
    .slice(0, 16);
}

export function createResetToken(
  userId: string,
  passwordHash: string | null,
  now = Date.now(),
  secret = getSecret(),
) {
  const payload: ResetPayload = {
    uid: userId,
    exp: now + RESET_TTL_MS,
    fp: passwordFingerprint(passwordHash),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseResetToken(
  token: string,
  secret = getSecret(),
  now = Date.now(),
): ResetPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, sig] = parts;

  const expected = createHmac("sha256", secret).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<ResetPayload>;
    if (
      typeof parsed.uid !== "string" ||
      !parsed.uid ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp <= now ||
      typeof parsed.fp !== "string"
    ) {
      return null;
    }
    return { uid: parsed.uid, exp: parsed.exp, fp: parsed.fp };
  } catch {
    return null;
  }
}

export function verifyResetToken(
  token: string,
  user: { id: string; passwordHash: string | null },
  now = Date.now(),
  secret = getSecret(),
) {
  const parsed = parseResetToken(token, secret, now);
  if (!parsed || parsed.uid !== user.id) return false;
  return parsed.fp === passwordFingerprint(user.passwordHash);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Redefinir senha (${to}): ${resetUrl}`);
      return;
    }
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const from = process.env.EMAIL_FROM || "Hoje Belém <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Redefinir senha | Hoje Belém",
      text: `Você pediu para redefinir sua senha no Hoje Belém.\n\nAcesse o link abaixo (válido por 30 minutos):\n${resetUrl}\n\nSe não foi você, ignore este e-mail.`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail (${response.status}).`);
  }
}
