// filters.js — which trophies the checklist shows, and what the spoiler setting hides.
// A trophy's kind list comes from the data file; the spoiler rule only ever hides
// story trophies, and only until the reader has earned them.

export const KINDS = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];

// The label shown for each kind filter, with its count once the data is in.
export function kindLabel(kind, trophies) {
  if (kind === 'all') return `All ${trophies.length}`;
  if (kind === 'online') return 'Online';
  const count = trophies.filter((t) => (t.kind || []).includes(kind)).length;
  const word = kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${word} (${count})`;
}

// Filter the list by kind, search text and the earned-only switch. The online
// kind matches nothing on purpose: all 55 trophies are offline, and the empty
// state says so.
export function filterTrophies(trophies, state) {
  const query = (state.query || '').trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (state.earnedOnly && !state.earned.has(trophy.id)) return false;
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && !(trophy.kind || []).includes(state.kind)) return false;
    if (query) {
      const haystack = [trophy.name, trophy.description, trophy.guide || '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

// A story trophy is hidden by the spoiler setting until it is earned. Everything
// else is always shown: the setting guards story names, not the whole list. The
// platinum is the guide's headline, so it is never hidden by the setting.
export function isSpoilerHidden(trophy, earned, spoilerOn) {
  if (!spoilerOn) return false;
  if (earned.has(trophy.id)) return false;
  if (trophy.grade === 'platinum') return false;
  return (trophy.kind || []).includes('story');
}

// The placeholder text shown in place of a hidden story trophy's name.
export function spoilerName(trophy) {
  return `Hidden story trophy #${trophy.id}`;
}

// Counts of each grade in a list, for the progress breakdown.
export function countByGrade(trophies, earned) {
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const trophy of trophies) {
    const slot = counts[trophy.grade];
    if (!slot) continue;
    slot[1] += 1;
    if (earned.has(trophy.id)) slot[0] += 1;
  }
  return counts;
}
