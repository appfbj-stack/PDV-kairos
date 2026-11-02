/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Preload Script Seguro do Electron
 * Context Isolation: true / Node Integration: false
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expõe apenas APIs estritamente necessárias e sanitizadas ao renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  printReceipt: (options?: { silent?: boolean; printerName?: string }) =>
    ipcRenderer.invoke('print:receipt', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  dbQuery: (sql: string, params: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  dbTransaction: (queries: { sql: string; params: unknown[] }[]) =>
    ipcRenderer.invoke('db:transaction', queries),
  createBackupFile: (data: string) => ipcRenderer.invoke('backup:create', data),
  restoreBackupFile: () => ipcRenderer.invoke('backup:restore'),
});
