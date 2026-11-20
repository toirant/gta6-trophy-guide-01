[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/toirant/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/toirant/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Ledger — GTA VI Trophy Guide & Tracker

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of
Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze), built for the
make.fun bounty
[Build the best GTA 6 trophy guide](https://make.fun/bounty/gta6-trophy-guide-01).

## What it is

- **The official list, whole.** Every trophy with its official name, description
  and grade as PlayStation publishes them, in `app/data/trophies.json`.
- **A guide for each trophy, in our own words, with its sources cited beside
  it.** Names and descriptions are the official ones; the how-to is written
  fresh for this guide and names where each fact comes from (Exophase and
  PSNProfiles for the list and counts, PowerPyx for the walkthrough detail).
  Where a method is still unconfirmed, the guide says so instead of inventing one.
- **A roadmap to the platinum** in three steps — story (60–80 hours), the 100%
  checklist (about 100 hours), cleanup (about 10 hours) — about 200 hours in all.
- **Every missable trophy flagged.** There is one, and only potentially:
  **Positive Mental Attitude**, whose first meditation in Chapter 1 never comes
  back. Everything else is safe after the story.
- **A tracker.** A checklist saved in the browser (localStorage), with export to
  a file and import back, filters by kind (story, missable, collectibles,
  activities, online — all 55 are offline, so that filter is honestly empty),
  and a spoiler setting that hides story trophy names and descriptions until
  they are earned.

## Run it

Static files, no build step, no network. Serve `app/` with any static server
and open `index.html` in desktop Chrome:

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

## Hand it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `/output/dossier.json` with
`buildDossier` from `vendor/makefun-frontend.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the app in headless Chromium (see `shots.json`):
the cover shows the checklist with the missable trophy's guide open, then the
roadmap, the missables page, and the spoiler setting at work.

## License

MIT. See [LICENSE](LICENSE). An unofficial fan guide: no Rockstar logo,
artwork or game screenshots anywhere in it.
