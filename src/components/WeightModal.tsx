/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Modal de Pesagem para Produtos por Quilo (KG)
 * Essencial para Padarias, Açougues, Hortifrútis e Lojas de Frios
 */

import React, { useState, useEffect, useRef } from 'react';
import { Scale, X, Check, Calculator } from 'lucide-react';
import { Product } from '../types/pdv';
import { formatMoney } from '../services/formatters';

interface WeightModalProps {
  product: Product;
  onConfirm: (weightKg: number, totalCents: number) => void;
  onClose: () => void;
}

export const WeightModal: React.FC<WeightModalProps> = ({ product, onConfirm, onClose }) => {
  const [weightInput, setWeightInput] = useState<string>('0,500');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const weightKg = Math.max(0.001, parseFloat(weightInput.replace(',', '.')) || 0);
  const totalCents = Math.round(weightKg * product.sale_price_cents);

  const handleQuickWeight = (kg: number) => {
    setWeightInput(kg.toFixed(3).replace('.', ','));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weightKg <= 0) return;
    onConfirm(weightKg, totalCents);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Pesagem de Produto (KG)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="text-base font-extrabold text-slate-900">{product.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Preço por KG:{' '}
              <strong className="text-slate-900 font-bold font-mono">
                {formatMoney(product.sale_price_cents)}/kg
              </strong>
            </div>
          </div>

          {/* Peso input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Peso Lido ou Informado (em KG) *
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                required
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="0,000"
                className="w-full text-3xl font-extrabold font-mono px-3 py-2.5 bg-slate-50 border-2 border-blue-500 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white text-center tabular-nums"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                KG
              </span>
            </div>
          </div>

          {/* Atalhos Rápidos de Gramas */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 mb-1.5">Atalhos Comuns:</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.1, 0.25, 0.5, 1.0].map((kg) => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => handleQuickWeight(kg)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-bold text-slate-800 transition-colors cursor-pointer text-center"
                >
                  {kg >= 1 ? `${kg} kg` : `${kg * 1000}g`}
                </button>
              ))}
            </div>
          </div>

          {/* Total calculado grande */}
          <div className="p-4 bg-slate-900 text-white rounded-xl text-center space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Valor Calculado
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {formatMoney(totalCents)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {weightKg.toFixed(3)} kg × {formatMoney(product.sale_price_cents)}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
            >
              Cancelar (ESC)
            </button>
            <button
              type="submit"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Peso (Enter)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
