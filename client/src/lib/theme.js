const storageKey = 'brightloop-theme';
export function applyTheme(preference) { const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.dataset.theme = preference; localStorage.setItem(storageKey, preference); }
export function getTheme() { return localStorage.getItem(storageKey) || 'system'; }
