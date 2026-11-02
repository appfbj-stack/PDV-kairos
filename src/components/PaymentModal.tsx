/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Modal de Pagamento e Finalização Transacional
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  CheckCircle,
  Printer,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { CartItem, PaymentMethod, Sale, SaleItem, Settings } from '../types/pdv';
import { formatMoney, parseMoneyToCents } from '../services/formatters';
import { db } from '../services/db';
import { sound } from '../services/sound';
import { ThermalReceipt } from './ThermalReceipt';

interface PaymentModalProps {
  items: CartItem[];
  discountCents: number;
  settings: Settings;
  onClose: () => void;
  onSaleSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  items,
  discountCents,
  settings,
  onClose,
  onSaleSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  const [receivedInput, setReceivedInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<{ sale: Sale; items: SaleItem[]; change_cents: number } | null>(null);

  const subtotalCents = items.reduce((acc, curr) => acc + curr.total_cents, 0);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  // Calcula valor recebido e troco em centavos
  const receivedCents = method === 'dinheiro' ? parseMoneyToCents(receivedInput) : totalCents;
  const changeCents = Math.max(0, receivedCents - totalCents);
  const isInsufficient = method === 'dinheiro' && receivedCents < totalCents;

  // Ao trocar de forma de pagamento
  const selectMethod = (m: PaymentMethod) => {
    setMethod(m);
    setErrorMsg('');
    if (m === 'dinheiro') {
      setReceivedInput((totalCents / 100).toFixed(2).replace('.', ','));
    }
  };

  useEffect(() => {
    // Inicializa com valor exato em dinheiro para agilizar operador
    setReceivedInput((totalCents / 100).toFixed(2).replace('.', ','));
  }, [totalCents]);

  // Adiciona cédula rápida
  const addQuickBill = (centsToAdd: number) => {
    const current = parseMoneyToCents(receivedInput);
    const newTotal = current + centsToAdd;
    setReceivedInput((newTotal / 100).toFixed(2).replace('.', ','));
  };

  const setExactAmount = () => {
    setReceivedInput((totalCents / 100).toFixed(2).replace('.', ','));
  };

  // Processa a venda
  const handleFinalize = async () => {
    if (isSubmitting) return;
    setErrorMsg('');

    if (method === 'dinheiro' && receivedCents < totalCents) {
      sound.playErrorAlert();
      setErrorMsg(`Valor recebido insuficiente. Faltam ${formatMoney(totalCents - receivedCents)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await db.finalizeSale({
        items,
        payment_method: method,
        amount_received_cents: receivedCents,
        discount_cents: discountCents,
      });

      sound.playSaleCompleted();
      setCompletedSale(result);

      if (settings.auto_print) {
        // Dispara impressão automática conforme configuração do lojista
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: unknown) {
      sound.playErrorAlert();
      setErrorMsg((err as Error).message || 'Erro ao gravar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Captura atalhos dentro do modal: Enter para finalizar ou nova venda, ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!completedSale) {
          onClose();
        } else {
          onSaleSuccess();
        }
      } else if (e.key === 'Enter' && !isSubmitting) {
        if (completedSale) {
          onSaleSuccess();
        } else if (!isInsufficient) {
          handleFinalize();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completedSale, isInsufficient, isSubmitting, receivedCents, totalCents]);

  // Se a venda foi concluída com sucesso, exibe tela de troco e comprovante
  if (completedSale) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-center border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">Venda #{completedSale.sale.sale_number} Concluída!</h2>
          <p className="text-sm text-slate-500 mt-1">Estoque atualizado e transação gravada com sucesso.</p>

          {/* Troco em destaque se for dinheiro */}
          {completedSale.sale.payment_method === 'dinheiro' && (
            <div className="my-5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-xs uppercase font-bold tracking-wider text-emerald-800">Troco do Cliente</div>
              <div className="text-4xl font-extrabold text-emerald-600 tabular-nums my-1">
                {formatMoney(completedSale.change_cents)}
              </div>
              <div className="text-xs text-emerald-700">
                Recebido: {formatMoney(completedSale.sale.amount_received_cents)} · Total: {formatMoney(completedSale.sale.total_cents)}
              </div>
            </div>
          )}

          {/* Mini preview do comprovante */}
          <div className="my-4 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
            <ThermalReceipt
              sale={completedSale.sale}
              items={completedSale.items}
              settings={settings}
              showControls={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-sm shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir (F6)</span>
            </button>
            <button
              onClick={onSaleSuccess}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-sm shadow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nova Venda (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Finalizar Venda</h2>
            <div className="text-xs text-slate-500">Selecione o meio de pagamento e confirme</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="my-4 p-4 bg-slate-900 text-white rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">TOTAL DA VENDA</div>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-400">
              {formatMoney(totalCents)}
            </div>
          </div>
          <div className="text-right text-xs text-slate-300 space-y-0.5">
            <div>Subtotal: {formatMoney(subtotalCents)}</div>
            {discountCents > 0 && <div className="text-amber-400">Desconto: -{formatMoney(discountCents)}</div>}
            <div>Itens: {items.length}</div>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => selectMethod('dinheiro')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                method === 'dinheiro'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs font-bold">Dinheiro</span>
            </button>

            <button
              type="button"
              onClick={() => selectMethod('pix')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                method === 'pix'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-xs font-bold">Pix</span>
            </button>

            <button
              type="button"
              onClick={() => selectMethod('debito')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                method === 'debito'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold">Débito</span>
            </button>

            <button
              type="button"
              onClick={() => selectMethod('credito')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                method === 'credito'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold">Crédito</span>
            </button>

            <button
              type="button"
              onClick={() => selectMethod('outro')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                method === 'outro'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="text-xs font-bold">Outro / Fiado</span>
            </button>
          </div>
        </div>

        {/* Method Specific Details */}
        {method === 'dinheiro' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Recebido do Cliente (R$)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  autoFocus
                  placeholder="0,00"
                  className="w-full text-2xl font-bold font-mono px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
                <button
                  type="button"
                  onClick={setExactAmount}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
                >
                  Exato
                </button>
              </div>
            </div>

            {/* Quick Bill Increments */}
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1.5">Atalhos de Cédulas:</div>
              <div className="flex flex-wrap gap-1.5">
                {[1000, 2000, 5000, 10000].map((cents) => (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => addQuickBill(cents)}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-medium text-slate-800 cursor-pointer shadow-2xs"
                  >
                    +{formatMoney(cents)}
                  </button>
                ))}
              </div>
            </div>

            {/* Troco Display */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Troco a Devolver:</span>
                {isInsufficient && (
                  <span className="block text-[11px] text-rose-600 font-medium">Valor recebido menor que o total</span>
                )}
              </div>
              <div
                className={`text-2xl font-extrabold tabular-nums ${
                  isInsufficient ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatMoney(changeCents)}
              </div>
            </div>
          </div>
        )}

        {method === 'pix' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center space-y-2">
            <div className="inline-block p-3 bg-white border border-slate-300 rounded-md shadow-2xs">
              <QrCode className="w-28 h-28 text-slate-800 mx-auto" />
            </div>
            <div className="text-xs font-bold text-slate-800">Chave Pix cadastrada: {settings.cnpj || '12.345.678/0001-90'}</div>
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Operador: confirme o crédito no aplicativo do banco antes de liberar o cliente.</span>
            </div>
          </div>
        )}

        {(method === 'debito' || method === 'credito') && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Pagamento no Terminal de Cartão (POS / Maquininha)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Solicite ao cliente inserir ou aproximar o cartão na maquininha no valor de{' '}
              <strong className="text-slate-900 font-bold">{formatMoney(totalCents)}</strong>.
            </p>
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Operador: clique em Confirmar Venda somente após a maquininha exibir "Aprovada".</span>
            </div>
          </div>
        )}

        {method === 'outro' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800">Outras Formas de Pagamento (Caderneta / Vale / Misto)</div>
            <p className="text-xs text-slate-600">
              Esta venda será registrada como Outro para posterior conferência no fechamento do caixa.
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Cancelar (ESC)
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isSubmitting || isInsufficient}
            className={`py-3 px-4 font-bold rounded-lg text-sm transition-colors cursor-pointer shadow flex items-center justify-center gap-2 ${
              isInsufficient || isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Gravando...' : 'Confirmar Venda (Enter)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
