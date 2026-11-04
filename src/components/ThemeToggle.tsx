// ─── Theme toggle ────────────────────────────────────────────────────────────
// One button used on the marketing nav, the auth screens and the app shell.
// Persists the choice through ThemeProvider (localStorage: "wab.theme").

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({
  className = "",
  size = 18,
  surface = true,
}: {
  className?: string;
  size?: number;
  /** Solid, bordered chip (on pages) vs bare icon (inside a nav bar). */
  surface?: boolean;
}) {
  const { actualTheme, setTheme } = useTheme();
  const isDark = actualTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        surface ? "size-9" : "size-8"
      } ${className}`}
      style={{
        color: "var(--color-text)",
        border: surface ? "1px solid var(--hairline)" : "1px solid transparent",
        background: surface ? "var(--surface)" : "transparent",
      }}
    >
      {isDark ? <Sun size={size} strokeWidth={1.75} /> : <Moon size={size} strokeWidth={1.75} />}
    </button>
  );
}
