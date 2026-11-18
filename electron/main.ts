/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Processo Principal Electron (Desktop Windows)
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { LocalSQLiteManager } from './database';

let mainWindow: BrowserWindow | null = null;
const dbManager = new LocalSQLiteManager();

/** Formato que o Electron devolve em getPrintersAsync(). */
interface ImpressoraInfo {
  name: string;
  displayName?: string;
  description?: string;
  isDefault?: boolean;
  status?: number;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 680,
    title: 'Kairós PDV 1.0 - Ponto de Venda',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Em desenvolvimento, carrega a URL do Vite (http://localhost:3000)
  // Em produção instalada, carrega os arquivos compilados em dist/index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configurações de Ciclo de Vida da Aplicação
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Versão do aplicativo
ipcMain.handle('app:version', () => app.getVersion());

// IPC: Diálogo para seleção de pasta de backup no Windows
ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Selecionar Pasta para Backups do Kairós PDV',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC: Impressão silenciosa ou direta em impressora térmica
ipcMain.handle('print:receipt', async (_event, options) => {
  if (!mainWindow) return { success: false, error: 'Janela não disponível' };

  return new Promise((resolve) => {
    // deviceName vazio = usa a impressora padrão do Windows.
    // Só enviamos o campo quando há impressora definida, para o Electron
    // não recusar a impressão.
    const opcoes: Record<string, unknown> = {
      silent: options?.silent || false,
      printBackground: true,
      margins: { marginType: 'none' },
    };
    if (options?.printerName) {
      opcoes.deviceName = options.printerName;
    }

    mainWindow?.webContents.print(opcoes, (success, failureReason) => {
      if (!success) {
        resolve({ success: false, error: failureReason });
      } else {
        resolve({ success: true });
      }
    });
  });
});

// IPC: Lista as impressoras instaladas no Windows (para escolher a térmica)
ipcMain.handle('print:printers', async () => {
  if (!mainWindow) return [];
  try {
    const wc = mainWindow.webContents as unknown as {
      getPrintersAsync?: () => Promise<ImpressoraInfo[]>;
      getPrinters?: () => Promise<ImpressoraInfo[]>;
    };
    // Electron >= 21 expoe getPrintersAsync(); versoes antigas, getPrinters().
    const listar = wc.getPrintersAsync ?? wc.getPrinters;
    if (!listar) return [];
    const impressoras = await listar.call(wc);
    return impressoras.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: Boolean(p.isDefault),
      status: Number(p.status ?? 0),
    }));
  } catch (err) {
    console.error('[print:printers] falha ao listar impressoras:', err);
    return [];
  }
});

// IPC: Salvar arquivo de backup no disco do Windows
ipcMain.handle('backup:create', async (_event, backupContent: string) => {
  if (!mainWindow) return { success: false };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar Cópia de Segurança do Kairós PDV',
    defaultPath: `kairos_pdv_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.kpdv`,
    filters: [{ name: 'Backup Kairós PDV', extensions: ['kpdv', 'json'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, backupContent, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// IPC: Carregar arquivo de backup para restauração
ipcMain.handle('backup:restore', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Cópia de Segurança para Restaurar',
    filters: [{ name: 'Backup Kairós PDV', extensions: ['kpdv', 'json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { content, filePath: result.filePaths[0] };
  } catch (err) {
    return { error: (err as Error).message };
  }
});
