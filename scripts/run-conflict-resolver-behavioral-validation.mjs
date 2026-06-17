#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'conflict-resolver-behavioral-'));
const outfile = join(tempDir, 'behavioral-validation.mjs');

try {
  await esbuild.build({
    entryPoints: ['scripts/conflict-resolver-fixtures/behavioral-validation.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': 'undefined',
      'import.meta.env.VITE_SUPABASE_URL': 'undefined',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': 'undefined',
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
      'import.meta.env.MODE': '"test"',
    },
  });
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
