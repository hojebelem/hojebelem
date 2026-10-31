"use client";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function PasswordInput({
  autoComplete,
}: {
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <LockKeyhole />
      <input
        type={visible ? "text" : "password"}
        name="password"
        minLength={8}
        autoComplete={autoComplete}
        placeholder="Mínimo de 8 caracteres"
        required
      />
      <button
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
