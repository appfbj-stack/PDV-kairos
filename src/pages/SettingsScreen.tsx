/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Configurações Gerais do Estabelecimento, Ramo de Atividade e Impressão
 */

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  Volume2,
  Boxes,
  Check,
  RotateCcw,
  Sparkles,
  Scale,
  Shirt,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { Settings, PrinterWidth, BusinessSegment } from '../types/pdv';
import { db } from '../services/db';
import { sound } from '../services/sound';
import { SEGMENT_LABELS } from '../services/segmentPresets';

interface SettingsScreenProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  onRefreshAll?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAll,
}) => {
  const [storeName, setStoreName] = useState(settings.store_name);
  const [cnpj, setCnpj] = useState(settings.cnpj);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>(settings.printer_width);
  const [autoPrint, setAutoPrint] = useState(settings.auto_print);
  const [beepSound, setBeepSound] = useState(settings.beep_sound);
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings.allow_negative_stock);

  // Novos campos multi-segmento
  const [segment, setSegment] = useState<BusinessSegment>(settings.business_segment || 'geral');
  const [enableScaleBarcode, setEnableScaleBarcode] = useState(settings.enable_scale_barcode ?? true);
  const [showQuickItems, setShowQuickItems] = useState(settings.show_quick_items ?? true);
  const [enableApparelGrid, setEnableApparelGrid] = useState(
    settings.enable_apparel_grid ?? (settings.business_segment === 'roupas')
  );

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [presetNotice, setPresetNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: Settings = {
      ...settings,
      store_name: storeName.trim() || 'Minha Loja',
      cnpj: cnpj.trim(),
      address: address.trim(),
      phone: phone.trim(),
      receipt_footer: receiptFooter.trim(),
      printer_width: printerWidth,
      auto_print: autoPrint,
      beep_sound: beepSound,
      allow_negative_stock: allowNegativeStock,
      business_segment: segment,
      enable_scale_barcode: enableScaleBarcode,
      show_quick_items: showQuickItems,
      enable_apparel_grid: enableApparelGrid,
    };

    sound.setEnabled(beepSound);
    await db.updateSettings(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestPrint = () => {
    window.print();
  };

  const handleTestBeep = () => {
    sound.setEnabled(beepSound);
    sound.playScanSuccess();
  };

  const handleLoadPresetCatalog = async (targetSegment: BusinessSegment) => {
    const label = SEGMENT_LABELS[targetSegment]?.title || targetSegment;
    const ok = window.confirm(
      `Deseja carregar o catálogo de produtos modelo para "${label}"?\n\n` +
      `Isso adicionará itens pré-configurados com unidades (ex: KG na Padaria, Grade de Tamanhos/Cores em Roupas) ao seu inventário.`
    );
    if (!ok) return;

    try {
      setLoadingPreset(true);
      const count = await db.loadSegmentPreset(targetSegment);

      // Atualiza configurações recomendadas para o segmento
      const isPadaria = targetSegment === 'padaria';
      const isRoupas = targetSegment === 'roupas';
      const isMercado = targetSegment === 'mercado';

      const updatedSettings: Settings = {
        ...settings,
        store_name: storeName || (isPadaria ? 'Padaria & Confeitaria Modelo' : isRoupas ? 'Boutique & Moda Modelo' : isMercado ? 'Mercadinho Central' : storeName),
        business_segment: targetSegment,
        enable_scale_barcode: isPadaria || isMercado || enableScaleBarcode,
        show_quick_items: isPadaria || showQuickItems,
        enable_apparel_grid: isRoupas || enableApparelGrid,
      };

      setSegment(targetSegment);
      if (isPadaria) {
        setEnableScaleBarcode(true);
        setShowQuickItems(true);
      }
      if (isRoupas) {
        setEnableApparelGrid(true);
      }

      await db.updateSettings(updatedSettings);
      onUpdateSettings(updatedSettings);

      setPresetNotice({
        text: `Catálogo de ${label} carregado com sucesso! ${count} produtos cadastrados.`,
        type: 'success',
      });
      sound.playScanSuccess();

      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setPresetNotice({
        text: `Erro ao carregar catálogo: ${err?.message || 'Falha no processo'}`,
        type: 'error',
      });
    } finally {
      setLoadingPreset(false);
      setTimeout(() => setPresetNotice(null), 5000);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full gap-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configurações do Sistema</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize o ramo de atividade, balança, grade de roupas, impressora e dados da loja
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      {presetNotice && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            presetNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{presetNotice.text}</span>
          <button
            type="button"
            onClick={() => setPresetNotice(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer ml-3"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Ramo de Atividade e Modelos Rápidos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Ramo de Atividade do Seu Estabelecimento</h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Adapta telas, balança e grade de variações
            </span>
          </div>

          {/* Segment Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(SEGMENT_LABELS) as BusinessSegment[]).map((segKey) => {
              const info = SEGMENT_LABELS[segKey];
              const isSelected = segment === segKey;

              return (
                <div
                  key={segKey}
                  onClick={() => {
                    setSegment(segKey);
                    if (segKey === 'padaria') {
                      setEnableScaleBarcode(true);
                      setShowQuickItems(true);
                    } else if (segKey === 'roupas') {
                      setEnableApparelGrid(true);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{info.icon}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{info.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {info.subtitle}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loadingPreset}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadPresetCatalog(segKey);
                    }}
                    className="mt-3 w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    title={`Carregar produtos prontos para ${info.title}`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Carregar Catálogo Modelo</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Segment Feature Toggles */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="enable-scale"
                checked={enableScaleBarcode}
                onChange={(e) => setEnableScaleBarcode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 cursor-pointer"
              />
              <label htmlFor="enable-scale" className="text-xs text-slate-700 cursor-pointer">
                <strong className="block text-slate-900">Balança (EAN-13 c/ dígito 2)</strong>
                Reconhece etiquetas de peso/valor de balanças (Filizola, Toledo, Elgin) para Padaria e Açougue.
              </label>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="show-quick-items"
                checked={showQuickItems}
                onChange={(e) => setShowQuickItems(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 cursor-pointer"
              />
              <label htmlFor="show-quick-items" className="text-xs text-slate-700 cursor-pointer">
                <strong className="block text-slate-900">Vitrine de Balcão (1-Clique)</strong>
                Exibe carrossel de itens rápidos de balcão (pães, cafés, lanches, favoritos) no topo do PDV.
              </label>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="enable-apparel"
                checked={enableApparelGrid}
                onChange={(e) => setEnableApparelGrid(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 cursor-pointer"
              />
              <label htmlFor="enable-apparel" className="text-xs text-slate-700 cursor-pointer">
                <strong className="block text-slate-900">Grade de Tamanho e Cor</strong>
                Ativa campos de Tamanho (P, M, G, 38..) e Cores para Lojas de Roupas, Calçados e Acessórios.
              </label>
            </div>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Store className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Identificação do Estabelecimento Comercial</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Nome Fantasia da Loja *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Mercearia Central ou Padaria Pão Dourado"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                CNPJ / CPF
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 12.345.678/0001-90"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Endereço Completo
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Principal, 120 - Centro"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Mensagem de Rodapé do Comprovante
            </label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Ex: Obrigado pela preferência! Volte sempre."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Impressão Térmica */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Impressora de Comprovantes (ESC/POS)</h2>
            </div>
            <button
              type="button"
              onClick={handleTestPrint}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-300 cursor-pointer"
            >
              Testar Impressão
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Largura da Bobina Térmica
              </label>
              <select
                value={printerWidth}
                onChange={(e) => setPrinterWidth(e.target.value as PrinterWidth)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold cursor-pointer"
              >
                <option value="80mm">80mm (Padrão mais comum em supermercados)</option>
                <option value="58mm">58mm (Bobina estreita / mini impressoras térmicas)</option>
                <option value="padrao">Padrão A4 / Folha de Papel Comum</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="auto-print"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="auto-print" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Imprimir comprovante automaticamente ao confirmar a venda
              </label>
            </div>
          </div>
        </div>

        {/* Som e Leitor USB */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Efeitos Sonoros do Leitor de Código de Barras</h2>
            </div>
            <button
              type="button"
              onClick={handleTestBeep}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-300 cursor-pointer"
            >
              Testar Beep
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="beep-sound"
              checked={beepSound}
              onChange={(e) => setBeepSound(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="beep-sound" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Emitir sinal sonoro de confirmação ao ler código de barras com sucesso
            </label>
          </div>
        </div>

        {/* Política de Estoque */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Regras de Venda e Estoque</h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allow-neg"
              checked={allowNegativeStock}
              onChange={(e) => setAllowNegativeStock(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="allow-neg" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Autorizar vendas mesmo com estoque zerado ou negativo (desmarque para bloquear vendas sem estoque)
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-md transition-colors cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
