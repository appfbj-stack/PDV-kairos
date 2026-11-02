/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Modal de Cadastro e Edição de Produto (F3)
 */

import React, { useState } from 'react';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Product, UnitType } from '../types/pdv';
import { db } from '../services/db';
import { parseMoneyToCents } from '../services/formatters';

interface ProductFormModalProps {
  productToEdit?: Product | null;
  initialBarcode?: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  productToEdit,
  initialBarcode,
  onClose,
  onSaved,
}) => {
  const [barcode, setBarcode] = useState(productToEdit?.barcode || initialBarcode || '');
  const [name, setName] = useState(productToEdit?.name || '');
  const [category, setCategory] = useState(productToEdit?.category || 'Geral');
  const [costPriceInput, setCostPriceInput] = useState(
    productToEdit ? (productToEdit.cost_price_cents / 100).toFixed(2).replace('.', ',') : '0,00'
  );
  const [salePriceInput, setSalePriceInput] = useState(
    productToEdit ? (productToEdit.sale_price_cents / 100).toFixed(2).replace('.', ',') : '0,00'
  );
  const [stockQuantity, setStockQuantity] = useState(
    productToEdit ? productToEdit.stock_quantity.toString() : '10'
  );
  const [minimumStock, setMinimumStock] = useState(
    productToEdit ? productToEdit.minimum_stock.toString() : '5'
  );
  const [unit, setUnit] = useState<UnitType>(productToEdit?.unit || 'UN');
  const [size, setSize] = useState(productToEdit?.size || '');
  const [color, setColor] = useState(productToEdit?.color || '');
  const [isFavorite, setIsFavorite] = useState<boolean>(productToEdit?.is_favorite || false);
  const [scaleBarcodeCode, setScaleBarcodeCode] = useState(productToEdit?.scale_barcode_code || '');
  const [active, setActive] = useState<boolean>(productToEdit ? productToEdit.active : true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Gerador de código de barras aleatório EAN-13 válido para produtos sem código de fábrica
  const generateRandomBarcode = () => {
    // 789 é o prefixo GS1 Brasil
    let code = '789' + Math.floor(100000000 + Math.random() * 900000000).toString();
    // Dígito verificador EAN
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(code.slice(0, 12) + checkDigit.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('O nome do produto é obrigatório.');
      return;
    }

    const saleCents = parseMoneyToCents(salePriceInput);
    const costCents = parseMoneyToCents(costPriceInput);

    if (saleCents <= 0) {
      setErrorMsg('O preço de venda deve ser maior que zero.');
      return;
    }

    const stockQtyNum = parseFloat(stockQuantity.replace(',', '.')) || 0;
    const minStockNum = parseFloat(minimumStock.replace(',', '.')) || 0;

    try {
      setIsSaving(true);
      const saved = await db.saveProduct(
        {
          barcode: barcode.trim(),
          name: name.trim(),
          category: category.trim() || 'Geral',
          cost_price_cents: costCents,
          sale_price_cents: saleCents,
          stock_quantity: stockQtyNum,
          minimum_stock: minStockNum,
          unit,
          size: size.trim() || undefined,
          color: color.trim() || undefined,
          is_favorite: isFavorite,
          scale_barcode_code: scaleBarcodeCode.trim() || undefined,
          active,
        },
        productToEdit?.id
      );

      onSaved(saved);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {productToEdit ? 'Editar Produto' : 'Cadastrar Produto (F3)'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Barcode & Auto generate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Código de Barras / EAN
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 7891234567890 (ou deixe em branco se não tiver)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={generateRandomBarcode}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer border border-slate-300 transition-colors"
                title="Gera um código de barras EAN-13 brasileiro válido"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Gerar Código</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arroz Branco Tipo 1 5kg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Categoria
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Alimentos, Limpeza, Papelaria..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium cursor-pointer"
              >
                <option value="UN">UN - Unidade</option>
                <option value="KG">KG - Quilograma (Por Peso / Balança)</option>
                <option value="FATIA">FATIA - Fatia (Padaria / Bolo / Torta)</option>
                <option value="PAR">PAR - Par (Calçados / Luvas / Meias)</option>
                <option value="PCT">PCT - Pacote</option>
                <option value="CX">CX - Caixa</option>
                <option value="L">L - Litro</option>
                <option value="MT">MT - Metro (Fios / Tubos / Tecidos)</option>
              </select>
            </div>
          </div>

          {/* Preços (Custo e Venda) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Preço de Custo (R$)
              </label>
              <input
                type="text"
                value={costPriceInput}
                onChange={(e) => setCostPriceInput(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono tabular-nums font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Preço de Venda (R$) *
              </label>
              <input
                type="text"
                required
                value={salePriceInput}
                onChange={(e) => setSalePriceInput(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono tabular-nums font-bold"
              />
            </div>
          </div>

          {/* Estoques */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Estoque Atual
              </label>
              <input
                type="text"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="text"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Atributos Específicos por Ramo: Moda / Vestuário & Padaria / Balança */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Opções Especiais (Moda / Padaria)</span>
              <span className="text-[10px] text-slate-500 font-normal">Preencha conforme o seu ramo</span>
            </div>

            {/* Roupas: Tamanho e Cor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tamanho (Grade / Roupas / Calçados)
                </label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Ex: P, M, G, GG, 38, 40, 42"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cor / Variação
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ex: Preto, Azul Marinho, Floral"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Padaria: Código de Balança & Item Rápido */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cód. Balança (Padaria / Frios)
                </label>
                <input
                  type="text"
                  value={scaleBarcodeCode}
                  onChange={(e) => setScaleBarcodeCode(e.target.value)}
                  placeholder="Ex: 00001 (para etiqueta 200001...)"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="product-fav"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="product-fav" className="text-xs font-semibold text-amber-900 cursor-pointer">
                  ⭐ Item Rápido / Balcão (Padaria)
                </label>
              </div>
            </div>
          </div>

          {/* Ativo checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="product-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="product-active" className="text-sm font-medium text-slate-700 cursor-pointer">
              Produto ativo para vendas no PDV
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors cursor-pointer"
            >
              Cancelar (ESC)
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer shadow flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
