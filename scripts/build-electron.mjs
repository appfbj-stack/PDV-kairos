/**
 * Compila os arquivos TypeScript do Electron para CommonJS (.cjs).
 *
 * Por que .cjs e nao .js:
 *  - o package.json tem "type": "module", entao um .js seria tratado como ESM
 *    e o __dirname (usado no main.ts) nao existiria;
 *  - com sandbox: true, o preload do Electron SO aceita CommonJS.
 *
 * O bundle fica em electron/main.cjs e electron/preload.cjs, que sao os
 * arquivos listados no electron-builder.json (files).
 */
import esbuild from 'esbuild';

const comum = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'info',
};

await esbuild.build({
  ...comum,
  entryPoints: ['electron/main.ts'],
  outfile: 'electron/main.cjs',
});

await esbuild.build({
  ...comum,
  entryPoints: ['electron/preload.ts'],
  outfile: 'electron/preload.cjs',
});

console.log('[build-electron] main.cjs e preload.cjs gerados.');
