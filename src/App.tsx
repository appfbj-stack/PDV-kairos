/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Ponto de Venda Simples para Windows
 * Versão: MVP 1.0 (R$ 100 Pagamento Único, Offline, Sem Nuvem, Banco Local)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, NavTab } from './components/Header';
import { SalesScreen } from './pages/SalesScreen';
import { ProductsScreen } from './pages/ProductsScreen';
import { StockScreen } from './pages/StockScreen';
import { CashScreen } from './pages/CashScreen';
import { BackupScreen } from './pages/BackupScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import { TestCenterScreen } from './pages/TestCenterScreen';
import { Settings, CashSession } from './types/pdv';
import { db } from './services/db';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('sales');
  const [settings, setSettings] = useState<Settings>({
    store_name: 'MERCEARIA & VARIEDADES CENTRAL',
    cnpj: '12.345.678/0001-90',
    address: 'Rua do Comércio, 150 - Centro',
    phone: '(11) 98765-4321',
    receipt_footer: 'Obrigado pela preferência! Volte sempre.',
    printer_width: '80mm',
    auto_print: true,
    backup_dir: 'C:\\KairosPDV\\Backups',
    allow_negative_stock: false,
    beep_sound: true,
    business_segment: 'geral',
    enable_scale_barcode: true,
    show_quick_items: true,
    enable_apparel_grid: false,
  });
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Inicializa banco de dados e carrega estado inicial
  const loadInitialData = useCallback(async () => {
    await db.init();
    const st = await db.getSettings();
    setSettings(st);
    const session = await db.getActiveCashSession();
    setActiveCashSession(session);
    setIsReady(true);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Tecla F1 para voltar rapidamente à tela de vendas
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('sales');
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-blue-600 font-extrabold text-2xl px-4 py-2 rounded shadow-lg tracking-wider">
            KAIRÓS PDV
          </div>
          <div className="text-sm text-slate-400">Carregando banco de dados local...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeCashSession={activeCashSession}
        storeName={settings.store_name}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {currentTab === 'sales' && (
          <SalesScreen settings={settings} onRefreshData={loadInitialData} />
        )}
        {currentTab === 'products' && <ProductsScreen />}
        {currentTab === 'stock' && (
          <StockScreen settings={settings} onUpdateSettings={(s) => setSettings((prev) => ({ ...prev, ...s }))} />
        )}
        {currentTab === 'cash' && (
          <CashScreen settings={settings} onSessionStatusChange={loadInitialData} />
        )}
        {currentTab === 'backup' && (
          <BackupScreen settings={settings} onRefreshAll={loadInitialData} />
        )}
        {currentTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={setSettings}
            onRefreshAll={loadInitialData}
          />
        )}
        {currentTab === 'tests' && <TestCenterScreen />}
      </main>

      {/* Bottom Sticky Shortcut Legend Bar (Clean anti-slop, natural Portuguese labels) */}
      <footer className="bg-slate-900 text-slate-400 text-[11px] py-1.5 px-4 border-t border-slate-800 shrink-0 hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span><strong className="text-white font-mono">F1</strong> Vendas</span>
          <span>·</span>
          <span><strong className="text-white font-mono">F2</strong> Localizar Produto</span>
          <span>·</span>
          <span><strong className="text-white font-mono">F3</strong> Cadastrar</span>
          <span>·</span>
          <span><strong className="text-white font-mono">F4</strong> Desconto</span>
          <span>·</span>
          <span><strong className="text-white font-mono">F5</strong> Finalizar Venda</span>
          <span>·</span>
          <span><strong className="text-white font-mono">F6</strong> Imprimir Última</span>
          <span>·</span>
          <span><strong className="text-white font-mono">ESC</strong> Cancelar</span>
          <span>·</span>
          <span><strong className="text-white font-mono">DEL</strong> Remover Item</span>
        </div>

        <div className="text-slate-500 shrink-0 font-medium">
          Kairós PDV 1.0 · Sem Mensalidade · 100% Offline
        </div>
      </footer>
    </div>
  );
}
