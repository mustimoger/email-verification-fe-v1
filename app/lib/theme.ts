export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

export const themeInitScript = `(function () {
  try {
    var storageKey = "${THEME_STORAGE_KEY}";
    var root = document.documentElement;
    var stored = null;

    try {
      stored = localStorage.getItem(storageKey);
    } catch (storageError) {
      console.warn("theme.storage_read_failed", storageError);
    }

    var pathname = typeof window !== "undefined" ? window.location.pathname : "";
    if (pathname && pathname.indexOf("/pricing/embed") === 0) {
      root.setAttribute("data-theme", "light");
      root.setAttribute("data-theme-preference", "light");
      root.setAttribute("data-theme-lock", "embed");
      root.style.colorScheme = "light";
      return;
    }

    var preference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    var prefersDark = false;
    if (
      preference === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia
    ) {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    var resolved =
      preference === "dark" || (preference === "system" && prefersDark)
        ? "dark"
        : "light";

    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-preference", preference);
  } catch (error) {
    console.warn("theme.init_failed", error);
  }
})();`;
