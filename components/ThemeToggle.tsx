"use client";

import { useEffect, useState } from "react";

/** Toggle manual claro/oscuro (persistido); el script del layout evita el flash. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("cc-theme", next);
    } catch {
      // sin localStorage el tema simplemente no persiste
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="hard-shadow-sm flex items-center gap-1.5 rounded-full border-[3px] border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">
        {theme === "light" ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}
