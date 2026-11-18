/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Processo Principal Electron (Desktop Windows)
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { LocalSQLiteManager } from './database';
import {
  apagarRegistro,
  avaliarLicenca,
  ativarLicenca,
  codigoEquipamento,
  decodificarLicenca,
  hashDispositivo,
  lerRegistro,
  type EstadoLicenca,
} from './license';

let mainWindow: BrowserWindow | null = null;
const dbManager = new LocalSQLiteManager();

/** Central Kairos - onde a ativacao e registrada e a revogacao e consultada. */
const CENTRAL_URL = process.env.KAIROS_CENTRAL_URL || 'https://central.fbautomacao.space';

function ehDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function caminhoApp(nome: string): string {
  return path.join(__dirname, '../dist', nome);
}

/** Carrega a tela de ativacao de licenca. */
function carregarAtivacao(): void {
  if (!mainWindow) return;
  if (ehDev()) {
    mainWindow.loadURL('http://localhost:3000/license.html');
  } else {
    mainWindow.loadFile(caminhoApp('license.html'));
  }
}

/** Carrega o app em si (so entra aqui com licenca valida). */
function carregarApp(): void {
  if (!mainWindow) return;
  if (ehDev()) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(caminhoApp('index.html'));
  }
}

interface RespostaRevogacao {
  revogada: boolean;
  motivo?: string;
  /** true quando nao deu para consultar (sem rede / Central fora). */
  offline?: boolean;
}

let cacheRevogacao: { resultado: RespostaRevogacao; em: number } | null = null;

/**
 * Codigo do computador no formato que o cliente ve na tela de ativacao
 * (EQP-XXXXXXXXXXXX). A Central guarda nesse formato, para dar para casar
 * a ativacao com o codigo que o cliente mandou no WhatsApp.
 */
function codigoCentral(registro: { dispositivo?: string } | null): string {
  const hash = registro?.dispositivo || hashDispositivo();
  return hash.startsWith('EQP-') ? hash : 'EQP-' + hash;
}

/**
 * Consulta a Central para saber se a licenca foi revogada.
 * Sem internet, o app continua funcionando (a assinatura local ja foi
 * conferida).
 */
async function consultarRevogacao(forcar = false): Promise<RespostaRevogacao> {
  const registro = lerRegistro(app.getPath('userData'));
  if (!registro) return { revogada: false };

  const agora = Date.now();
  if (!forcar && cacheRevogacao && agora - cacheRevogacao.em < 5 * 60 * 1000) {
    return cacheRevogacao.resultado;
  }

  let resultado: RespostaRevogacao;
  try {
    const resposta = await fetch(`${CENTRAL_URL}/api/public/license/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: registro.dados.id,
        codigo: registro.dados.codigo,
        dispositivo: codigoCentral(registro),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resposta.ok) {
      resultado = { revogada: false, offline: true };
    } else {
      const dados = (await resposta.json()) as { revogada?: boolean; motivo?: string };
      resultado = { revogada: Boolean(dados?.revogada), motivo: dados?.motivo };
    }
  } catch {
    // Sem rede: segue com a validacao local.
    resultado = { revogada: false, offline: true };
  }

  cacheRevogacao = { resultado, em: agora };
  return resultado;
}

/** Se a licenca estiver revogada, mostra o aviso e volta para a ativacao. */
async function bloquearSeRevogada(): Promise<boolean> {
  const revogacao = await consultarRevogacao();
  if (!revogacao.revogada) return false;

  await dialog.showMessageBox({
    type: 'warning',
    title: 'Licença suspensa',
    message: 'A licença deste Kairós PDV foi suspensa.',
    detail: revogacao.motivo || 'Fale com a Kairós para regularizar o seu acesso.',
    buttons: ['Entendi'],
  });
  carregarAtivacao();
  return true;
}

/** Resultado do registro de ativação na Central. */
interface ResultadoRegistro {
  registrado: boolean;
  /** A Central recusou (ativação em outro PC ou licença suspensa). */
  bloqueada: boolean;
  mensagem: string;
  /** Sem internet: o app segue valendo pela assinatura local. */
  offline: boolean;
}

/**
 * Registra a ativação na Central.
 *
 * A Central é quem garante ATIVAÇÃO ÚNICA: se a mesma licença já estiver
 * ativa em outro computador, ela devolve 409 e o app não abre - é o que
 * segura a revenda do executável.
 *
 * Sem internet a ativação local (assinatura) continua valendo: o PDV é
 * pensado para rodar offline. Nesse caso a Central é consultada de novo na
 * próxima vez que o app abrir com rede.
 */
async function registrarAtivacao(codigo: string): Promise<ResultadoRegistro> {
  const dados = decodificarLicenca(codigo);
  if (!dados) {
    return { registrado: false, bloqueada: false, mensagem: '', offline: false };
  }
  const registro = lerRegistro(app.getPath('userData'));
  try {
    const resposta = await fetch(`${CENTRAL_URL}/api/public/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: dados.id,
        codigo: dados.codigo,
        cliente: dados.cliente,
        dispositivo: codigoCentral(registro),
        versao: app.getVersion(),
        expiraEm: dados.expiraEm,
      }),
      signal: AbortSignal.timeout(8000),
    });

    let corpo: any = {};
    try {
      corpo = await resposta.json();
    } catch {
      corpo = {};
    }

    if (resposta.ok) {
      return { registrado: true, bloqueada: false, mensagem: '', offline: false };
    }
    if (resposta.status === 409 || resposta.status === 403) {
      return {
        registrado: false,
        bloqueada: true,
        mensagem:
          corpo?.error ||
          'A Central Kairós recusou esta ativação. Fale com a Kairós para regularizar.',
        offline: false,
      };
    }
    // Qualquer outra resposta da Central não impede o uso offline.
    return { registrado: false, bloqueada: false, mensagem: '', offline: false };
  } catch {
    // Sem rede: a ativação local já vale.
    return { registrado: false, bloqueada: false, mensagem: '', offline: true };
  }
}


/** Formato que o Electron devolve em getPrintersAsync(). */
interface ImpressoraInfo {
  name: string;
  displayName?: string;
  description?: string;
  isDefault?: boolean;
  status?: number;
}

/**
 * Ativação feita offline ainda não registrada na Central: quando o app abre
 * com internet, a Central é consultada e a ativação passa a valer lá também.
 * Se a Central recusar (já ativada em outro PC), o app volta para a tela de
 * ativação.
 */
async function registrarAtivacaoPendente(): Promise<void> {
  const registro = lerRegistro(app.getPath('userData'));
  if (!registro?.dados?.codigo) return;

  const resultado = await registrarAtivacao(registro.dados.codigo);
  if (!resultado.bloqueada) return;

  apagarRegistro(app.getPath('userData'));
  await dialog.showMessageBox({
    type: 'warning',
    title: 'Licença não liberada',
    message: 'Esta licença foi ativada em outro computador.',
    detail:
      resultado.mensagem ||
      'Fale com a Kairós para liberar o seu acesso neste computador.',
    buttons: ['Entendi'],
  });
  carregarAtivacao();
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

  // O portao de licenca fica no processo principal: sem licenca valida o
  // renderer do app nem chega a carregar.
  const estado = avaliarLicenca(app.getPath('userData'));
  if (!estado.valida) {
    carregarAtivacao();
  } else {
    carregarApp();
    void bloquearSeRevogada();
    void registrarAtivacaoPendente();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC de licenca
// ---------------------------------------------------------------------------

ipcMain.handle('license:status', async (): Promise<EstadoLicenca> => {
  const estado = avaliarLicenca(app.getPath('userData'));
  if (!estado.valida) return estado;

  const revogacao = await consultarRevogacao();
  if (revogacao.revogada) {
    return {
      ...estado,
      valida: false,
      ativada: true,
      motivo: revogacao.motivo || 'A licença foi suspensa pela Kairós.',
    };
  }
  return estado;
});

ipcMain.handle('license:equipment', async () => ({
  codigo: codigoEquipamento(),
}));

ipcMain.handle('license:activate', async (_event, codigo: string) => {
  const texto = String(codigo || '');
  const userData = app.getPath('userData');

  // 1) Valida a assinatura localmente (offline) e grava o vínculo com este PC.
  const resultado = ativarLicenca(userData, texto);
  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem, estado: resultado.estado };
  }

  // 2) A Central confirma a ativação ÚNICA. Se recusar, desfaz o registro
  //    local e o app NÃO abre — é o que impede a revenda.
  const central = await registrarAtivacao(texto);
  if (central.bloqueada) {
    apagarRegistro(userData);
    return {
      ok: false,
      mensagem: central.mensagem,
      estado: avaliarLicenca(userData),
    };
  }

  // 3) Abre o app.
  setTimeout(() => carregarApp(), 400);
  return {
    ok: true,
    mensagem: resultado.mensagem,
    estado: resultado.estado,
    offline: central.offline,
  };
});

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
