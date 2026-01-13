"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const isResolvedTheme = (value: string | null): value is ResolvedTheme =>
  value === "light" || value === "dark";

const readStoredPreference = (): ThemePreference | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
    if (stored) {
      console.warn("theme.storage_invalid", { stored });
    }
  } catch (error) {
    console.warn("theme.storage_read_failed", { error });
  }
  return null;
};

const writeStoredPreference = (preference: ThemePreference) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch (error) {
    console.warn("theme.storage_write_failed", { error });
  }
};

const readAttributePreference = (): ThemePreference | null => {
  if (typeof document === "undefined") return null;
  const attr = document.documentElement.getAttribute("data-theme-preference");
  return isThemePreference(attr) ? attr : null;
};

const readAttributeResolvedTheme = (): ResolvedTheme | null => {
  if (typeof document === "undefined") return null;
  const attr = document.documentElement.getAttribute("data-theme");
  return isResolvedTheme(attr) ? attr : null;
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    console.warn("theme.system_unavailable");
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyThemeAttributes = (resolved: ResolvedTheme, preference: ThemePreference) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-preference", preference);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    return readStoredPreference() ?? readAttributePreference() ?? "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") return "light";
    return readAttributeResolvedTheme() ?? getSystemTheme();
  });

  useEffect(() => {
    const nextResolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(nextResolved);
    applyThemeAttributes(nextResolved, theme);
    writeStoredPreference(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextResolved = media.matches ? "dark" : "light";
      setResolvedTheme(nextResolved);
      applyThemeAttributes(nextResolved, theme);
    };
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn("theme.context_missing");
    return {
      theme: "system" as ThemePreference,
      resolvedTheme: "light" as ResolvedTheme,
      setTheme: (next: ThemePreference) => {
        console.warn("theme.set_missing_provider", { next });
      },
    };
  }
  return context;
}
