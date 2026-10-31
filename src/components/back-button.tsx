"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// volta para a página de onde a pessoa veio; se ela chegou por um link
// externo (ou abriu direto), vai para a lista de eventos
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="circle-action"
      aria-label="Voltar"
      onClick={() => {
        const cameFromSite = document.referrer.startsWith(location.origin);
        if (cameFromSite && window.history.length > 1) router.back();
        else router.push("/eventos");
      }}
    >
      <ArrowLeft />
    </button>
  );
}
