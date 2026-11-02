/** Limpa os artefatos de build (funciona no Windows e no Linux). */
import { rmSync } from 'node:fs';

const alvos = [
  'dist',
  'release',
  'electron/main.cjs',
  'electron/preload.cjs',
];

for (const alvo of alvos) {
  rmSync(alvo, { recursive: true, force: true });
  console.log(`[clean] removido: ${alvo}`);
}
