"use client";
import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // a pessoa fechou a janela de compartilhar: não é erro
    }
  }
  return (
    <span className="share-wrap">
      <button
        type="button"
        className="circle-action"
        onClick={share}
        aria-label="Compartilhar"
      >
        <Share2 />
      </button>
      <span className={`share-toast${copied ? " visible" : ""}`} role="status">
        {copied ? "Link copiado!" : ""}
      </span>
    </span>
  );
}
