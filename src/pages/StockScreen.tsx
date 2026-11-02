/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Controle e Movimentação de Estoque
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  PlusCircle,
  Sliders,
  History,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
} from 'lucide-react';
import { Product, StockMovement, Settings } from '../types/pdv';
import { db } from '../services/db';
import { formatDateTime } from '../services/formatters';

interface StockScreenProps {
  settings: Settings;
  onUpdateSettings?: (newSettings: Partial<Settings>) => void;
}

export const StockScreen: React.FC<StockScreenProps> = ({ settings, onUpdateSettings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modais de movimentação
  const [entryModalProduct, setEntryModalProduct] = useState<Product | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);

  // Formulário Entrada de Mercadorias
  const [entryQty, setEntryQty] = useState('');
  const [entrySupplier, setEntrySupplier] = useState('');
  const [entryReason, setEntryReason] = useState('Compra de mercadorias / Reposição');

  // Formulário Ajuste Manual
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Inventário / Contagem');

  const loadData = useCallback(async () => {
    const prods = await db.getProducts();
    const movs = await db.getStockMovements();
    setProducts(prods);
    setMovements(movs);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtragem
  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (onlyLowStock && p.stock_quantity > p.minimum_stock) return false;
    return true;
  });

  const lowStockCount = products.filter((p) => p.active && p.stock_quantity <= p.minimum_stock).length;

  // Processa Entrada de Mercadorias
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryModalProduct) return;
    const qty = parseFloat(entryQty.replace(',', '.')) || 0;
    if (qty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    try {
      await db.addStockEntry(entryModalProduct.id, qty, entryReason, entrySupplier || 'NF/Fornecedor');
      setEntryModalProduct(null);
      setEntryQty('');
      setEntrySupplier('');
      loadData();
    } catch (err) {
      alert('Erro: ' + (err as Error).message);
    }
  };

  // Processa Ajuste Manual de Estoque
  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    const newQty = parseFloat(adjustQty.replace(',', '.'));
    if (isNaN(newQty)) {
      alert('Informe uma quantidade válida.');
      return;
    }

    try {
      await db.adjustStock(adjustModalProduct.id, newQty, adjustReason);
      setAdjustModalProduct(null);
      setAdjustQty('');
      loadData();
    } catch (err) {
      alert('Erro: ' + (err as Error).message);
    }
  };

  // Alterna política de estoque negativo
  const handleToggleNegativeStock = async () => {
    const updated = !settings.allow_negative_stock;
    await db.updateSettings({ allow_negative_stock: updated });
    if (onUpdateSettings) {
      onUpdateSettings({ allow_negative_stock: updated });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
      {/* Top Banner with Stats & Negative Stock Policy */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total de Produtos Ativos</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {products.filter((p) => p.active).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Produtos com Estoque Baixo</span>
          <div className="text-2xl font-bold text-rose-600 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total de Peças em Estoque</span>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">
            {products.reduce((acc, p) => acc + (p.active ? p.stock_quantity : 0), 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Política de Venda sem Estoque</span>
            <input
              type="checkbox"
              id="neg-stock"
              checked={settings.allow_negative_stock}
              onChange={handleToggleNegativeStock}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>
          <label htmlFor="neg-stock" className="text-xs font-semibold text-slate-800 cursor-pointer mt-1">
            {settings.allow_negative_stock ? (
              <span className="text-amber-700 font-bold">Autorizar estoque negativo</span>
            ) : (
              <span className="text-emerald-700 font-bold">Bloquear venda se estoque zerado</span>
            )}
          </label>
        </div>
      </div>

      {/* Tabs Switcher: Inventário vs Histórico de Movimentações */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventário Atual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Movimentações ({movements.length})</span>
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <button
              type="button"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                onlyLowStock
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Apenas Estoque Baixo ({lowStockCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'inventory' ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-slate-200 uppercase tracking-wider text-[11px] font-bold sticky top-0">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-center">Estoque Atual</th>
                  <th className="py-3 px-3 text-center">Estoque Mínimo</th>
                  <th className="py-3 px-3 text-center">Situação</th>
                  <th className="py-3 px-4 text-right">Ações de Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredProducts.map((p) => {
                  const isLow = p.stock_quantity <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-600">{p.barcode || '—'}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category || 'Geral'}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-extrabold text-sm tabular-nums">
                        <span className={isLow ? 'text-rose-600' : 'text-slate-900'}>
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                        {p.minimum_stock} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Baixo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEntryModalProduct(p);
                              setEntryQty('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-xs border border-emerald-200 transition-colors cursor-pointer"
                            title="Registrar entrada de mercadorias compradas"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Entrada</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalProduct(p);
                              setAdjustQty(p.stock_quantity.toString());
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                            title="Ajuste manual com motivo (Inventário, avaria, etc.)"
                          >
                            <Sliders className="w-3 h-3 text-blue-600" />
                            <span>Ajustar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movimentações History Table */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-slate-200 uppercase tracking-wider text-[11px] font-bold sticky top-0">
                <tr>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-3 text-center">Tipo</th>
                  <th className="py-3 px-3 text-right">Quantidade</th>
                  <th className="py-3 px-4">Motivo / Observação</th>
                  <th className="py-3 px-4">Documento / Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhuma movimentação de estoque registrada.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const prod = products.find((p) => p.id === m.product_id);
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-4 font-mono text-slate-600">
                          {formatDateTime(m.created_at)}
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-900">
                          {prod ? prod.name : 'Produto removido'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.movement_type === 'entrada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.movement_type === 'venda'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold tabular-nums ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity} {prod?.unit || 'un'}
                        </td>
                        <td className="py-2 px-4 text-slate-600">{m.reason || '—'}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">{m.reference_id || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Entrada de Mercadorias */}
      {entryModalProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Entrada de Mercadorias</h3>
              <button
                onClick={() => setEntryModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="mt-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500">Produto:</span>
                <div className="font-bold text-slate-900 text-sm">{entryModalProduct.name}</div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Estoque atual: {entryModalProduct.stock_quantity} {entryModalProduct.unit}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Quantidade a Adicionar ({entryModalProduct.unit}) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Fornecedor ou Nº da Nota Fiscal
                </label>
                <input
                  type="text"
                  value={entrySupplier}
                  onChange={(e) => setEntrySupplier(e.target.value)}
                  placeholder="Ex: Distribuidora ABC / NF 4589"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Motivo
                </label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEntryModalProduct(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
                >
                  Gravar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ajuste Manual de Estoque */}
      {adjustModalProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Ajuste Manual de Estoque</h3>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="mt-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500">Produto:</span>
                <div className="font-bold text-slate-900 text-sm">{adjustModalProduct.name}</div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Estoque registrado no sistema: <strong>{adjustModalProduct.stock_quantity} {adjustModalProduct.unit}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nova Quantidade Real Contada ({adjustModalProduct.unit}) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Motivo do Ajuste *
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="Inventário / Contagem Física">Inventário / Contagem Física</option>
                  <option value="Avaria / Quebra de Produto">Avaria / Quebra de Produto</option>
                  <option value="Produto Vencido / Validade">Produto Vencido / Validade</option>
                  <option value="Perda / Furto">Perda / Furto</option>
                  <option value="Consumo Interno da Loja">Consumo Interno da Loja</option>
                  <option value="Correção Cadastral">Correção Cadastral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
