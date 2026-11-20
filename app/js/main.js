// main.js — boots the Leonida Ledger: loads the trophy data, wires the tabs,
// the filters, the spoiler setting and the save actions, and keeps every view
// in step with the earned set.

import { loadProgress, saveProgress, toggleEarned, loadSettings, saveSettings, downloadExport, parseImportDocument } from './store.js';
import { filterTrophies, kindLabel } from './filters.js';
import { renderChecklist, renderDetail, renderRoadmap, renderMissables, renderNotes, renderProgress } from './views.js';

const DATA_URL = 'data/trophies.json';

// The app's state: the data, the earned set, the filters, and the selected trophy.
const state = {
  data: null,
  earned: loadProgress(),
  settings: loadSettings(),
  kind: 'all',
  query: '',
  earnedOnly: false,
  selectedId: null,
  tab: 'checklist',
};

function $(id) {
  return document.getElementById(id);
}

// Re-render everything that depends on the earned set or the filters.
function renderAll() {
  if (!state.data) return;
  renderProgress(state.data, state.earned);
  const visible = filterTrophies(state.data.trophies, state);
  renderChecklist($('trophy-list'), visible, state, {
    onSelect: selectTrophy,
    onToggle: toggleTrophy,
  });
  const selected = state.data.trophies.find((t) => t.id === state.selectedId) || null;
  renderDetail($('detail'), selected, state, { onToggle: toggleTrophy });
  renderRoadmap($('roadmap'), state.data, state);
  renderMissables($('missables'), state.data, state);
  renderNotes($('notes'), state.data);
  document.querySelectorAll('#kind-filters .chip').forEach((chip) => {
    chip.textContent = kindLabel(chip.dataset.kind, state.data.trophies);
    chip.classList.toggle('active', chip.dataset.kind === state.kind);
  });
}

function selectTrophy(id) {
  state.selectedId = id;
  renderAll();
  const selected = state.data.trophies.find((t) => t.id === id);
  if (selected) {
    const row = [...document.querySelectorAll('.trophy-row')].find(
      (r) => r.textContent.includes(selected.name),
    );
    if (row) row.scrollIntoView({ block: 'nearest' });
  }
}

function toggleTrophy(id) {
  toggleEarned(state.earned, id);
  $('save-note').textContent = `Progress saved in this browser — ${state.earned.size} of 55 earned.`;
  renderAll();
}

function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('#tabs .tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  for (const name of ['checklist', 'roadmap', 'missables', 'notes']) {
    $(`view-${name}`).hidden = name !== tab;
  }
}

function wireToolbar() {
  $('search').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderAll();
  });
  document.querySelectorAll('#kind-filters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.kind = chip.dataset.kind;
      renderAll();
    });
  });
  const spoilerToggle = $('spoiler-toggle');
  spoilerToggle.checked = state.settings.spoiler;
  spoilerToggle.addEventListener('change', () => {
    state.settings.spoiler = spoilerToggle.checked;
    saveSettings(state.settings);
    renderAll();
  });
  $('earned-only').addEventListener('change', (event) => {
    state.earnedOnly = event.target.checked;
    renderAll();
  });
  document.querySelectorAll('#tabs .tab').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
}

function wireSaveActions() {
  $('export-btn').addEventListener('click', () => {
    const count = downloadExport(state.earned, state.settings);
    $('save-note').textContent = `Exported ${count} earned ${count === 1 ? 'trophy' : 'trophies'} to leonida-ledger-progress.json.`;
  });
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { earned, settings } = parseImportDocument(String(reader.result));
        state.earned = earned;
        state.settings = settings;
        saveProgress(state.earned);
        saveSettings(state.settings);
        $('spoiler-toggle').checked = state.settings.spoiler;
        $('save-note').textContent = `Imported ${earned.size} earned ${earned.size === 1 ? 'trophy' : 'trophies'} from ${file.name}.`;
        renderAll();
      } catch (error) {
        $('save-note').textContent = `That file could not be imported: ${error.message}. Progress is unchanged.`;
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });
  $('reset-btn').addEventListener('click', () => {
    if (window.confirm('Clear every earned mark? This cannot be undone (unless you exported first).')) {
      state.earned = new Set();
      saveProgress(state.earned);
      $('save-note').textContent = 'Progress cleared. Nothing is earned yet.';
      renderAll();
    }
  });
}

// Deep links for sharing and for screenshots: ?tab=roadmap, ?select=28 and
// ?spoiler=on open the guide straight onto one view or one trophy.
function applyDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (['checklist', 'roadmap', 'missables', 'notes'].includes(tab)) switchTab(tab);
  if (params.get('spoiler') === 'on') {
    state.settings.spoiler = true;
    saveSettings(state.settings);
    $('spoiler-toggle').checked = true;
  }
  const select = Number(params.get('select'));
  if (Number.isInteger(select) && state.data.trophies.some((t) => t.id === select)) {
    state.selectedId = select;
  }
}

async function boot() {
  wireToolbar();
  wireSaveActions();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`could not load ${DATA_URL}: ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    $('trophy-list').textContent = `The trophy list could not be loaded (${error.message}). Check that data/trophies.json sits beside this page and reload.`;
    return;
  }
  if (!state.selectedId) state.selectedId = state.data.trophies[0].id;
  applyDeepLink();
  renderAll();
}

boot();
