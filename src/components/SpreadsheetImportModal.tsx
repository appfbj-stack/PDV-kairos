/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Modal de Importação de Planilhas (CSV e XLSX)
 * Valida códigos duplicados, preços e quantidades antes de confirmar a importação
 */

import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, UnitType } from '../types/pdv';
import { db } from '../services/db';
import { parseMoneyToCents, formatMoney } from '../services/formatters';

interface SpreadsheetImportModalProps {
  existingProducts: Product[];
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  rowNumber: number;
  barcode: string;
  name: string;
  category: string;
  costPriceCents: number;
  salePriceCents: number;
  stockQuantity: number;
  minimumStock: number;
  unit: UnitType;
  isValid: boolean;
  errors: string[];
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  existingProducts,
  onClose,
  onImportComplete,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        processImportData(rawJson);
      } catch (err) {
        alert('Erro ao ler arquivo da planilha: ' + (err as Error).message);
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const processImportData = (rows: Record<string, unknown>[]) => {
    const existingBarcodes = new Set(existingProducts.map((p) => p.barcode.trim().toLowerCase()).filter(Boolean));
    const sheetBarcodes = new Set<string>();

    const processed: ParsedRow[] = rows.map((raw, idx) => {
      const rowNum = idx + 2; // Linha 1 é cabeçalho
      const errors: string[] = [];

      // Mapeamento flexível de colunas (busca nomes de colunas em português e variações comuns)
      const getField = (aliases: string[]): string => {
        for (const key of Object.keys(raw)) {
          const cleanKey = key.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          for (const alias of aliases) {
            if (cleanKey.includes(alias)) {
              return String(raw[key] || '').trim();
            }
          }
        }
        return '';
      };

      const barcode = getField(['codigo', 'barcode', 'barras', 'ean', 'cod']);
      const name = getField(['nome', 'descricao', 'produto', 'title', 'name']);
      const category = getField(['categoria', 'grupo', 'secao']) || 'Geral';
      const costRaw = getField(['custo', 'cost', 'preco_custo']);
      const saleRaw = getField(['venda', 'preco', 'price', 'preco_venda', 'valor']);
      const stockRaw = getField(['estoque', 'qtd', 'quantidade', 'stock']);
      const minStockRaw = getField(['minimo', 'estoque_minimo']);
      const unitRaw = getField(['unidade', 'un', 'medida']).toUpperCase();

      // Validação do nome
      if (!name) {
        errors.push('Nome do produto ausente');
      }

      // Validação do código de barras
      if (barcode) {
        const cleanBar = barcode.toLowerCase();
        if (sheetBarcodes.has(cleanBar)) {
          errors.push(`Código duplicado na própria planilha (${barcode})`);
        } else if (existingBarcodes.has(cleanBar)) {
          errors.push(`Código já cadastrado no sistema (${barcode})`);
        }
        sheetBarcodes.add(cleanBar);
      }

      // Preço de venda
      const salePriceCents = parseMoneyToCents(saleRaw || '0');
      if (salePriceCents <= 0) {
        errors.push('Preço de venda deve ser maior que zero');
      }

      const costPriceCents = parseMoneyToCents(costRaw || '0');
      const stockQuantity = parseFloat(stockRaw.replace(',', '.')) || 0;
      const minimumStock = parseFloat(minStockRaw.replace(',', '.')) || 0;

      let validUnit: UnitType = 'UN';
      if (['KG', 'L', 'CX', 'PCT', 'MT'].includes(unitRaw)) {
        validUnit = unitRaw as UnitType;
      }

      return {
        rowNumber: rowNum,
        barcode,
        name,
        category,
        costPriceCents,
        salePriceCents,
        stockQuantity,
        minimumStock,
        unit: validUnit,
        isValid: errors.length === 0,
        errors,
      };
    });

    const validCount = processed.filter((r) => r.isValid).length;
    const invalidCount = processed.length - validCount;

    setParsedRows(processed);
    setImportSummary({
      total: processed.length,
      valid: validCount,
      invalid: invalidCount,
    });
    setIsProcessing(false);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Nenhum produto válido para importação.');
      return;
    }

    try {
      setIsSaving(true);
      // Importa produtos em lote
      for (const row of validRows) {
        await db.saveProduct({
          barcode: row.barcode,
          name: row.name,
          category: row.category,
          cost_price_cents: row.costPriceCents,
          sale_price_cents: row.salePriceCents,
          stock_quantity: row.stockQuantity,
          minimum_stock: row.minimumStock,
          unit: row.unit,
          active: true,
        });
      }

      alert(`Sucesso! ${validRows.length} produtos foram importados com sucesso.`);
      onImportComplete();
    } catch (err) {
      alert('Erro durante a gravação da importação: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Baixa modelo de planilha exemplo
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Codigo de Barras': '7891234560011',
        'Nome do Produto': 'Biscoito Recheado Chocolate 140g',
        'Categoria': 'Alimentos',
        'Preco de Custo': '2,40',
        'Preco de Venda': '3,99',
        'Estoque Atual': '30',
        'Estoque Minimo': '10',
        'Unidade': 'UN',
      },
      {
        'Codigo de Barras': '7891234560028',
        'Nome do Produto': 'Papel Higiênico Folha Dupla 4 Rolos',
        'Categoria': 'Higiene',
        'Preco de Custo': '5,80',
        'Preco de Venda': '8,50',
        'Estoque Atual': '24',
        'Estoque Minimo': '8',
        'Unidade': 'PCT',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_kairos_pdv.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Importar Produtos de Planilha</h2>
              <div className="text-xs text-slate-500">Compatível com arquivos Excel (.xlsx, .xls) e CSV</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        {!importSummary ? (
          <div className="my-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50">
            <Upload className="w-12 h-12 text-blue-600 mb-3" />
            <div className="text-sm font-bold text-slate-800">Selecione sua planilha de produtos</div>
            <div className="text-xs text-slate-500 mt-1 mb-4">Arquivos .xlsx, .xls ou .csv</div>

            <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer">
              <span>Escolher Arquivo</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-4 text-xs text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Baixar modelo de planilha preenchido (.xlsx)
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 my-3">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                <span className="text-slate-500">Arquivo:</span>
                <div className="font-bold text-slate-800 truncate">{fileName}</div>
                <div className="text-slate-600 mt-1">Total: {importSummary.total} linhas</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 font-medium">Produtos Válidos:</span>
                <div className="text-xl font-extrabold text-emerald-800">{importSummary.valid}</div>
                <div className="text-emerald-600 text-[11px]">Prontos para gravar</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-rose-700 font-medium">Com Inconsistências:</span>
                <div className="text-xl font-extrabold text-rose-800">{importSummary.invalid}</div>
                <div className="text-rose-600 text-[11px]">Serão ignorados</div>
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              <div className="bg-slate-100 text-slate-700 font-bold px-3 py-2 grid grid-cols-12 gap-2 sticky top-0 uppercase tracking-wider text-[11px]">
                <span className="col-span-1">Linha</span>
                <span className="col-span-3">Código</span>
                <span className="col-span-4">Nome</span>
                <span className="col-span-2 text-right">Preço Venda</span>
                <span className="col-span-2 text-center">Status</span>
              </div>
              {parsedRows.map((row) => (
                <div
                  key={row.rowNumber}
                  className={`px-3 py-2 grid grid-cols-12 gap-2 items-center ${
                    row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'
                  }`}
                >
                  <span className="col-span-1 font-mono text-slate-500">{row.rowNumber}</span>
                  <span className="col-span-3 font-mono truncate">{row.barcode || '—'}</span>
                  <div className="col-span-4 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{row.name || 'Sem nome'}</div>
                    {!row.isValid && (
                      <div className="text-[10px] text-rose-600 font-medium">
                        {row.errors.join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="col-span-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {formatMoney(row.salePriceCents)}
                  </span>
                  <div className="col-span-2 flex items-center justify-center">
                    {row.isValid ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Válido</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Inválido</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {importSummary && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Escolher outro arquivo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isSaving || importSummary.valid === 0}
                className={`px-5 py-2 text-white font-bold rounded-lg text-xs transition-colors shadow flex items-center gap-2 cursor-pointer ${
                  isSaving || importSummary.valid === 0
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSaving ? 'Importando...' : `Confirmar Importação de ${importSummary.valid} Produtos`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
