/**
 * Tipagem da API exposta pelo preload do Electron (contextBridge).
 *
 * A API só existe quando o app roda no executável instalado. Na PWA
 * (navegador) o `window.electronAPI` é undefined e o app usa o
 * `window.print()` do navegador.
 */

export interface ImpressoraDoSistema {
  /** Nome interno da impressora (usado pelo Windows) */
  name: string;
  /** Nome amigável exibido para o lojista */
  displayName: string;
  /** Impressora padrão do sistema */
  isDefault: boolean;
  /** Status do driver (0 = ok) */
  status: number;
}

export interface ResultadoImpressao {
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  isElectron: true;
  getAppVersion(): Promise<string>;
  printReceipt(options?: { silent?: boolean; printerName?: string }): Promise<ResultadoImpressao>;
  listPrinters(): Promise<ImpressoraDoSistema[]>;
  selectDirectory(): Promise<string | null>;
  createBackupFile(data: string): Promise<{ success: boolean; filePath?: string; error?: string }>;
  restoreBackupFile(): Promise<{ success: boolean; data?: string; canceled?: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
