"use client";

import { useState } from "react";

export function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard no disponible: el código queda visible igualmente
        }
      }}
      className="figures rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent hover:text-accent"
      title="Copiar código de invitación"
    >
      {copied ? "¡Copiado!" : `Invitación: ${code}`}
    </button>
  );
}
