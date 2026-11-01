"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "system" }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage and system preference on mount
  useEffect(() => {
    // Only access localStorage on client
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("auditx-theme") as Theme;
      if (stored) {
        setThemeState(stored);
      }
    }
    setMounted(true);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const root = window.document.documentElement;
    
    // Remove existing classes
    root.classList.remove("light", "dark");

    // Determine effective theme
    let newEffectiveTheme: "light" | "dark";
    if (theme === "system") {
      newEffectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      newEffectiveTheme = theme;
    }

    // Apply the class
    root.classList.add(newEffectiveTheme);
    setEffectiveTheme(newEffectiveTheme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
      setEffectiveTheme(systemTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auditx-theme", newTheme);
    }
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
