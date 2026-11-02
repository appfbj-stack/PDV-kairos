/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Modal de Busca Rápida de Produtos (F2)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Package } from 'lucide-react';
import { Product } from '../types/pdv';
import { formatMoney } from '../services/formatters';

interface QuickSearchModalProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
  onOpenRegister?: (initialBarcode?: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  products,
  onSelectProduct,
  onClose,
  onOpenRegister,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = products
    .filter((p) => p.active)
    .filter((p) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.size && p.size.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q)) ||
        (p.scale_barcode_code && p.scale_barcode_code.includes(q))
      );
    })
    .slice(0, 20);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Navegação por teclado (Setas Cima/Baixo, Enter para selecionar, ESC para fechar)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectProduct(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Localizar Produto (F2)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="my-3 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o nome, código de barras ou categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="text-sm font-semibold">Nenhum produto encontrado com "{query}"</div>
              {onOpenRegister && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRegister(query);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Produto com esse Código</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((product, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-950'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-bold text-sm truncate">{product.name}</div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-600">{product.barcode || 'Sem código'}</span>
                      {product.size && (
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          Tam: {product.size}
                        </span>
                      )}
                      {product.color && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                          {product.color}
                        </span>
                      )}
                      {product.category && (
                        <>
                          <span>·</span>
                          <span>{product.category}</span>
                        </>
                      )}
                      <span>·</span>
                      <span
                        className={
                          product.stock_quantity <= product.minimum_stock
                            ? 'text-rose-600 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        Estoque: {product.stock_quantity} {product.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-emerald-700 font-mono tabular-nums">
                      {formatMoney(product.sale_price_cents)}
                    </div>
                    {isSelected && (
                      <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                        Enter para adicionar
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>Use as setas ↑ ↓ para navegar e Enter para selecionar</div>
          <div>ESC para fechar</div>
        </div>
      </div>
    </div>
  );
};
