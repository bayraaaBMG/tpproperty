  // ===== THEME (Light/Dark) =====
  // localStorage key/idiom matches every other persisted preference in this app (bairx*
  // prefix, raw try/catch, no shared storage wrapper — see js/favorites.js/my-listings.js).
  // The actual class-on-<html> flip for the very first paint already happened in the inline
  // <head> script (before this file even loads, to avoid a light->dark flash) — this file
  // is what keeps the toggle button in sync and handles the user actually clicking it.
  const THEME_KEY = 'bairxTheme';

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Гэрэл горим руу шилжих' : 'Харанхуй горим руу шилжих');
  }

  function toggleTheme() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next);
  }

  // Sync the button's aria-label to whatever the flash-prevention script already applied
  // (it can't set aria-label itself — the button doesn't exist yet that early in <head>).
  applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  // If the user never explicitly chose a theme, follow the OS setting live — a stored
  // preference (once the user actually toggles) always overrides this from then on.
  if (!getStoredTheme() && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }
