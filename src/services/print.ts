/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Serviço de impressão unificado
 *
 * No app instalado (Electron) a impressão é feita pelo processo principal
 * (`webContents.print`), o que permite imprimir **sem abrir a caixa de
 * diálogo do Windows** — essencial no balcão, onde o caixa não pode
 * clicar em "Imprimir" a cada venda.
 *
 * Na PWA (navegador) não existe esse recurso: o fallback é o
 * `window.print()` do próprio navegador.
 */

import type { ImpressoraDoSistema } from '../types/electron';

export interface OpcoesImpressao {
  /** Impressora alvo. Vazio = impressora padrão do Windows. */
  printerName?: string;
  /** Impressão silenciosa (sem diálogo). Padrão: true. */
  silent?: boolean;
}

export interface ResultadoImpressao {
  ok: boolean;
  /** De onde saiu a impressão. */
  modo: 'electron' | 'navegador';
  erro?: string;
}

function api(): Window['electronAPI'] {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

/** O app está rodando no executável instalado (Electron)? */
export function rodandoNoElectron(): boolean {
  return Boolean(api()?.isElectron);
}

/**
 * Lista as impressoras do sistema (somente no app instalado).
 * Na PWA sempre devolve lista vazia.
 */
export async function listarImpressoras(): Promise<ImpressoraDoSistema[]> {
  const electron = api();
  if (!electron?.listPrinters) return [];
  try {
    const lista = await electron.listPrinters();
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * Imprime o comprovante.
 *
 * - App instalado: tenta imprimir direto na impressora configurada, sem
 *   diálogo. Se falhar (impressora offline, driver ausente), abre o
 *   diálogo do sistema para o caixa não perder o comprovante.
 * - Navegador (PWA): abre o diálogo de impressão do navegador.
 */
export async function imprimirComprovante(
  opcoes: OpcoesImpressao = {}
): Promise<ResultadoImpressao> {
  const silent = opcoes.silent !== false;
  const printerName = opcoes.printerName || '';
  const electron = api();

  if (electron?.printReceipt) {
    try {
      const resultado = await electron.printReceipt({ silent, printerName });
      if (resultado?.success) {
        return { ok: true, modo: 'electron' };
      }

      // Falhou: cai para o diálogo do sistema (impressora offline/ausente).
      window.print();
      return { ok: false, modo: 'navegador', erro: resultado?.error };
    } catch (erro) {
      window.print();
      return {
        ok: false,
        modo: 'navegador',
        erro: erro instanceof Error ? erro.message : String(erro),
      };
    }
  }

  // PWA / navegador: sem impressão silenciosa disponível.
  window.print();
  return { ok: true, modo: 'navegador' };
}
