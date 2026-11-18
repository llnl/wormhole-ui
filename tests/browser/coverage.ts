import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Page } from '@playwright/test';
import {
  createCoverageMap,
  type CoverageMapData,
} from '@vitest/istanbul-lib-coverage';
import { create, createContext } from '@vitest/istanbul-lib-report';
import { convert } from 'ast-v8-to-istanbul';
import { parse, transformWithOxc } from 'vite';

type CoverageEntries = Awaited<ReturnType<Page['coverage']['stopJSCoverage']>>;
type SourceMap = Parameters<typeof convert>[0]['sourceMap'];

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REPORT_DIR = path.join(ROOT_DIR, 'coverage');
// Tests run in parallel workers, so each saves its results here and the
// global teardown merges them.
const RESULTS_DIR = path.join(REPORT_DIR, 'tmp');

const toIstanbul = (
  code: string,
  file: string,
  functions: CoverageEntries[number]['functions'],
  sourceMap?: SourceMap
): Promise<CoverageMapData> =>
  convert({
    code,
    ast: parse(file, code, { lang: 'js' }).then((result) => result.program),
    coverage: {
      // Relative paths in the source map are resolved against this.
      url: pathToFileURL(file).href,
      functions,
    },
    sourceMap,
    // Vite turns a default import of a CommonJS package (e.g. mithril) into an
    // extra `const` mapped onto the import line, which isn't real code.
    ignoreNode: (node) =>
      node.type === 'VariableDeclarator' &&
      node.init?.type === 'Identifier' &&
      node.init.name.startsWith('__vite__cjsImport'),
  });

export const clearCoverage = (): void => {
  rmSync(REPORT_DIR, { recursive: true, force: true });
};

export const saveCoverage = async (entries: CoverageEntries): Promise<void> => {
  const coverageMap = createCoverageMap();
  for (const entry of entries) {
    const { pathname } = new URL(entry.url);
    // Vite also serves src/styles/index.css as a JS module, so match on .ts.
    if (
      !pathname.startsWith('/src/') ||
      !pathname.endsWith('.ts') ||
      entry.source === undefined
    ) {
      continue;
    }
    coverageMap.merge(
      await toIstanbul(
        entry.source,
        path.join(ROOT_DIR, pathname),
        entry.functions
      )
    );
  }
  // Chromium only reports the page the test ends on, so code that ran on
  // earlier pages (e.g. before the redirect to the login page) isn't counted,
  // and this is empty when the test ends outside the app.
  if (coverageMap.files().length === 0) {
    return;
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    path.join(RESULTS_DIR, `${randomUUID()}.json`),
    JSON.stringify(coverageMap.toJSON())
  );
};

export const reportCoverage = async (): Promise<void> => {
  if (!existsSync(RESULTS_DIR)) {
    throw new Error('No coverage was collected.');
  }
  const coverageMap = createCoverageMap();
  for (const file of readdirSync(RESULTS_DIR)) {
    coverageMap.merge(
      JSON.parse(
        readFileSync(path.join(RESULTS_DIR, file), 'utf8')
      ) as CoverageMapData
    );
  }
  rmSync(RESULTS_DIR, { recursive: true });

  // V8 only reports modules a test loaded, so add the rest as never run.
  const loaded = new Set(coverageMap.files());
  for (const file of readdirSync(SRC_DIR, {
    recursive: true,
    encoding: 'utf8',
  })) {
    const filePath = path.join(SRC_DIR, file);
    if (
      !file.endsWith('.ts') ||
      file.endsWith('.d.ts') ||
      loaded.has(filePath)
    ) {
      continue;
    }
    const { code, map } = await transformWithOxc(
      readFileSync(filePath, 'utf8'),
      filePath,
      { sourcemap: true }
    );
    const neverRun = [
      {
        functionName: '',
        isBlockCoverage: true,
        ranges: [{ startOffset: 0, endOffset: code.length, count: 0 }],
      },
    ];
    coverageMap.merge(await toIstanbul(code, filePath, neverRun, map));
  }

  const context = createContext({
    dir: REPORT_DIR,
    coverageMap,
    defaultSummarizer: 'nested',
  });
  create('html', { skipEmpty: true }).execute(context);
  // CI's dot reporter hasn't ended its line of progress dots yet.
  console.log();
  // Don't truncate: CI logs aren't a terminal, so the width would default to 80
  // columns.
  create('text', { skipEmpty: true, maxCols: 0 }).execute(context);
};
