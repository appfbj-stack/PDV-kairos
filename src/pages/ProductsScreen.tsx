/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Gestão e Cadastro Completo de Produtos
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Package,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types/pdv';
import { db } from '../services/db';
import { formatMoney } from '../services/formatters';
import { ProductFormModal } from '../components/ProductFormModal';
import { SpreadsheetImportModal } from '../components/SpreadsheetImportModal';

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    const list = await db.getProducts();
    setProducts(list);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Categorias únicas
  const categories = Array.from(new Set(products.map((p) => p.category || 'Geral'))).sort();

  // Filtragem
  const filteredProducts = products.filter((p) => {
    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Categoria
    if (categoryFilter !== 'ALL' && (p.category || 'Geral') !== categoryFilter) {
      return false;
    }

    // Status
    if (statusFilter === 'ACTIVE' && !p.active) return false;
    if (statusFilter === 'INACTIVE' && p.active) return false;
    if (statusFilter === 'LOW_STOCK' && (!p.active || p.stock_quantity > p.minimum_stock)) return false;

    return true;
  });

  // Ações
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (product: Product) => {
    const actionName = product.active ? 'desativar' : 'reativar';
    if (window.confirm(`Deseja realmente ${actionName} o produto "${product.name}"?`)) {
      await db.saveProduct(
        {
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          cost_price_cents: product.cost_price_cents,
          sale_price_cents: product.sale_price_cents,
          stock_quantity: product.stock_quantity,
          minimum_stock: product.minimum_stock,
          unit: product.unit,
          active: !product.active,
        },
        product.id
      );
      loadProducts();
    }
  };

  // Exportação Excel
  const handleExportExcel = () => {
    const exportData = filteredProducts.map((p) => ({
      'ID': p.id,
      'Código de Barras': p.barcode,
      'Código Balança': p.scale_barcode_code || '',
      'Nome do Produto': p.name,
      'Categoria': p.category,
      'Tamanho': p.size || '',
      'Cor': p.color || '',
      'Preço Custo (R$)': (p.cost_price_cents / 100).toFixed(2),
      'Preço Venda (R$)': (p.sale_price_cents / 100).toFixed(2),
      'Estoque Atual': p.stock_quantity,
      'Estoque Mínimo': p.minimum_stock,
      'Unidade': p.unit,
      'Item Balcão': p.is_favorite ? 'Sim' : 'Não',
      'Status': p.active ? 'Ativo' : 'Inativo',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, `produtos_kairos_pdv_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
      {/* Top action toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cadastro de Produtos</h1>
          <p className="text-xs text-slate-500">
            {products.length} produtos cadastrados ({products.filter((p) => p.active).length} ativos)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            title="Exportar produtos para planilha Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            title="Importar produtos em lote via CSV ou XLSX"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Importar Planilha</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedProduct(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto (F3)</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nome, código ou categoria..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium">Categoria:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs font-medium cursor-pointer"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status segmented filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ACTIVE' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              statusFilter === 'LOW_STOCK' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estoque Baixo
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              statusFilter === 'INACTIVE' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800 text-slate-200 uppercase tracking-wider text-[11px] font-bold sticky top-0">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nome do Produto</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3 text-right">Custo</th>
                <th className="py-3 px-3 text-right">Venda</th>
                <th className="py-3 px-3 text-right">Margem</th>
                <th className="py-3 px-3 text-center">Estoque</th>
                <th className="py-3 px-3 text-center">Mínimo</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div>Nenhum produto encontrado com os filtros aplicados.</div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock_quantity <= p.minimum_stock;
                  const marginPct =
                    p.sale_price_cents > 0
                      ? Math.round(((p.sale_price_cents - p.cost_price_cents) / p.sale_price_cents) * 100)
                      : 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !p.active ? 'opacity-60 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-600 font-semibold">
                        <div>{p.barcode || '—'}</div>
                        {p.scale_barcode_code && (
                          <div className="text-[10px] text-blue-600 font-medium">
                            Balança: {p.scale_barcode_code}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {p.size && (
                            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                              Tam: {p.size}
                            </span>
                          )}
                          {p.color && (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-medium text-[10px]">
                              Cor: {p.color}
                            </span>
                          )}
                          {p.is_favorite && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-medium text-[10px]">
                              ⭐ Balcão
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category || 'Geral'}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatMoney(p.cost_price_cents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                        {formatMoney(p.sale_price_cents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {marginPct}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            isLow ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {p.stock_quantity} {p.unit}
                        </span>
                        {isLow && p.active && (
                          <span
                            className="inline-block ml-1 text-rose-500"
                            title="Estoque abaixo ou igual ao mínimo recomendado"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500">
                        {p.minimum_stock} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              p.active
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={p.active ? 'Desativar produto' : 'Reativar produto'}
                          >
                            {p.active ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductFormModal
          productToEdit={selectedProduct}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            loadProducts();
          }}
        />
      )}

      {/* Spreadsheet Import Modal */}
      {isImportOpen && (
        <SpreadsheetImportModal
          existingProducts={products}
          onClose={() => setIsImportOpen(false)}
          onImportComplete={() => {
            setIsImportOpen(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
};
