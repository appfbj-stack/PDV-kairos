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
import { cpSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = process.env.GH_REPO || 'appfbj-stack/PDV-kairos';

if (!existsSync('dist')) {
  console.error('[pwa] a pasta dist/ nao existe. Rode "npm run build" antes.');
  process.exit(1);
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
