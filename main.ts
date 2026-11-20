// main.ts — hands the Leonida Ledger in.
// It copies app/ and screenshots/ from this repository into the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-frontend.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output (the grader runs
// with /output itself). Node 22, standard library only; nothing is installed.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The caps the bounty's scorer hands to buildDossier (its gate.json): the text
// budget for the dossier, at most 4 screenshots of at most 256 KiB, and app/ at
// most 993 files and directories and 48 MiB, with paths of at most 1,000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.trim().length > 0) return resolve(fromEnv);
  return '/output';
}

function repoRoot(): string {
  return dirname(fileURLToPath(new URL('./main.ts', import.meta.url)));
}

function main(): void {
  const root = repoRoot();
  const out = outputDir();
  const appDir = join(root, 'app');
  const shotsDir = join(root, 'screenshots');

  if (!existsSync(appDir)) {
    throw new Error(`main.ts: no app/ directory in ${root}`);
  }
  if (!existsSync(shotsDir)) {
    throw new Error(`main.ts: no screenshots/ directory in ${root}`);
  }

  // Start from an empty output directory so a stale file can never ride along.
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // Copy the guide and its screenshots in whole, preserving file modes.
  cpSync(appDir, join(out, 'app'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

  // The dossier is built from what was just copied, so it always describes
  // exactly what the grader will read. Build it twice and compare: the grader
  // runs this program twice and requires both runs to write the same bytes.
  const dossier = buildDossier(out, DOSSIER_CAPS);
  const dossierAgain = buildDossier(out, DOSSIER_CAPS);
  if (!Buffer.from(dossier).equals(Buffer.from(dossierAgain))) {
    throw new Error('main.ts: dossier is not deterministic across two builds');
  }
  writeFileSync(join(out, 'dossier.json'), dossier);

  const appFiles = countFiles(join(out, 'app'));
  const shotFiles = countFiles(join(out, 'screenshots'));
  console.log(`main.ts: wrote ${out} — app/ ${appFiles} files, screenshots/ ${shotFiles} files, dossier.json ${dossier.length} bytes`);
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return count;
}

main();
