/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Cabeçalho Principal e Navegação
 */

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  Boxes,
  Wallet,
  ShieldCheck,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { CashSession } from '../types/pdv';

export type NavTab = 'sales' | 'products' | 'stock' | 'cash' | 'backup' | 'settings' | 'tests';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeCashSession: CashSession | null;
  storeName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeCashSession,
  storeName,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; shortcut?: string }[] = [
    { id: 'sales', label: 'Vendas (PDV)', icon: <ShoppingCart className="w-4 h-4" />, shortcut: 'F1' },
    { id: 'products', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
    { id: 'stock', label: 'Estoque', icon: <Boxes className="w-4 h-4" /> },
    { id: 'cash', label: 'Caixa', icon: <Wallet className="w-4 h-4" /> },
    { id: 'backup', label: 'Backup e Dados', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'tests', label: 'Testes', icon: <FlaskConical className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-extrabold text-lg px-2.5 py-1 rounded shadow-sm tracking-wider">
            KAIRÓS
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>PDV 1.0</span>
              <span className="text-xs font-normal text-slate-300">· Windows Offline</span>
            </div>
            <div className="text-xs text-blue-300 font-medium truncate max-w-[260px]">
              {storeName || 'Comércio Local'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-black/25 text-blue-200 font-mono">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Status Zone */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Caixa Status */}
          <div
            onClick={() => onSelectTab('cash')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
              activeCashSession
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
            }`}
            title={activeCashSession ? 'Caixa aberto e operando' : 'Caixa fechado. Clique para abrir.'}
          >
            {activeCashSession ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{activeCashSession ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-xs tabular-nums bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
