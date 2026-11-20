// views.js — renders the checklist, the guide pane, the roadmap, the missables
// page and the notes page from the trophy data. Everything here is built with
// DOM calls, never innerHTML from data, so a trophy name can never inject markup.

import { isSpoilerHidden, spoilerName, countByGrade } from './filters.js';

// Escape text for the few places a template string is used (static labels only;
// trophy text always goes through textContent).
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function gradeDot(grade) {
  const dot = el('span', `grade-dot grade-${grade}`);
  dot.title = grade;
  return dot;
}

function gradeWord(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// One checklist row: a checkbox, the official name and description, kind tags,
// and the missable flag. Story trophies under the spoiler setting show a
// placeholder name and no description until they are earned.
export function renderChecklist(listNode, trophies, state, callbacks) {
  listNode.replaceChildren();
  if (trophies.length === 0) {
    const empty = el('div', 'empty-state');
    const heading = el('h3', null, state.kind === 'online' ? 'No online trophies' : 'Nothing matches');
    const body = el('p', null, state.kind === 'online'
      ? 'All 55 trophies are offline and single-player — there is nothing to track here. Try the Activities or Story filter instead.'
      : 'No trophy matches this search and filter. Clear the search or pick another kind.');
    empty.append(heading, body);
    listNode.appendChild(empty);
    return;
  }
  for (const trophy of trophies) {
    const hidden = isSpoilerHidden(trophy, state.earned, state.settings.spoiler);
    const row = el('button', 'trophy-row' + (state.earned.has(trophy.id) ? ' earned' : '')
      + (state.selectedId === trophy.id ? ' selected' : ''));
    row.type = 'button';
    row.setAttribute('role', 'listitem');
    row.addEventListener('click', (event) => {
      if (event.target.tagName === 'INPUT') return;
      callbacks.onSelect(trophy.id);
    });

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : trophy.name} as earned`);
    box.addEventListener('change', () => callbacks.onToggle(trophy.id));
    row.appendChild(box);

    const middle = el('span');
    const name = el('span', 'trophy-name' + (state.earned.has(trophy.id) ? ' earned-name' : ''),
      hidden ? spoilerName(trophy) : trophy.name);
    middle.appendChild(name);
    if (!hidden) {
      middle.appendChild(el('span', 'trophy-desc', trophy.description));
    } else {
      middle.appendChild(el('span', 'trophy-desc', 'Hidden until earned — turn the spoiler setting off to reveal it, or earn it in the game.'));
    }
    const tags = el('span', 'trophy-tags');
    for (const kind of trophy.kind || []) {
      tags.appendChild(el('span', 'tag', kind));
    }
    if (trophy.missable) tags.appendChild(el('span', 'tag missable', 'Missable'));
    if (trophy.hidden) tags.appendChild(el('span', 'tag hidden-flag', 'Hidden on PSN'));
    if (trophy.target) tags.appendChild(el('span', 'tag', `Target: ${trophy.target.toLocaleString()}`));
    middle.appendChild(tags);
    row.appendChild(middle);

    const grade = el('span', 'grade-label');
    grade.append(gradeDot(trophy.grade), document.createTextNode(gradeWord(trophy.grade)));
    row.appendChild(grade);
    listNode.appendChild(row);
  }
}

// The guide pane for the selected trophy: official name, description and grade,
// the guide in our own words, its cited sources, and the earn toggle.
export function renderDetail(detailNode, trophy, state, callbacks) {
  detailNode.replaceChildren();
  if (!trophy) {
    detailNode.append(
      el('h2', null, 'Pick a trophy'),
      el('p', 'guide-text', 'Choose any trophy on the left to see its official description, its guide and the sources that guide drew on.'),
    );
    return;
  }
  const hidden = isSpoilerHidden(trophy, state.earned, state.settings.spoiler);
  const earned = state.earned.has(trophy.id);
  if (trophy.missable) {
    detailNode.appendChild(el('p', 'missable-banner',
      'Missable — the only trophy on this list that can be missed. Read the guide before Chapter 1 ends.'));
  }
  detailNode.appendChild(el('h2', null, hidden ? spoilerName(trophy) : trophy.name));
  const official = el('p', 'official');
  const grade = el('strong', null, gradeWord(trophy.grade));
  official.append(grade, document.createTextNode(hidden
    ? ' — its official description is hidden until you earn it.'
    : ` — “${trophy.description}”`));
  detailNode.appendChild(official);
  if (hidden) {
    detailNode.appendChild(el('p', 'spoiler-note',
      'The spoiler setting is on, so this story trophy stays hidden until you earn it. Turn it off in the toolbar above, or tick the trophy earned, to reveal its guide.'));
  } else {
    detailNode.appendChild(el('h3', null, 'Guide'));
    detailNode.appendChild(el('p', 'guide-text', trophy.guide));
    if (trophy.target) {
      detailNode.appendChild(el('p', 'target-line', `Target: ${trophy.target.toLocaleString()}`));
    }
    detailNode.appendChild(el('h3', null, 'Sources — where this guide drew on'));
    const sources = el('ul', 'sources');
    for (const source of trophy.sources || []) {
      const item = el('li');
      const link = el('a', null, source.name);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      item.appendChild(link);
      sources.appendChild(item);
    }
    detailNode.appendChild(sources);
    detailNode.appendChild(el('p', 'official',
      'Names, descriptions and grades are shown as PlayStation publishes them (Exophase and PSNProfiles). The guide above is written in our own words for this page.'));
  }
  const earnRow = el('div', 'earn-row');
  const earnBtn = el('button', earned ? 'earned-btn' : null, earned ? '✓ Earned — tap to unmark' : 'Mark as earned');
  earnBtn.type = 'button';
  earnBtn.addEventListener('click', () => callbacks.onToggle(trophy.id));
  earnRow.appendChild(earnBtn);
  detailNode.appendChild(earnRow);
}

// The platinum roadmap: three stages from the data file, each with the trophies
// that belong to it, struck through once earned.
export function renderRoadmap(roadmapNode, data, state) {
  roadmapNode.replaceChildren();
  for (const stage of data.roadmap || []) {
    const card = el('article', 'stage');
    card.appendChild(el('h2', null, stage.title));
    card.appendChild(el('p', 'stage-text', stage.text));
    const chips = el('div', 'stage-trophies');
    for (const trophy of (data.trophies || []).filter((t) => t.stage === stage.stage)) {
      const hidden = isSpoilerHidden(trophy, state.earned, state.settings.spoiler);
      chips.appendChild(el('span', 'stage-chip' + (state.earned.has(trophy.id) ? ' earned-chip' : ''),
        hidden ? spoilerName(trophy) : `${trophy.name} (${gradeWord(trophy.grade)})`));
    }
    card.appendChild(chips);
    roadmapNode.appendChild(card);
  }
}

// The missables page: the one possibly missable trophy in full, then the
// reassurance that everything else survives the story.
export function renderMissables(missablesNode, data, state) {
  missablesNode.replaceChildren();
  const missable = (data.trophies || []).filter((t) => t.missable);
  for (const trophy of missable) {
    const card = el('article', 'missable-card');
    card.appendChild(el('h2', null, `Potentially missable: ${trophy.name}`));
    card.appendChild(el('p', null, trophy.guide));
    card.appendChild(el('p', null,
      'Why it is the only one: every other trophy is either automatic in the story or still available in free-roam after the story. This one has a single moment in Chapter 1 that never comes back.'));
    missablesNode.appendChild(card);
  }
  const safe = el('article', 'safe-card');
  safe.appendChild(el('h2', null, 'Everything else is safe'));
  safe.appendChild(el('p', 'safe-text',
    'No other trophy can be missed. Quest givers who go quiet during the story — Kenton, for example — all come back, and every trophy-related quest stays available after the story in free-roam. Optional missions with an hourglass icon can expire, but none of them count toward a trophy, and the 100% checklist has far more optional missions than it needs.'));
  safe.appendChild(el('p', null,
    'The safe habits: keep a manual save at the start and end of each chapter (there is no mission replay), and do not use cheats — they disable trophies and saving.'));
  missablesNode.appendChild(safe);
}

// The notes page: how the guide was put together, what is still unconfirmed,
// and the full source list.
export function renderNotes(notesNode, data) {
  notesNode.replaceChildren();
  const facts = el('article', 'note-card');
  facts.appendChild(el('h2', null, 'The platinum in numbers'));
  const list = el('ul');
  const platinum = data.platinum || {};
  list.append(
    el('li', null, `Difficulty: ${platinum.difficulty || '4/10'} — the list is lenient, and there are no mission gold medals to chase.`),
    el('li', null, `Time: ${platinum.time || 'about 200 hours'} — 60–80 hours of story, about 100 hours of the 100% checklist, about 10 hours of cleanup.`),
    el('li', null, `Playthroughs: ${platinum.playthroughs || 1} — one is enough, and there is no New Game+.`),
    el('li', null, `Online trophies: ${platinum.online ?? 0} — every trophy is offline and single-player.`),
    el('li', null, `Missable: ${platinum.missable || 'potentially 1'}.`),
  );
  facts.appendChild(list);
  notesNode.appendChild(facts);

  const method = el('article', 'note-card');
  method.appendChild(el('h2', null, 'How this guide was written'));
  method.appendChild(el('p', 'note-text',
    'Trophy names, descriptions and grades are the official list as PlayStation publishes it, taken from Exophase and PSNProfiles, who agree on every entry. The guides are written in our own words for this page, drawing on the cited guides — mainly PowerPyx — and never copying their text. Where a method is still unconfirmed (Bad Luck, I Guess, and which exact animal unlocks Fair Game), the guide says so instead of inventing one.'));
  method.appendChild(el('p', 'note-text',
    'The roadmap and the missable flags are built from the official descriptions: which story chapters and missions, which collectibles and counts, in what order.'));
  notesNode.appendChild(method);

  const notesCard = el('article', 'note-card');
  notesCard.appendChild(el('h2', null, 'Worth knowing'));
  const notesList = el('ul');
  for (const note of data.notes || []) notesList.appendChild(el('li', null, note));
  notesCard.appendChild(notesList);
  notesNode.appendChild(notesCard);

  const sources = el('article', 'note-card');
  sources.appendChild(el('h2', null, 'Sources'));
  const sourceList = el('ul', 'sources');
  const seen = new Set();
  for (const trophy of data.trophies || []) {
    for (const source of trophy.sources || []) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      const item = el('li');
      const link = el('a', null, source.name);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      item.appendChild(link);
      sourceList.appendChild(item);
    }
  }
  sources.appendChild(sourceList);
  notesNode.appendChild(sources);
}

// The header progress bar and breakdown, from the earned set.
export function renderProgress(data, earned) {
  const total = data.trophies.length;
  const done = earned.size;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const breakdown = document.getElementById('progress-breakdown');
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${done} of ${total} earned — ${percent}%`;
  if (breakdown) {
    const counts = countByGrade(data.trophies, earned);
    breakdown.textContent = `Platinum ${counts.platinum[0]}/${counts.platinum[1]} · Gold ${counts.gold[0]}/${counts.gold[1]} · Silver ${counts.silver[0]}/${counts.silver[1]} · Bronze ${counts.bronze[0]}/${counts.bronze[1]}`;
  }
}
