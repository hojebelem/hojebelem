export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

// em dev sem RESEND_API_KEY, o link sai no console do servidor para teste local
export const passwordResetEnabled =
  emailEnabled || process.env.NODE_ENV !== "production";
