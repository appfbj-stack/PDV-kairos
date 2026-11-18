/**
 * Publica o build web (dist/) no branch `gh-pages`, que e o branch que o
 * GitHub Pages publica em https://appfbj-stack.github.io/PDV-kairos/
 *
 * Uso:
 *   npm run build
 *   npm run publicar:pwa
 *
 * Por que branch e nao GitHub Actions: o Actions da conta esta bloqueado
 * (os jobs falham em segundos sem rodar um unico passo). O branch gh-pages
 * funciona sem CI. Se o Actions voltar a funcionar, use o workflow
 * .github/workflows/deploy-pages.yml.
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  writeFileSync,
  existsSync,
  readdirSync,
  copyFileSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = process.env.GH_REPO || 'appfbj-stack/PDV-kairos';

if (!existsSync('dist')) {
  console.error('[pwa] a pasta dist/ nao existe. Rode "npm run build" antes.');
  process.exit(1);
}

/**
 * Mantem os arquivos antigos do branch gh-pages no novo publish.
 *
 * O HTML tem hash no nome do bundle (`assets/index-XXXX.js`). Um navegador
 * com o service worker antigo pode buscar um HTML guardado no cache que
 * aponta para um bundle que saiu do ar -> tela em branco. Publicando os
 * bundles antigos junto, esse HTML guardado ainda encontra o seu arquivo.
 */
function preservarAssetsAntigos() {
  const antigo = mkdtempSync(join(tmpdir(), 'kairos-pdv-anterior-'));
  try {
    execSync(
      `git clone --quiet --depth 1 --branch gh-pages https://github.com/${repo}.git "${antigo}"`,
      { stdio: 'ignore' }
    );
  } catch {
    console.log('[pwa] branch gh-pages ainda nao existe (primeiro publish).');
    return;
  }

  let copiados = 0;
  for (const pasta of ['assets', 'icons']) {
    const origem = join(antigo, pasta);
    if (!existsSync(origem)) continue;
    const destino = join('dist', pasta);
    if (!existsSync(destino)) cpSync(origem, destino, { recursive: true });
    for (const arquivo of readdirSync(origem)) {
      const de = join(origem, arquivo);
      const para = join(destino, arquivo);
      if (!existsSync(para)) {
        copyFileSync(de, para);
        copiados++;
      }
    }
  }
  console.log(`[pwa] ${copiados} arquivo(s) antigo(s) preservados no publish.`);
}

preservarAssetsAntigos();

// A tela de ativacao e so do aplicativo instalado (o portao esta no
// processo principal do Electron). Nao faz sentido publicar na web.
const licenseHtml = join('dist', 'license.html');
if (existsSync(licenseHtml)) {
  unlinkSync(licenseHtml);
  console.log('[pwa] license.html removido do build web.');
}

const tmp = mkdtempSync(join(tmpdir(), 'kairos-pdv-pages-'));
cpSync('dist', tmp, { recursive: true });
writeFileSync(join(tmp, '.nojekyll'), '');
writeFileSync(join(tmp, '.gitattributes'), '* text=auto eol=lf\n');

const git = (cmd) => execSync(cmd, { cwd: tmp, stdio: 'inherit' });

git('git init -q');
git('git checkout -q -b gh-pages');
git('git config user.email "bot@fbautomacao.space"');
git('git config user.name "Kairos Bot"');
git('git config core.autocrlf false');
git('git add -A');
git('git commit -q -m "build: publica o PWA do Kairos PDV"');
git(`git push -q --force https://github.com/${repo}.git gh-pages:gh-pages`);

console.log(`[pwa] publicado em https://appfbj-stack.github.io/PDV-kairos/`);
