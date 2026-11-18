/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Licenciamento offline (Ed25519) + vínculo com o computador
 *
 * COMO FUNCIONA
 *   1. A Kairós emite uma chave assinada (Ed25519). A chave privada fica
 *      com o Kairós; dentro do app so existe a chave PÚBLICA.
 *   2. No primeiro uso o app pede a chave. Se a assinatura não bater, o app
 *      NÃO ABRE - nem carrega o renderer, porque o portão está no processo
 *      principal.
 *   3. A licença fica gravada em license.json (userData) junto com o
 *      fingerprint do computador. Copiar o .exe (ou a pasta inteira) para
 *      outro PC não funciona: o fingerprint não bate.
 *   4. Opcionalmente a Central Kairos registra a ativação, para o Kairós
 *      ver quem ativou e poder revogar.
 *
 * IMPORTANTE: verificacao local e offline nao impede alguem com
 * conhecimento tecnico de patchar o binario. O objetivo e bloquear a
 * revenda por quem simplesmente copia o executavel.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Chave publica da Kairós (base64 do raw de 32 bytes). */
const LICENCA_CHAVE_PUBLICA = '4l2ujbd4H8dG31ZORdDea13R8aXf16PA8SBw0VWgtK4=';

const ASSINATURA_BYTES = 64;
const PREFIJO = 'KAIROS-';

export interface DadosLicenca {
  /** Codigo normalizado (sem(prefixo, sem tracos). */
  codigo: string;
  cliente: string;
  /** Unix (segundos). 0 = sem expiracao. */
  expiraEm: number;
  /** Hash do dispositivo ao qual a licenca foi emitida. Vazio = livre. */
  dispositivo: string;
  /** Id unico da licenca (hash da assinatura). */
  id: string;
}

export interface RegistroLicenca {
  dados: DadosLicenca;
  /** Fingerprint do PC onde a licenca foi ativada. */
  dispositivo: string;
  ativadoEm: string;
}

export interface EstadoLicenca {
  ativada: boolean;
  valida: boolean;
  cliente: string;
  expiraEm: number;
  expirada: boolean;
  codigo: string;
  /** Codigo curto do equipamento (para emitir licenca presa a maquina). */
  codigoEquipamento: string;
  motivo: string;
}

function chavePublica(): crypto.KeyObject {
  // SPKI DER do Ed25519 = prefixo fixo de 12 bytes + a chave raw de 32 bytes.
  const raw = Buffer.from(LICENCA_CHAVE_PUBLICA, 'base64');
  const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

// Base32 Crockford: apenas A-Z e 0-9 (sem I, L, O, U). Permite formatar a
// chave com tracos/espacos - a normalizacao limpa tudo antes de decodificar.
const ALFA_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function base32ParaBuffer(texto: string): Buffer {
  const limpo = texto
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-Z]/g, '');

  const saida: number[] = [];
  let bits = 0;
  let valor = 0;

  for (const char of limpo) {
    const indice = ALFA_BASE32.indexOf(char);
    if (indice < 0) throw new Error('caractere invalido na chave');
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      saida.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
    valor &= (1 << bits) - 1;
  }

  return Buffer.from(saida);
}

/** Remove prefixo, tracos e espacos; leave maiusculas para facilitar colar. */
export function normalizarCodigo(codigo: string): string {
  return String(codigo || '')
    .trim()
    .toUpperCase()
    .replace(/^KAIROS[-_]?/, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** MachineGuid do Windows (estavel por maquina). */
export function lerMachineGuid(): string {
  try {
    const saida = execFileSync(
      'reg',
      ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
      { encoding: 'utf8', windowsHide: true }
    );
    const achado = saida.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/i);
    if (achado) return achado[1].trim().toLowerCase();
  } catch {
    // segue para o fallback
  }
  // Fallback: fingerprint derivado do host (menos forte, mas ainda estavel).
  return `host-${os.hostname()}-${os.cpus()[0]?.model || 'cpu'}-${os.totalmem()}`
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/** Hash do computador: 6 bytes em hex. Formato exibido: EQP-XXXXXXXXXXXX */
export function hashDispositivo(machineGuid?: string): string {
  const base = (machineGuid || lerMachineGuid()).trim().toLowerCase();
  return crypto.createHash('sha256').update(base).digest().subarray(0, 6).toString('hex').toUpperCase();
}

export function codigoEquipamento(): string {
  return 'EQP-' + hashDispositivo();
}

/** Decodifica e confere a assinatura. Retorna null se a chave for invalida. */
export function decodificarLicenca(codigoInformado: string): DadosLicenca | null {
  const limpo = normalizarCodigo(codigoInformado);
  if (!limpo) return null;

  let bruto: Buffer;
  try {
    bruto = base32ParaBuffer(limpo);
  } catch {
    return null;
  }
  if (bruto.length <= ASSINATURA_BYTES) return null;

  const payload = bruto.subarray(0, bruto.length - ASSINATURA_BYTES);
  const assinatura = bruto.subarray(bruto.length - ASSINATURA_BYTES);

  let valida = false;
  try {
    valida = crypto.verify(null, payload, chavePublica(), assinatura);
  } catch {
    valida = false;
  }
  if (!valida) return null;

  if (payload[0] !== 1) return null;
  const flags = payload[1];
  let cursor = 2;

  const cliente = payload.subarray(cursor, cursor + 6).toString('ascii');
  cursor += 6;

  let expiraEm = 0;
  if (flags & 1) {
    expiraEm = payload.readUInt32BE(cursor);
    cursor += 4;
  }

  let dispositivo = '';
  if (flags & 2) {
    dispositivo = payload.subarray(cursor, cursor + 6).toString('hex').toUpperCase();
    cursor += 6;
  }

  const id = crypto.createHash('sha256').update(assinatura).digest('hex').slice(0, 16);

  return { codigo: limpo, cliente, expiraEm, dispositivo, id };
}

export function expirada(dados: DadosLicenca): boolean {
  return dados.expiraEm > 0 && Date.now() / 1000 > dados.expiraEm;
}

// ---------------------------------------------------------------------------
// Persistencia local (fora do alcance do renderer)
// ---------------------------------------------------------------------------

export function caminhoRegistro(userDataPath: string): string {
  return path.join(userDataPath, 'license.json');
}

export function lerRegistro(userDataPath: string): RegistroLicenca | null {
  try {
    const arquivo = caminhoRegistro(userDataPath);
    if (!fs.existsSync(arquivo)) return null;
    const bruto = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (!bruto || typeof bruto !== 'object') return null;
    if (!bruto.dados || !bruto.dispositivo) return null;
    return bruto as RegistroLicenca;
  } catch {
    return null;
  }
}

export function gravarRegistro(userDataPath: string, registro: RegistroLicenca): void {
  const arquivo = caminhoRegistro(userDataPath);
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(registro, null, 2), 'utf8');
}

export function apagarRegistro(userDataPath: string): void {
  try {
    const arquivo = caminhoRegistro(userDataPath);
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
  } catch {
    // ignora
  }
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

/**
 * Avalia a licenca guardada no disco.
 * `revogada` vem da Central (quando ha internet e a Central responde).
 */
export function avaliarLicenca(
  userDataPath: string,
  revogada?: boolean
): EstadoLicenca {
  const base: EstadoLicenca = {
    ativada: false,
    valida: false,
    cliente: '',
    expiraEm: 0,
    expirada: false,
    codigo: '',
    codigoEquipamento: codigoEquipamento(),
    motivo: '',
  };

  const registro = lerRegistro(userDataPath);
  if (!registro) {
    base.motivo = 'Nenhuma licenca ativada neste computador.';
    return base;
  }

  base.ativada = true;
  base.codigo = registro.dados?.codigo || '';

  const dados = decodificarLicenca(registro.dados?.codigo || '');
  if (!dados) {
    base.motivo = 'A licenca gravada e invalida ou foi adulterada.';
    return base;
  }

  base.cliente = dados.cliente;
  base.expiraEm = dados.expiraEm;
  base.expirada = expirada(dados);

  if (base.expirada) {
    base.motivo = `A licenca do cliente ${dados.cliente} expirou.`;
    return base;
  }

  if (revogada) {
    base.motivo = `A licenca do cliente ${dados.cliente} foi revogada pela Kairós.`;
    return base;
  }

  // Vinculo com o computador.
  const maquinaAtual = hashDispositivo();
  if (dados.dispositivo) {
    if (dados.dispositivo !== maquinaAtual) {
      base.motivo = 'Esta licenca foi emitida para outro computador.';
      return base;
    }
  } else if (registro.dispositivo !== maquinaAtual) {
    base.motivo = 'Esta licenca ja foi ativada em outro computador.';
    return base;
  }

  base.valida = true;
  base.motivo = 'Licenca valida.';
  return base;
}

/**
 * Ativa uma chave. Grava o vinculo com este computador.
 */
export function ativarLicenca(
  userDataPath: string,
  codigoInformado: string
): { ok: boolean; mensagem: string; estado: EstadoLicenca } {
  const dados = decodificarLicenca(codigoInformado);
  if (!dados) {
    return {
      ok: false,
      mensagem: 'Chave invalida. Confira se colou a chave completa.',
      estado: avaliarLicenca(userDataPath),
    };
  }

  if (expirada(dados)) {
    return {
      ok: false,
      mensagem: 'Esta licenca expirou.',
      estado: avaliarLicenca(userDataPath),
    };
  }

  const maquinaAtual = hashDispositivo();
  if (dados.dispositivo && dados.dispositivo !== maquinaAtual) {
    return {
      ok: false,
      mensagem: 'Esta chave foi emitida para outro computador.',
      estado: avaliarLicenca(userDataPath),
    };
  }

  gravarRegistro(userDataPath, {
    dados,
    dispositivo: maquinaAtual,
    ativadoEm: new Date().toISOString(),
  });

  return {
    ok: true,
    mensagem: `Licenca ativada para o cliente ${dados.cliente}.`,
    estado: avaliarLicenca(userDataPath),
  };
}
