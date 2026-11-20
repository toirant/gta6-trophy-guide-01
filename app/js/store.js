// store.js — saved progress for the Leonida Ledger.
// Progress lives in localStorage under one key, so the checklist survives reloads
// and works with the network off. Export writes a JSON file; import reads one back.

export const PROGRESS_KEY = 'leonida-ledger-progress-v1';
export const SETTINGS_KEY = 'leonida-ledger-settings-v1';
export const EXPORT_APP = 'leonida-ledger';

// Load the set of earned trophy ids (numbers). A corrupt or foreign value falls
// back to an empty set instead of breaking the page.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.earned)) return new Set();
    return new Set(parsed.earned.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

// Persist the earned set. Returns true when the write landed.
export function saveProgress(earned) {
  try {
    const payload = { app: EXPORT_APP, version: 1, earned: [...earned].sort((a, b) => a - b) };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

// Flip one trophy's earned state and save. Returns the new state (true = earned).
export function toggleEarned(earned, id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  saveProgress(earned);
  return earned.has(id);
}

// Settings are the spoiler toggle (and only the spoiler toggle for now).
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { spoiler: false };
    const parsed = JSON.parse(raw);
    return { spoiler: parsed.spoiler === true };
  } catch {
    return { spoiler: false };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ spoiler: settings.spoiler === true }));
    return true;
  } catch {
    return false;
  }
}

// Build the export document: the app tag, the earned ids and the spoiler setting.
export function buildExportDocument(earned, settings) {
  return {
    app: EXPORT_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    spoiler: settings.spoiler === true,
  };
}

// Read an imported document back into an earned set. Throws on bad input so the
// caller can tell the reader what went wrong instead of silently wiping progress.
export function parseImportDocument(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('not a JSON object');
  if (parsed.app !== EXPORT_APP) throw new Error('not a Leonida Ledger export');
  if (!Array.isArray(parsed.earned)) throw new Error('no earned list in the file');
  const earned = new Set(parsed.earned.filter((id) => Number.isInteger(id)));
  const settings = { spoiler: parsed.spoiler === true };
  return { earned, settings };
}

// Download the export document as a file in the browser.
export function downloadExport(earned, settings) {
  const doc = buildExportDocument(earned, settings);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-ledger-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return doc.earned.length;
}
