/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Tela de Vendas Principal (PDV)
 * Projetada para operadores de caixa com máxima agilidade, suporte a leitor USB e atalhos de teclado
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Printer,
  XCircle,
  AlertCircle,
  Percent,
  DollarSign,
  PackageCheck,
} from 'lucide-react';
import { Product, CartItem, Settings, Sale, SaleItem } from '../types/pdv';
import { formatMoney, parseMoneyToCents } from '../services/formatters';
import { db } from '../services/db';
import { sound } from '../services/sound';
import { QuickSearchModal } from '../components/QuickSearchModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { PaymentModal } from '../components/PaymentModal';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { WeightModal } from '../components/WeightModal';
import { QuickItemsPanel } from '../components/QuickItemsPanel';

interface SalesScreenProps {
  settings: Settings;
  onRefreshData?: () => void;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ settings, onRefreshData }) => {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number>(-1);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [discountType, setDiscountType] = useState<'reais' | 'percent'>('reais');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Carrega produtos para a busca rápida
  const loadProducts = useCallback(async () => {
    const prods = await db.getProducts();
    setProductsList(prods);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Modais e Painéis de Segmento
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null);
  const [showQuickPanel, setShowQuickPanel] = useState<boolean>(settings.show_quick_items ?? true);
  const [registerInitialBarcode, setRegisterInitialBarcode] = useState('');
  const [reprintSale, setReprintSale] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const isAnyModalOpen =
    isSearchOpen ||
    isRegisterOpen ||
    isPaymentOpen ||
    weightModalProduct !== null ||
    reprintSale !== null;

  // Cálculos do carrinho
  const subtotalCents = cart.reduce((acc, item) => acc + item.total_cents, 0);

  let discountCents = 0;
  if (discountInput.trim()) {
    if (discountType === 'reais') {
      discountCents = parseMoneyToCents(discountInput);
    } else {
      const pct = parseFloat(discountInput.replace(',', '.')) || 0;
      discountCents = Math.round((subtotalCents * pct) / 100);
    }
  }
  discountCents = Math.min(subtotalCents, Math.max(0, discountCents));
  const finalTotalCents = Math.max(0, subtotalCents - discountCents);

  // Adiciona produto ao carrinho (ou incrementa se já existir)
  // Adiciona produto ao carrinho (ou incrementa se já existir)
  const addProductToCart = useCallback(
    (product: Product, quantity: number = 1) => {
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id);
        if (existingIdx !== -1) {
          // Incrementa quantidade
          const updated = [...prev];
          const newQty = updated[existingIdx].quantity + quantity;
          const unitPrice = updated[existingIdx].unit_price_cents;
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            total_cents: Math.round(newQty * unitPrice) - updated[existingIdx].discount_cents,
          };
          setSelectedCartIndex(existingIdx);
          return updated;
        } else {
          // Novo item no carrinho
          const unitPrice = product.sale_price_cents;
          const newItem: CartItem = {
            product,
            quantity,
            unit_price_cents: unitPrice,
            discount_cents: 0,
            total_cents: Math.round(quantity * unitPrice),
            size: product.size,
            color: product.color,
          };
          setSelectedCartIndex(prev.length);
          return [...prev, newItem];
        }
      });

      setLastScannedProduct(product);
      setStatusMessage({ text: `${product.name} adicionado ao carrinho.`, type: 'success' });
      sound.playScanSuccess();
    },
    []
  );

  // Adiciona produto pesado (KG / Balança) com peso decimal e valor
  const addWeightedProductToCart = useCallback(
    (product: Product, weightKg: number, customTotalCents?: number) => {
      setCart((prev) => {
        const calculatedTotal =
          customTotalCents !== undefined
            ? customTotalCents
            : Math.round(weightKg * product.sale_price_cents);

        const newItem: CartItem = {
          product,
          quantity: weightKg,
          unit_price_cents: product.sale_price_cents,
          discount_cents: 0,
          total_cents: calculatedTotal,
          size: product.size,
          color: product.color,
        };
        setSelectedCartIndex(prev.length);
        return [...prev, newItem];
      });

      setLastScannedProduct(product);
      setStatusMessage({
        text: `${product.name} (${weightKg.toFixed(3)} kg) adicionado.`,
        type: 'success',
      });
      sound.playScanSuccess();
    },
    []
  );

  // Seleção inteligente: se for KG abre pesagem, senão adiciona direto
  const handleProductSelection = useCallback(
    (product: Product) => {
      if (product.unit === 'KG') {
        setWeightModalProduct(product);
      } else {
        addProductToCart(product, 1);
      }
    },
    [addProductToCart]
  );

  // Processa leitura de código de barras ou digitação
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Evita duplicidade imediata se disparado em rajada pelo leitor
    const now = Date.now();
    if (now - lastKeyTimeRef.current < 40) {
      return;
    }
    lastKeyTimeRef.current = now;

    // Limpa campo imediatamente para a próxima leitura
    setBarcodeInput('');

    // 1. Tenta decodificar código de balança de açougue/padaria (EAN-13 iniciando com 2)
    if (code.length === 13 && code.startsWith('2') && (settings.enable_scale_barcode ?? true)) {
      const scaleResult = await db.decodeScaleBarcode(code);
      if (scaleResult) {
        addWeightedProductToCart(
          scaleResult.product,
          scaleResult.quantity,
          scaleResult.calculatedPriceCents
        );
        setTimeout(focusBarcode, 50);
        return;
      }
    }

    // 2. Busca no banco local por código regular
    const product = await db.getProductByBarcode(code);

    if (product) {
      if (product.unit === 'KG') {
        setWeightModalProduct(product);
      } else {
        addProductToCart(product, 1);
      }
    } else {
      sound.playErrorAlert();
      setStatusMessage({
        text: `Código "${code}" não cadastrado. Pressione F3 para cadastrar.`,
        type: 'error',
      });
      // Sugere cadastro rápido
      setRegisterInitialBarcode(code);
    }

    setTimeout(focusBarcode, 50);
  };

  // Ajusta quantidade de um item
  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        quantity: newQty,
        total_cents: Math.round(newQty * item.unit_price_cents) - item.discount_cents,
      };
      return updated;
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
    if (selectedCartIndex === index) {
      setSelectedCartIndex(-1);
    } else if (selectedCartIndex > index) {
      setSelectedCartIndex((prev) => prev - 1);
    }
    setStatusMessage({ text: 'Item removido da venda.', type: 'info' });
  };

  // Cancela venda atual
  const cancelSale = () => {
    if (cart.length === 0) return;
    if (window.confirm('Tem certeza que deseja cancelar a venda atual e limpar o carrinho?')) {
      setCart([]);
      setDiscountInput('');
      setLastScannedProduct(null);
      setSelectedCartIndex(-1);
      setStatusMessage({ text: 'Venda cancelada pelo operador.', type: 'info' });
      focusBarcode();
    }
  };

  // Reimpressão da última venda
  const handleReprintLast = async () => {
    const last = await db.getLastSale();
    if (!last) {
      sound.playErrorAlert();
      setStatusMessage({ text: 'Nenhuma venda anterior encontrada para reimpressão.', type: 'error' });
      return;
    }
    setReprintSale(last);
  };

  // Gerenciador global de atalhos de teclado (F2, F3, F4, F5, F6, ESC, Delete) e foco contínuo
  const { focusBarcode } = useKeyboardShortcuts({
    barcodeInputRef,
    isModalOpen: isAnyModalOpen,
    handlers: {
      onSearch: () => setIsSearchOpen(true),
      onRegister: () => {
        setRegisterInitialBarcode('');
        setIsRegisterOpen(true);
      },
      onDiscount: () => discountInputRef.current?.focus(),
      onPayment: () => {
        if (cart.length > 0) {
          setIsPaymentOpen(true);
        } else {
          sound.playErrorAlert();
          setStatusMessage({ text: 'Adicione pelo menos um item antes de finalizar (F5).', type: 'error' });
        }
      },
      onReprint: () => handleReprintLast(),
      onCancel: () => cancelSale(),
      onDelete: () => {
        if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
          removeItem(selectedCartIndex);
        }
      },
    },
  });

  return (
    <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
      {/* Top Banner: Barcode scanner field + Quick shortcuts */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600">
              <Barcode className="w-6 h-6" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Passe o leitor de código de barras ou digite o código..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-blue-500/80 rounded-xl text-lg font-bold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white font-mono placeholder:text-slate-400 shadow-inner"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="submit"
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <span>Adicionar</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Pesquisar produto pelo nome (F2)"
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>Buscar (F2)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRegisterInitialBarcode(barcodeInput || '');
                setIsRegisterOpen(true);
              }}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Cadastrar novo produto (F3)"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Cadastrar (F3)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickPanel(!showQuickPanel)}
              className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                showQuickPanel
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Exibir ou recolher a vitrine rápida de balcão (Padaria, Lanchonete e Favoritos)"
            >
              <span>⭐ Balcão</span>
            </button>
          </div>
        </form>

        {/* Status Message / Notification */}
        {statusMessage && (
          <div
            className={`mt-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            {statusMessage.type === 'error' && registerInitialBarcode && (
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="underline cursor-pointer hover:text-rose-900 ml-2"
              >
                Cadastrar agora
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vitrine de Itens Rápidos de Balcão (Padaria / Cafeteria / Favoritos) */}
      {showQuickPanel && (
        <QuickItemsPanel
          products={productsList}
          onSelectProduct={handleProductSelection}
        />
      )}

      {/* Main 2-Column POS Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Cart Items Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="bg-slate-800 text-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider grid grid-cols-12 gap-2 shrink-0">
            <span className="col-span-1 text-center">#</span>
            <span className="col-span-5">Produto</span>
            <span className="col-span-2 text-center">Qtd</span>
            <span className="col-span-2 text-right">Unitário</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Barcode className="w-16 h-16 text-slate-300 stroke-[1.2] mb-3" />
                <div className="text-base font-bold text-slate-700">Caixa Livre · Aguardando Itens</div>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Passe o leitor de código de barras ou use as teclas de atalho: <strong className="text-blue-600">F2</strong> para buscar por nome ou <strong className="text-blue-600">F3</strong> para cadastrar.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const isSelected = selectedCartIndex === index;
                return (
                  <div
                    key={item.product.id}
                    onClick={() => setSelectedCartIndex(index)}
                    className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Index */}
                    <div className="col-span-1 text-center font-mono text-slate-500 font-bold">
                      {index + 1}
                    </div>

                    {/* Product Name & Barcode */}
                    <div className="col-span-5 min-w-0">
                      <div className="font-bold text-slate-900 truncate text-sm">{item.product.name}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-mono">
                        <span>{item.product.barcode || 'Sem código'}</span>
                        <span>·</span>
                        <span className="font-bold text-slate-700">{item.product.unit}</span>
                        {item.size && (
                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                            Tam: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-medium text-[10px]">
                            Cor: {item.color}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const step = item.product.unit === 'KG' ? 0.1 : 1;
                          updateItemQuantity(index, Math.max(0, +(item.quantity - step).toFixed(3)));
                        }}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={item.product.unit === 'KG' ? item.quantity.toFixed(3) : item.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                          updateItemQuantity(index, val);
                        }}
                        className="w-14 text-center font-mono font-bold text-xs py-0.5 border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const step = item.product.unit === 'KG' ? 0.1 : 1;
                          updateItemQuantity(index, +(item.quantity + step).toFixed(3));
                        }}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 text-right font-mono tabular-nums text-slate-700">
                      {formatMoney(item.unit_price_cents)}
                      {item.product.unit === 'KG' && <span className="text-[10px] text-slate-400">/kg</span>}
                    </div>

                    {/* Item Total & Delete */}
                    <div className="col-span-2 flex items-center justify-end gap-2 text-right">
                      <span className="font-mono font-extrabold tabular-nums text-slate-900 text-sm">
                        {formatMoney(item.total_cents)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(index);
                        }}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                        title="Remover item (Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer Bar */}
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div>
              Total de itens: <strong className="text-slate-900">{cart.length}</strong> (
              {cart.reduce((acc, i) => acc + i.quantity, 0)} unidades)
            </div>
            <div className="text-[11px] text-slate-500">
              Pressione <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Delete</kbd> para remover o item selecionado
            </div>
          </div>
        </div>

        {/* Right: Checkout & Grand Total Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Identified Product Spotlight */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Último Produto Identificado
            </div>
            {lastScannedProduct ? (
              <div>
                <div className="text-base font-extrabold text-slate-900 truncate">
                  {lastScannedProduct.name}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-mono">
                    {lastScannedProduct.barcode || 'Sem código'}
                  </span>
                  <span className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums">
                    {formatMoney(lastScannedProduct.sale_price_cents)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-2">
                Nenhum produto lido recentemente.
              </div>
            )}
          </div>

          {/* Discount & Totals Box */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex-1 flex flex-col justify-between">
            <div>
              {/* Discount Input (F4) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <span>Desconto</span>
                    <span className="text-[10px] text-blue-600 font-mono">(F4)</span>
                  </label>
                  <div className="flex rounded border border-slate-300 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('reais')}
                      className={`px-2 py-0.5 cursor-pointer ${
                        discountType === 'reais' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 cursor-pointer ${
                        discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    ref={discountInputRef}
                    type="text"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder={discountType === 'reais' ? '0,00' : '0%'}
                    className="w-full pl-8 pr-3 py-1.5 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white tabular-nums"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {discountType === 'reais' ? (
                      <DollarSign className="w-3.5 h-3.5" />
                    ) : (
                      <Percent className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Subtotal & Discount summary */}
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 tabular-nums">
                <div className="flex justify-between">
                  <span>Subtotal da Venda:</span>
                  <span className="font-mono font-medium text-slate-800">{formatMoney(subtotalCents)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Desconto Concedido:</span>
                    <span className="font-mono">-{formatMoney(discountCents)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Grande (PRD Requisito 9: Total da venda em fonte muito grande) */}
            <div className="my-4 p-4 bg-slate-900 text-white rounded-xl shadow-inner text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                TOTAL A PAGAR
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-emerald-400 my-1 font-mono">
                {formatMoney(finalTotalCents)}
              </div>
              <div className="text-[11px] text-slate-400">
                {cart.length} {cart.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </div>
            </div>

            {/* Big Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (cart.length === 0) {
                    sound.playErrorAlert();
                    setStatusMessage({ text: 'Adicione pelo menos um item para finalizar.', type: 'error' });
                    return;
                  }
                  setIsPaymentOpen(true);
                }}
                disabled={cart.length === 0}
                className={`w-full py-4 px-4 font-extrabold rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  cart.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg active:scale-98'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>FINALIZAR VENDA (F5)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReprintLast}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Reimprimir o comprovante da última venda realizada (F6)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Última (F6)</span>
                </button>

                <button
                  type="button"
                  onClick={cancelSale}
                  disabled={cart.length === 0}
                  className={`py-2.5 px-3 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    cart.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300'
                  }`}
                  title="Cancelar a venda em andamento (ESC)"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar (ESC)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Localizar Produto (F2) */}
      {isSearchOpen && (
        <QuickSearchModal
          products={productsList}
          onSelectProduct={(p) => {
            handleProductSelection(p);
            setIsSearchOpen(false);
          }}
          onClose={() => {
            setIsSearchOpen(false);
            focusBarcode();
          }}
          onOpenRegister={(code) => {
            setRegisterInitialBarcode(code || '');
            setIsRegisterOpen(true);
          }}
        />
      )}

      {/* MODAL: Pesagem / Quantidade KG */}
      {weightModalProduct && (
        <WeightModal
          product={weightModalProduct}
          onClose={() => {
            setWeightModalProduct(null);
            focusBarcode();
          }}
          onConfirm={(quantityKg, calculatedTotalCents) => {
            addWeightedProductToCart(weightModalProduct, quantityKg, calculatedTotalCents);
            setWeightModalProduct(null);
            focusBarcode();
          }}
        />
      )}

      {/* MODAL: Cadastrar Produto (F3) */}
      {isRegisterOpen && (
        <ProductFormModal
          initialBarcode={registerInitialBarcode}
          onClose={() => {
            setIsRegisterOpen(false);
            focusBarcode();
          }}
          onSaved={(newProduct) => {
            addProductToCart(newProduct, 1);
            setIsRegisterOpen(false);
            loadProducts();
            if (onRefreshData) onRefreshData();
            focusBarcode();
          }}
        />
      )}

      {/* MODAL: Finalizar Pagamento (F5) */}
      {isPaymentOpen && (
        <PaymentModal
          items={cart}
          discountCents={discountCents}
          settings={settings}
          onClose={() => {
            setIsPaymentOpen(false);
            focusBarcode();
          }}
          onSaleSuccess={() => {
            setCart([]);
            setDiscountInput('');
            setLastScannedProduct(null);
            setSelectedCartIndex(-1);
            setIsPaymentOpen(false);
            if (onRefreshData) onRefreshData();
            focusBarcode();
          }}
        />
      )}

      {/* MODAL: Reimpressão de Venda Anterior (F6) */}
      {reprintSale && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Reimpressão de Comprovante</h3>
              <button
                onClick={() => setReprintSale(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <ThermalReceipt
              sale={reprintSale.sale}
              items={reprintSale.items}
              settings={settings}
              onClose={() => setReprintSale(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
