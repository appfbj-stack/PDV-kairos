/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Backup, Restauração Segura e Integridade de Dados
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  FileCode,
  HardDrive,
} from 'lucide-react';
import { Settings, BackupData, IntegrityCheckResult } from '../types/pdv';
import { db } from '../services/db';
import { formatDateTime } from '../services/formatters';

interface BackupScreenProps {
  settings: Settings;
  onRefreshAll?: () => void;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({ settings, onRefreshAll }) => {
  const [lastBackup, setLastBackup] = useState<string>(settings.last_backup_at || '');
  const [backupDir, setBackupDir] = useState<string>(settings.backup_dir || 'C:\\KairosPDV\\Backups');
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setLastBackup(settings.last_backup_at || '');
  }, [settings.last_backup_at]);

  // Criação de Backup
  const handleCreateBackup = async () => {
    try {
      const backupData = await db.createBackup();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `kairos_pdv_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.kpdv`;
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      setLastBackup(now);
      setStatusMsg({
        text: `Backup gerado com sucesso! Arquivo "${filename}" baixado. Guarde uma cópia em pendrive ou nuvem externa.`,
        type: 'success',
      });
    } catch (err) {
      setStatusMsg({ text: 'Falha ao gerar backup: ' + (err as Error).message, type: 'error' });
    }
  };

  // Exportação de dump SQL compatível com SQLite (.sql)
  const handleExportSQLite = async () => {
    try {
      const sqlDump = await db.generateSQLiteDump();
      const blob = new Blob([sqlDump], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `kairos_pdv_sqlite_dump_${new Date().toISOString().slice(0, 10)}.sql`;
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setStatusMsg({
        text: `Script SQL SQLite gerado com sucesso! Arquivo "${filename}" pode ser aberto em qualquer visualizador SQLite.`,
        type: 'success',
      });
    } catch (err) {
      setStatusMsg({ text: 'Falha ao exportar SQL: ' + (err as Error).message, type: 'error' });
    }
  };

  // Restauração de Backup com Validação e Confirmação
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('ATENÇÃO: A restauração substituirá os dados atuais pelo conteúdo do backup. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed: BackupData = JSON.parse(text);

        await db.restoreBackup(parsed);
        setStatusMsg({
          text: `Backup restaurado com sucesso! Todas as tabelas e estoques foram sincronizados.`,
          type: 'success',
        });
        if (onRefreshAll) onRefreshAll();
      } catch (err) {
        setStatusMsg({ text: 'Erro ao restaurar backup: ' + (err as Error).message, type: 'error' });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Verificação de Integridade do Banco (PRAGMA integrity_check)
  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true);
    try {
      const res = await db.checkDatabaseIntegrity();
      setIntegrityResult(res);
      if (res.valid) {
        setStatusMsg({
          text: 'Banco de dados 100% íntegro! Nenhuma divergência de chaves estrangeiras ou cálculos encontrada.',
          type: 'success',
        });
      } else {
        setStatusMsg({
          text: `Atenção: ${res.errors.length} inconsistência(s) encontrada(s). Verifique os detalhes abaixo.`,
          type: 'error',
        });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erro ao verificar integridade: ' + (err as Error).message, type: 'error' });
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  // Atualizar diretório de backup
  const handleSaveBackupDir = async () => {
    await db.updateSettings({ backup_dir: backupDir });
    setStatusMsg({ text: 'Caminho de backup atualizado com sucesso.', type: 'success' });
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Backup e Segurança de Dados</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Banco SQLite local no próprio computador · Sem dependência de nuvem ou mensalidades
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium">Último backup realizado:</span>
          <div className="font-bold text-slate-900 font-mono mt-0.5">
            {lastBackup ? formatDateTime(lastBackup) : 'Nenhum backup recente'}
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid of Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Criar Backup (.kpdv) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Criar Cópia de Segurança (.kpdv)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Exporta todas as tabelas (produtos, vendas, itens históricos, caixas e estoques) com verificação de integridade checksum.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateBackup}
            className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup Agora</span>
          </button>
        </div>

        {/* 2. Restaurar Backup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Restaurar Cópia de Segurança</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Recupera o sistema a partir de um arquivo .kpdv anterior. Cria automaticamente um ponto de restauração prévio para proteção contra falhas.
            </p>
          </div>

          <label className="mt-4 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-center">
            <Upload className="w-4 h-4" />
            <span>Selecionar Arquivo .kpdv</span>
            <input type="file" accept=".kpdv, .json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>

        {/* 3. Exportar Dump SQLite (.sql) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Exportar Banco SQLite (.sql)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Gera script completo de DDL e INSERT compatível com SQLite padrão para abertura no DB Browser for SQLite ou migração no Windows.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportSQLite}
            className="mt-4 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Gerar Script SQLite (.sql)</span>
          </button>
        </div>
      </div>

      {/* Integrity Check & Directory Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verificação de Integridade */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Diagnóstico de Integridade do Banco</h3>
            </div>
            <button
              type="button"
              onClick={handleCheckIntegrity}
              disabled={isCheckingIntegrity}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              {isCheckingIntegrity ? 'Verificando...' : 'Executar Diagnóstico'}
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Simula a instrução <code className="font-mono font-bold text-slate-800">PRAGMA integrity_check</code> do SQLite, validando chaves estrangeiras, itens órfãos e somas de totais.
          </p>

          {integrityResult && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Total de Produtos Verificados:</span>
                <span className="font-mono font-bold text-slate-900">{integrityResult.totalProducts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total de Vendas Registradas:</span>
                <span className="font-mono font-bold text-slate-900">{integrityResult.totalSales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total de Itens de Vendas:</span>
                <span className="font-mono font-bold text-slate-900">{integrityResult.totalSaleItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rastreabilidade de Movimentações:</span>
                <span className="font-mono font-bold text-slate-900">{integrityResult.totalMovements}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                <span>Resultado do Teste:</span>
                <span className={integrityResult.valid ? 'text-emerald-700' : 'text-rose-700'}>
                  {integrityResult.valid ? 'Aprovado sem Erros' : `${integrityResult.errors.length} Falhas Detectadas`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pasta de Destino no Windows */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">Diretório de Armazenamento Local</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Pasta local padrão onde o aplicativo Electron no Windows realiza cópias automáticas periódicas.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={backupDir}
                onChange={(e) => setBackupDir(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={handleSaveBackupDir}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <HardDrive className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <strong>Recomendação de Segurança:</strong> Copie periodicamente o arquivo .kpdv gerado para um pendrive ou HD externo para proteger o comércio contra falhas físicas no computador.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
