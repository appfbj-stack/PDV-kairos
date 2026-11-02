/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Emissão e Visualização de Comprovante Térmico (58mm e 80mm)
 * Compatível com impressoras térmicas comuns (Epson, Bematech, Elgin, Daruma, POS-58/80) e convencionais
 */

import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { Sale, SaleItem, Settings } from '../types/pdv';
import { formatMoney, formatDateTime, getPaymentMethodLabel } from '../services/formatters';

interface ThermalReceiptProps {
  sale: Sale;
  items: SaleItem[];
  settings: Settings;
  onClose?: () => void;
  showControls?: boolean;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  items,
  settings,
  onClose,
  showControls = true,
}) => {
  const is58mm = settings.printer_width === '58mm';
  const widthClass = is58mm ? 'max-w-[280px] text-[11px]' : 'max-w-[340px] text-xs';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    let txt = `================================\n`;
    txt += `${settings.store_name}\n`;
    if (settings.cnpj) txt += `CNPJ: ${settings.cnpj}\n`;
    if (settings.address) txt += `${settings.address}\n`;
    if (settings.phone) txt += `Tel: ${settings.phone}\n`;
    txt += `================================\n`;
    txt += `COMPROVANTE NAO FISCAL\n`;
    txt += `Venda: #${sale.sale_number} | Data: ${formatDateTime(sale.created_at)}\n`;
    txt += `--------------------------------\n`;
    txt += `ITEM  QTD x UNIT        TOTAL\n`;
    txt += `--------------------------------\n`;
    items.forEach((item, idx) => {
      const details = [
        item.size ? `Tam: ${item.size}` : null,
        item.color ? `Cor: ${item.color}` : null,
      ].filter(Boolean).join(' · ');
      const nameWithDetails = details ? `${item.product_name} (${details})` : item.product_name;
      txt += `${idx + 1}. ${nameWithDetails}\n`;
      const unitLabel = item.unit || 'UN';
      const qtyFormatted = unitLabel === 'KG' ? `${item.quantity.toFixed(3)} kg` : `${item.quantity} ${unitLabel.toLowerCase()}`;
      txt += `   ${qtyFormatted} x ${formatMoney(item.unit_price_cents)} = ${formatMoney(item.total_cents)}\n`;
    });
    txt += `--------------------------------\n`;
    txt += `Subtotal: ${formatMoney(sale.subtotal_cents)}\n`;
    if (sale.discount_cents > 0) {
      txt += `Desconto: -${formatMoney(sale.discount_cents)}\n`;
    }
    txt += `TOTAL: ${formatMoney(sale.total_cents)}\n`;
    txt += `Forma Pagto: ${getPaymentMethodLabel(sale.payment_method)}\n`;
    if (sale.payment_method === 'dinheiro') {
      txt += `Valor Recebido: ${formatMoney(sale.amount_received_cents)}\n`;
      txt += `Troco: ${formatMoney(sale.change_cents)}\n`;
    }
    txt += `================================\n`;
    txt += `${settings.receipt_footer}\n`;
    txt += `Kairós PDV - Sistema Offline\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_venda_${sale.sale_number}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Action bar for screen view */}
      {showControls && (
        <div className="flex items-center gap-2 mb-4 w-full max-w-sm justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-medium transition-colors cursor-pointer"
              title="Salvar comprovante em arquivo de texto simples"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salvar TXT</span>
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Printable thermal receipt view */}
      <div
        id="thermal-print-area"
        className={`receipt-paper p-5 border border-slate-300 rounded-sm font-mono-numbers text-slate-900 leading-tight w-full ${widthClass}`}
      >
        {/* Header */}
        <div className="text-center pb-2 mb-2 border-b border-dashed border-slate-400">
          <div className="font-bold text-sm uppercase tracking-wider">{settings.store_name}</div>
          {settings.cnpj && <div className="text-[11px] text-slate-700">CNPJ: {settings.cnpj}</div>}
          {settings.address && <div className="text-[10px] text-slate-600">{settings.address}</div>}
          {settings.phone && <div className="text-[10px] text-slate-600">Tel: {settings.phone}</div>}
        </div>

        {/* Info */}
        <div className="text-center pb-2 mb-2 border-b border-dashed border-slate-400 text-[11px]">
          <div className="font-bold uppercase tracking-tight text-slate-800">
            COMPROVANTE NÃO FISCAL
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>VENDA #{sale.sale_number}</span>
            <span>{formatDateTime(sale.created_at)}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="pb-2 mb-2 border-b border-dashed border-slate-400">
          <div className="text-[10px] font-semibold text-slate-600 pb-1 border-b border-dotted border-slate-300 flex justify-between">
            <span>DESCRIÇÃO</span>
            <span>TOTAL</span>
          </div>
          <div className="space-y-1.5 pt-1.5">
            {items.map((item, idx) => {
              const details = [
                item.size ? `Tam: ${item.size}` : null,
                item.color ? `Cor: ${item.color}` : null,
              ].filter(Boolean).join(' · ');
              const unitLabel = item.unit || 'UN';
              const qtyFormatted =
                unitLabel === 'KG'
                  ? `${item.quantity.toFixed(3)} kg`
                  : `${item.quantity} ${unitLabel.toLowerCase()}`;

              return (
                <div key={item.id || idx} className="text-[11px]">
                  <div className="font-semibold truncate">
                    {idx + 1}. {item.product_name}
                    {details && <span className="font-normal text-slate-600 text-[10px]"> [{details}]</span>}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-700 tabular-nums">
                    <span>
                      {qtyFormatted} x {formatMoney(item.unit_price_cents)}
                      {item.discount_cents > 0 && ` (-${formatMoney(item.discount_cents)})`}
                    </span>
                    <span className="font-medium">{formatMoney(item.total_cents)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 pb-2 mb-2 border-b border-dashed border-slate-400 tabular-nums">
          <div className="flex justify-between text-[11px]">
            <span>SUBTOTAL:</span>
            <span>{formatMoney(sale.subtotal_cents)}</span>
          </div>
          {sale.discount_cents > 0 && (
            <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
              <span>DESCONTO:</span>
              <span>-{formatMoney(sale.discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-sm border-t border-dotted border-slate-400 pt-1">
            <span>TOTAL A PAGAR:</span>
            <span>{formatMoney(sale.total_cents)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-1 pb-2 mb-2 border-b border-dashed border-slate-400 text-[11px] tabular-nums">
          <div className="flex justify-between">
            <span>FORMA DE PAGAMENTO:</span>
            <span className="font-bold">{getPaymentMethodLabel(sale.payment_method)}</span>
          </div>
          {sale.payment_method === 'dinheiro' && (
            <>
              <div className="flex justify-between text-slate-700">
                <span>VALOR RECEBIDO:</span>
                <span>{formatMoney(sale.amount_received_cents)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>TROCO:</span>
                <span>{formatMoney(sale.change_cents)}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-1 text-[10px] text-slate-600 space-y-1">
          <div>{settings.receipt_footer || 'Obrigado pela preferência! Volte sempre.'}</div>
          <div className="text-[9px] text-slate-400">Kairós PDV 1.0 - Sem mensalidade</div>
        </div>
      </div>
    </div>
  );
};
