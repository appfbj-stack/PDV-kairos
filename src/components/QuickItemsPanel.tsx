/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Painel de Itens Rápidos de Balcão (Padaria, Lanchonete, Cafeteria e Mais Vendidos)
 */

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Product } from '../types/pdv';
import { formatMoney } from '../services/formatters';

interface QuickItemsPanelProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const QuickItemsPanel: React.FC<QuickItemsPanelProps> = ({ products, onSelectProduct }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filtra produtos marcados como favoritos ou os 12 mais frequentes
  const availableItems = products.filter((p) => p.active && (p.is_favorite || p.unit === 'KG' || p.unit === 'FATIA'));
  const displayItems = availableItems.length > 0 ? availableItems : products.filter((p) => p.active).slice(0, 10);

  const categories = ['TODOS', ...Array.from(new Set(displayItems.map((p) => p.category || 'Geral')))];

  const filtered = displayItems.filter((p) => {
    if (selectedCategory === 'TODOS') return true;
    return (p.category || 'Geral') === selectedCategory;
  });

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Itens Rápidos de Balcão (Padaria / Favoritos)
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            ({displayItems.length} itens cadastrados sem necessidade de código de barras)
          </span>
        </div>

        <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {/* Category Tabs */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProduct(item)}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all active:scale-98 cursor-pointer flex flex-col justify-between group h-20 shadow-2xs"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900 truncate">
                    {item.name}
                  </div>
                  {(item.size || item.color) && (
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      <span>{[item.size, item.color].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-200/60 font-mono">
                  <span className="text-[10px] text-slate-500 font-semibold">{item.unit}</span>
                  <span className="font-extrabold text-emerald-700 tabular-nums">
                    {formatMoney(item.sale_price_cents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
