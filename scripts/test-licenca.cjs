/**
 * Teste da camada de licenca do Kairós PDV.
 *   node scripts/test-licenca.cjs
 *
 * Compila electron/license.ts sozinho (esbuild) e testa a camada, para nao
 * depender de nenhum arquivo gerado na mao.
 */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const raiz = path.join(__dirname, '..');
const bundle = path.join(os.tmpdir(), `kairos-lic-test-${process.pid}.cjs`);

require('node:child_process').execFileSync(
  process.execPath,
  [
    path.join(raiz, 'node_modules', 'esbuild', 'bin', 'esbuild'),
    path.join(raiz, 'electron', 'license.ts'),
    '--bundle',
    '--platform=node',
    '--target=node22',
    '--format=cjs',
    '--external:electron',
    `--outfile=${bundle}`,
  ],
  { stdio: 'inherit' }
);

const lic = require(bundle);

let passou = 0;
let falhou = 0;

function ok(nome, condicao, detalhe) {
  if (condicao) {
    passou++;
    console.log('  ok   ' + nome);
  } else {
    falhou++;
    console.log('  FALHA ' + nome + (detalhe ? ' -> ' + detalhe : ''));
  }
}

const CHAVE =
  'KAIROS-040M6K2960R32V6Y3R095Q3TQ3GRQKX9VS6934076RT4989R213W64KVZ4360MH7890HKQNYWEGMBGHDGJD1YG9YVAB7TYMBDJGEHJGRBDYWDYP13Y42T7Z61R';

console.log('\n[1] decodificacao e assinatura');
const dados = lic.decodificarLicenca(CHAVE);
ok('decodifica a chave valida', !!dados);
ok('cliente correto', dados && dados.cliente === 'CLI001', dados && dados.cliente);
ok('tem validade', dados && dados.expiraEm > 0);
ok('nao expirou', dados && !lic.expirada(dados));
ok('id do licence existe', dados && /^[0-9a-f]{16}$/.test(dados.id), dados && dados.id);

console.log('\n[2] chave adulterada');
ok('recusa chave com 1 caractere trocado', !lic.decodificarLicenca(CHAVE.slice(0, -1) + 'X'));
ok('recusa chave truncada', !lic.decodificarLicenca(CHAVE.slice(0, 40)));
ok('recusa chave vazia', !lic.decodificarLicenca(''));
ok('recusa lixo', !lic.decodificarLicenca('KAIROS-abcdefghijklmnop'));
const adulterada = lic.normalizarCodigo(CHAVE).slice(0, -2) + 'AA';
ok('recusa assinatura manipulada', !lic.decodificarLicenca(adulterada));

console.log('\n[3] normalizacao');
ok('remove prefixo e tracos', lic.normalizarCodigo(CHAVE) === lic.normalizarCodigo('kairos ' + CHAVE.replace('KAIROS-', '').toLowerCase()));
ok('ignora espacos', lic.normalizarCodigo('KAIROS ABCD EF') === 'ABCDEF');

console.log('\n[4] fingerprint do computador');
const equip = lic.codigoEquipamento();
ok('codigo de equipamento no formato EQP-', /^EQP-[0-9A-F]{12}$/.test(equip), equip);
ok('fingerprint estavel', lic.hashDispositivo() === lic.hashDispositivo());

console.log('\n[5] ativacao');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-lic-'));
const r1 = lic.ativarLicenca(dir, CHAVE);
ok('ativa com a chave valida', r1.ok, r1.mensagem);
ok('estado valido depois de ativar', r1.estado.valida);

const e1 = lic.avaliarLicenca(dir);
ok('reabre com licenca valida', e1.valida, e1.motivo);
ok('estado guardou o cliente', e1.cliente === 'CLI001');

console.log('\n[6] copia para outro computador');
const arquivo = lic.caminhoRegistro(dir);
const registro = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
registro.dispositivo = 'AABBCCDDEEFF';
fs.writeFileSync(arquivo, JSON.stringify(registro));
const e2 = lic.avaliarLicenca(dir);
ok('bloqueialicencia copiada para outro PC', !e2.valida, e2.motivo);

console.log('\n[7] chave de outro cliente nao entra');
const r2 = lic.ativarLicenca(dir, 'KAIROS-NAOEXISTE');
ok('recusa chave invalida', !r2.ok, r2.mensagem);

console.log('\n[8] arquivo adulterado');
const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-lic-'));
lic.ativarLicenca(dir2, CHAVE);
const arq2 = lic.caminhoRegistro(dir2);
const reg2 = JSON.parse(fs.readFileSync(arq2, 'utf8'));
reg2.dados.codigo = reg2.dados.codigo.slice(0, -2) + 'ZZ';
fs.writeFileSync(arq2, JSON.stringify(reg2));
const e3 = lic.avaliarLicenca(dir2);
ok('bloqueia registro adulterado', !e3.valida, e3.motivo);

console.log('\n[9] sem licenca');
const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-lic-'));
const e4 = lic.avaliarLicenca(dir3);
ok('sem licenca = bloqueado', !e4.valida && !e4.ativada, e4.motivo);

fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(dir2, { recursive: true, force: true });
fs.rmSync(dir3, { recursive: true, force: true });

console.log('\n' + passou + ' ok, ' + falhou + ' falha(s)\n');
process.exit(falhou === 0 ? 0 : 1);
