/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Gestão e Fechamento de Caixa
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  Printer,
  History,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Layers,
} from 'lucide-react';
import { CashSession, CashOperation, Settings } from '../types/pdv';
import { db } from '../services/db';
import { formatMoney, formatDateTime, parseMoneyToCents } from '../services/formatters';

interface CashScreenProps {
  settings: Settings;
  onSessionStatusChange?: () => void;
}

export const CashScreen: React.FC<CashScreenProps> = ({ settings, onSessionStatusChange }) => {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [sessionsHistory, setSessionsHistory] = useState<CashSession[]>([]);
  const [operations, setOperations] = useState<CashOperation[]>([]);
  const [summary, setSummary] = useState<{
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    outro: number;
    sangrias: number;
    suprimentos: number;
    totalVendas: number;
    vendasCount: number;
  }>({
    dinheiro: 0,
    pix: 0,
    debito: 0,
    credito: 0,
    outro: 0,
    sangrias: 0,
    suprimentos: 0,
    totalVendas: 0,
    vendasCount: 0,
  });

  // Modais
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [operationType, setOperationType] = useState<'sangria' | 'suprimento'>('sangria');

  // Form states
  const [openAmountInput, setOpenAmountInput] = useState('100,00');
  const [openNotes, setOpenNotes] = useState('');
  const [closeCountedInput, setCloseCountedInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [operationAmountInput, setOperationAmountInput] = useState('');
  const [operationReason, setOperationReason] = useState('');

  // Fechamento concluído para impressão
  const [closedReceiptData, setClosedReceiptData] = useState<{
    session: CashSession;
    expectedCents: number;
    differenceCents: number;
    summary: typeof summary;
  } | null>(null);

  const loadData = useCallback(async () => {
    const currentActive = await db.getActiveCashSession();
    setActiveSession(currentActive);

    const allSessions = await db.getCashSessions();
    setSessionsHistory(allSessions.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()));

    if (currentActive) {
      const summ = await db.getCashSessionSummary(currentActive.id);
      setSummary(summ);
      const ops = await db.getCashOperations(currentActive.id);
      setOperations(ops);
    } else {
      setSummary({
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        outro: 0,
        sangrias: 0,
        suprimentos: 0,
        totalVendas: 0,
        vendasCount: 0,
      });
      setOperations([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dinheiro esperado em gaveta no momento
  const expectedCashInDrawer = activeSession
    ? activeSession.opening_amount_cents + summary.dinheiro + summary.suprimentos - summary.sangrias
    : 0;

  // Abrir Caixa
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyToCents(openAmountInput);
    try {
      await db.openCashSession(amount, openNotes);
      setIsOpenModalOpen(false);
      setOpenNotes('');
      loadData();
      if (onSessionStatusChange) onSessionStatusChange();
    } catch (err) {
      alert('Erro ao abrir caixa: ' + (err as Error).message);
    }
  };

  // Sangria / Suprimento
  const handleAddOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyToCents(operationAmountInput);
    if (amount <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    if (operationType === 'sangria' && amount > expectedCashInDrawer) {
      if (!window.confirm('O valor da sangria é maior que o saldo em dinheiro disponível na gaveta. Deseja continuar?')) {
        return;
      }
    }

    try {
      await db.addCashOperation({
        type: operationType,
        amount_cents: amount,
        reason: operationReason,
      });
      setIsOperationModalOpen(false);
      setOperationAmountInput('');
      setOperationReason('');
      loadData();
    } catch (err) {
      alert('Erro: ' + (err as Error).message);
    }
  };

  // Fechar Caixa
  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseMoneyToCents(closeCountedInput);

    try {
      const result = await db.closeCashSession(counted, closeNotes);
      setIsCloseModalOpen(false);
      setCloseCountedInput('');
      setCloseNotes('');
      setClosedReceiptData(result);
      loadData();
      if (onSessionStatusChange) onSessionStatusChange();
    } catch (err) {
      alert('Erro ao fechar caixa: ' + (err as Error).message);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
      {/* Top Banner: Status + Main Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              activeSession ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {activeSession ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {activeSession ? 'Caixa Operando' : 'Caixa Fechado'}
              </h1>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  activeSession ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeSession ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {activeSession ? (
                <>Aberto em {formatDateTime(activeSession.opened_at)} · Saldo Inicial: {formatMoney(activeSession.opening_amount_cents)}</>
              ) : (
                'Abra o caixa informando o fundo de troco para iniciar as vendas do dia.'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setOperationType('suprimento');
                  setOperationAmountInput('');
                  setOperationReason('Troco inicial adicional');
                  setIsOperationModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                title="Adicionar dinheiro de troco à gaveta"
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Suprimento (Entrada)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOperationType('sangria');
                  setOperationAmountInput('');
                  setOperationReason('Retirada para cofre / pagamento de despesa');
                  setIsOperationModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                title="Retirar dinheiro da gaveta por segurança ou despesas"
              >
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <span>Sangria (Retirada)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCloseCountedInput((expectedCashInDrawer / 100).toFixed(2).replace('.', ','));
                  setIsCloseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenModalOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa Agora</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards of Summary by Payment Method */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Dinheiro */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Dinheiro em Gaveta</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatMoney(expectedCashInDrawer)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Vendas: {formatMoney(summary.dinheiro)}
          </div>
        </div>

        {/* Pix */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Vendas Pix</span>
            <QrCode className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold text-teal-800 font-mono tabular-nums">
            {formatMoney(summary.pix)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Crédito em conta</div>
        </div>

        {/* Cartão Débito */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cartão Débito</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-900 font-mono tabular-nums">
            {formatMoney(summary.debito)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Maquininha</div>
        </div>

        {/* Cartão Crédito */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cartão Crédito</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-indigo-900 font-mono tabular-nums">
            {formatMoney(summary.credito)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Maquininha</div>
        </div>

        {/* Total Geral de Vendas */}
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Vendido</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {formatMoney(summary.totalVendas)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.vendasCount} {summary.vendasCount === 1 ? 'venda registrada' : 'vendas registradas'}
          </div>
        </div>
      </div>

      {/* 2 Columns: Cash operations & Past Sessions History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Movimentações do Caixa Atual (Sangrias e Suprimentos) */}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Movimentações do Caixa Aberto
            </h3>
            <span className="text-xs text-slate-500">{operations.length} registros</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 min-h-[220px]">
            {operations.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma sangria ou suprimento registrado nesta sessão.
              </div>
            ) : (
              operations.map((op) => (
                <div key={op.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        op.type === 'suprimento' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {op.type === 'suprimento' ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs capitalize">{op.type}</div>
                      <div className="text-[11px] text-slate-500">{op.reason}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-xs tabular-nums ${
                        op.type === 'suprimento' ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {op.type === 'suprimento' ? '+' : '-'}
                      {formatMoney(op.amount_cents)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(op.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Histórico de Fechamentos Anteriores */}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Histórico de Sessões de Caixa</span>
            </h3>
            <span className="text-xs text-slate-500">{sessionsHistory.length} sessões</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 min-h-[220px]">
            {sessionsHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum histórico disponível.
              </div>
            ) : (
              sessionsHistory.map((s) => (
                <div key={s.id} className="p-3 hover:bg-slate-50 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s.status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <strong className="text-slate-900">
                        {s.status === 'open' ? 'Caixa em Aberto' : 'Caixa Encerrado'}
                      </strong>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">
                      Abertura: {formatDateTime(s.opened_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] tabular-nums text-slate-600 font-mono">
                    <div>
                      <span>Inicial: </span>
                      <strong className="text-slate-900">{formatMoney(s.opening_amount_cents)}</strong>
                    </div>
                    {s.closing_amount_cents !== undefined && (
                      <div>
                        <span>Fechamento: </span>
                        <strong className="text-slate-900">{formatMoney(s.closing_amount_cents)}</strong>
                      </div>
                    )}
                    {s.expected_amount_cents !== undefined && (
                      <div>
                        <span>Esperado: </span>
                        <strong className="text-slate-900">{formatMoney(s.expected_amount_cents)}</strong>
                      </div>
                    )}
                  </div>
                  {s.notes && (
                    <div className="text-[10px] text-slate-500 mt-1 italic">
                      Obs: {s.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Abrir Caixa */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Abertura de Caixa</h3>
              <button
                onClick={() => setIsOpenModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenCash} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Fundo de Troco Inicial (R$) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={openAmountInput}
                  onChange={(e) => setOpenAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full text-2xl font-bold font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Observações
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ex: Turno da manhã / Operador Maria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sangria ou Suprimento */}
      {isOperationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                {operationType === 'sangria' ? 'Sangria de Caixa (Retirada)' : 'Suprimento de Caixa (Entrada)'}
              </h3>
              <button
                onClick={() => setIsOperationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOperation} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Valor em Dinheiro (R$) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={operationAmountInput}
                  onChange={(e) => setOperationAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full text-2xl font-bold font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Motivo / Justificativa *
                </label>
                <input
                  type="text"
                  required
                  value={operationReason}
                  onChange={(e) => setOperationReason(e.target.value)}
                  placeholder="Ex: Retirada de segurança para o cofre"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOperationModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
                >
                  Gravar Operação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Fechar Caixa com Conferência Cega e Cálculo de Diferença */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Fechamento e Conferência de Caixa</h3>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseCash} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600">Saldo Inicial:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMoney(activeSession?.opening_amount_cents || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Vendas em Dinheiro:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatMoney(summary.dinheiro)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Suprimentos de Troco:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatMoney(summary.suprimentos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(-) Sangrias Realizadas:</span>
                  <span className="font-mono font-bold text-amber-700">-{formatMoney(summary.sangrias)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                  <span>Dinheiro Físico Esperado no Caixa:</span>
                  <span className="font-mono text-blue-900">{formatMoney(expectedCashInDrawer)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Valor Contado Fisicamente na Gaveta (R$) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={closeCountedInput}
                  onChange={(e) => setCloseCountedInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full text-2xl font-bold font-mono px-3 py-2 bg-white border-2 border-blue-500 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 tabular-nums"
                />
              </div>

              {/* Cálculo dinâmico da diferença */}
              {closeCountedInput && (
                <div className="text-xs flex items-center justify-between p-2.5 rounded-lg border bg-slate-50">
                  <span className="font-semibold text-slate-700">Diferença apurada:</span>
                  {(() => {
                    const counted = parseMoneyToCents(closeCountedInput);
                    const diff = counted - expectedCashInDrawer;
                    if (diff === 0) {
                      return <span className="text-emerald-700 font-bold">Caixa conferido sem diferenças</span>;
                    } else if (diff > 0) {
                      return <span className="text-blue-700 font-bold">Sobra de {formatMoney(diff)}</span>;
                    } else {
                      return <span className="text-rose-600 font-bold">Falta de {formatMoney(Math.abs(diff))}</span>;
                    }
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Observações do Fechamento
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Turno encerrado às 18h"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
                >
                  Confirmar Fechamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Relatório de Fechamento Concluído para Impressão */}
      {closedReceiptData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-slate-900">Caixa Encerrado com Sucesso!</h3>
            <p className="text-xs text-slate-500 mb-4">
              Comprovante de fechamento pronto para impressão térmica ou arquivamento.
            </p>

            <div className="receipt-paper p-4 border border-slate-300 rounded text-left text-xs font-mono space-y-1.5 mb-4">
              <div className="text-center font-bold pb-2 border-b border-dashed border-slate-400">
                <div>FECHAMENTO DE CAIXA</div>
                <div className="text-[10px] text-slate-500">{settings.store_name}</div>
                <div className="text-[10px] text-slate-500">{formatDateTime(new Date().toISOString())}</div>
              </div>
              <div className="flex justify-between pt-1">
                <span>Saldo Inicial:</span>
                <span>{formatMoney(closedReceiptData.session.opening_amount_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendas Dinheiro:</span>
                <span>{formatMoney(closedReceiptData.summary.dinheiro)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendas Pix:</span>
                <span>{formatMoney(closedReceiptData.summary.pix)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendas Cartão Débito:</span>
                <span>{formatMoney(closedReceiptData.summary.debito)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendas Cartão Crédito:</span>
                <span>{formatMoney(closedReceiptData.summary.credito)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-1">
                <span>Total de Vendas:</span>
                <span>{formatMoney(closedReceiptData.summary.totalVendas)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Suprimentos:</span>
                <span>+{formatMoney(closedReceiptData.summary.suprimentos)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sangrias:</span>
                <span>-{formatMoney(closedReceiptData.summary.sangrias)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed border-slate-400 font-bold">
                <span>Esperado em Gaveta:</span>
                <span>{formatMoney(closedReceiptData.expectedCents)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Contado pelo Operador:</span>
                <span>{formatMoney(closedReceiptData.session.closing_amount_cents || 0)}</span>
              </div>
              <div className="flex justify-between font-extrabold pt-1 border-t border-slate-400">
                <span>Diferença:</span>
                <span>
                  {closedReceiptData.differenceCents >= 0 ? '+' : ''}
                  {formatMoney(closedReceiptData.differenceCents)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprovante</span>
              </button>
              <button
                type="button"
                onClick={() => setClosedReceiptData(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
