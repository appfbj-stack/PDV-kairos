/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Tipos e Interfaces do Sistema Multi-Segmento
 * Suporta: Padaria & Confeitaria, Loja de Roupas & Calçados, Mercearia, Bazar/Ferragens e Comércio Geral
 * Todos os valores monetários são estritamente inteiros em centavos (ex: R$ 19,90 = 1990)
 */

export type BusinessSegment = 'padaria' | 'roupas' | 'mercado' | 'variedades' | 'geral';

export type UnitType = 'UN' | 'KG' | 'L' | 'CX' | 'MT' | 'PCT' | 'PAR' | 'FATIA';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  cost_price_cents: number;
  sale_price_cents: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: UnitType;
  active: boolean;
  // Atributos de Moda / Roupas / Calçados
  size?: string; // P, M, G, GG, 36, 38, 40, etc.
  color?: string; // Preto, Azul, Floral, etc.
  // Atributos de Padaria / Balcão
  is_favorite?: boolean; // Item rápido exibido no teclado de balcão
  scale_barcode_code?: string; // Código de 4 a 6 dígitos na balança (ex: 00010 para Pão Francês)
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'outro';

export type SaleStatus = 'completed' | 'cancelled';

export interface Sale {
  id: string;
  sale_number: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  amount_received_cents: number;
  change_cents: number;
  status: SaleStatus;
  cash_session_id?: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  total_cents: number;
  size?: string;
  color?: string;
  unit?: UnitType;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  total_cents: number;
  size?: string;
  color?: string;
}

export interface CashSession {
  id: string;
  opened_at: string;
  closed_at?: string;
  opening_amount_cents: number;
  closing_amount_cents?: number;
  expected_amount_cents?: number;
  notes?: string;
  status: 'open' | 'closed';
}

export type CashOperationType = 'sangria' | 'suprimento';

export interface CashOperation {
  id: string;
  session_id: string;
  type: CashOperationType;
  amount_cents: number;
  reason: string;
  created_at: string;
}

export type StockMovementType = 'entrada' | 'saida' | 'venda' | 'cancelamento' | 'ajuste';

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  reference_id?: string;
  reason?: string;
  created_at: string;
}

export type PrinterWidth = '58mm' | '80mm' | 'padrao';

export interface Settings {
  store_name: string;
  cnpj: string;
  address: string;
  phone: string;
  receipt_footer: string;
  printer_width: PrinterWidth;
  auto_print: boolean;
  backup_dir: string;
  last_backup_at?: string;
  allow_negative_stock: boolean;
  beep_sound: boolean;
  // Multi-segmento
  business_segment: BusinessSegment;
  enable_scale_barcode: boolean; // Leitura de balança padrão 2 CCCCC VVVVV D
  show_quick_items: boolean; // Painel de itens rápidos de balcão / padaria
  enable_apparel_grid: boolean; // Grade de tamanho e cor para vestuário
}

export interface BackupData {
  version: string;
  created_at: string;
  checksum: string;
  tables: {
    products: Product[];
    sales: Sale[];
    sale_items: SaleItem[];
    cash_sessions: CashSession[];
    cash_operations: CashOperation[];
    stock_movements: StockMovement[];
    settings: Settings;
  };
}

export interface IntegrityCheckResult {
  valid: boolean;
  totalProducts: number;
  totalSales: number;
  totalSaleItems: number;
  totalMovements: number;
  errors: string[];
}
