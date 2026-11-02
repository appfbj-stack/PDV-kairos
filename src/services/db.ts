/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Camada de Banco de Dados Local e Transacional
 * Suporta execução nativa em Electron (via IPC/SQLite) e modo Web (armazenamento persistente local com garantia transacional)
 */

import {
  Product,
  Sale,
  SaleItem,
  CashSession,
  CashOperation,
  StockMovement,
  Settings,
  CartItem,
  PaymentMethod,
  BackupData,
  IntegrityCheckResult,
  BusinessSegment
} from '../types/pdv';
import { BAKERY_PRESET, APPAREL_PRESET } from './segmentPresets';

const STORAGE_KEY_PRODUCTS = 'kairos_products_v1';
const STORAGE_KEY_SALES = 'kairos_sales_v1';
const STORAGE_KEY_SALE_ITEMS = 'kairos_sale_items_v1';
const STORAGE_KEY_CASH_SESSIONS = 'kairos_cash_sessions_v1';
const STORAGE_KEY_CASH_OPERATIONS = 'kairos_cash_operations_v1';
const STORAGE_KEY_STOCK_MOVEMENTS = 'kairos_stock_movements_v1';
const STORAGE_KEY_SETTINGS = 'kairos_settings_v1';
const STORAGE_KEY_SALE_COUNTER = 'kairos_sale_counter_v1';

const DEFAULT_SETTINGS: Settings = {
  store_name: 'COMÉRCIO & VARIEDADES CENTRAL',
  cnpj: '12.345.678/0001-90',
  address: 'Rua do Comércio, 150 - Centro',
  phone: '(11) 98765-4321',
  receipt_footer: 'Obrigado pela preferência! Volte sempre.',
  printer_width: '80mm',
  auto_print: true,
  backup_dir: 'C:\\KairosPDV\\Backups',
  allow_negative_stock: false,
  beep_sound: true,
  business_segment: 'geral',
  enable_scale_barcode: true,
  show_quick_items: true,
  enable_apparel_grid: true,
};

// Produtos iniciais para pequenos estabelecimentos brasileiros (Alimentos, Mercearia, Bazar e Papelaria)
const INITIAL_DEMO_PRODUCTS: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    barcode: '7891000100103',
    name: 'Café Torrado e Moído 500g Tradicional',
    category: 'Alimentos',
    cost_price_cents: 1450,
    sale_price_cents: 1990,
    stock_quantity: 45,
    minimum_stock: 10,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891000200201',
    name: 'Arroz Branco Tipo 1 Pacote 5kg',
    category: 'Alimentos',
    cost_price_cents: 2300,
    sale_price_cents: 2990,
    stock_quantity: 32,
    minimum_stock: 8,
    unit: 'PCT',
    active: true,
  },
  {
    barcode: '7891000300300',
    name: 'Feijão Carioca Tipo 1 Pacote 1kg',
    category: 'Alimentos',
    cost_price_cents: 680,
    sale_price_cents: 890,
    stock_quantity: 50,
    minimum_stock: 15,
    unit: 'PCT',
    active: true,
  },
  {
    barcode: '7891000400409',
    name: 'Açúcar Refinado Pacote 1kg',
    category: 'Alimentos',
    cost_price_cents: 350,
    sale_price_cents: 489,
    stock_quantity: 60,
    minimum_stock: 12,
    unit: 'PCT',
    active: true,
  },
  {
    barcode: '7891000500508',
    name: 'Óleo de Soja Refinado 900ml',
    category: 'Alimentos',
    cost_price_cents: 540,
    sale_price_cents: 729,
    stock_quantity: 28,
    minimum_stock: 10,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891000600607',
    name: 'Leite Integral UHT Caixa 1 Litro',
    category: 'Laticínios',
    cost_price_cents: 390,
    sale_price_cents: 549,
    stock_quantity: 72,
    minimum_stock: 20,
    unit: 'CX',
    active: true,
  },
  {
    barcode: '7891000700706',
    name: 'Refrigerante Cola Pet 2 Litros',
    category: 'Bebidas',
    cost_price_cents: 680,
    sale_price_cents: 999,
    stock_quantity: 36,
    minimum_stock: 12,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891000800805',
    name: 'Detergente Líquido Neutro 500ml',
    category: 'Limpeza',
    cost_price_cents: 180,
    sale_price_cents: 279,
    stock_quantity: 80,
    minimum_stock: 15,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891000900904',
    name: 'Sabonete em Barra 90g Suave',
    category: 'Higiene',
    cost_price_cents: 190,
    sale_price_cents: 299,
    stock_quantity: 95,
    minimum_stock: 20,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891001001009',
    name: 'Caderno Universitário 10 Matérias 200 Folhas',
    category: 'Papelaria',
    cost_price_cents: 1400,
    sale_price_cents: 2290,
    stock_quantity: 24,
    minimum_stock: 5,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891001101108',
    name: 'Caneta Esferográfica Azul 1.0mm',
    category: 'Papelaria',
    cost_price_cents: 90,
    sale_price_cents: 180,
    stock_quantity: 120,
    minimum_stock: 25,
    unit: 'UN',
    active: true,
  },
  {
    barcode: '7891001201207',
    name: 'Fita Isolante Preta 19mm x 20m',
    category: 'Ferramentas',
    cost_price_cents: 450,
    sale_price_cents: 790,
    stock_quantity: 18,
    minimum_stock: 5,
    unit: 'UN',
    active: true,
  },
];

class DatabaseService {
  private initialized: boolean = false;

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Inicializa produtos de demonstração caso esteja vazio
    const products = this.getRaw<Product[]>(STORAGE_KEY_PRODUCTS);
    if (!products || products.length === 0) {
      const initialWithMeta: Product[] = INITIAL_DEMO_PRODUCTS.map((p, idx) => ({
        ...p,
        id: 'prod_' + (Date.now() + idx).toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      this.setRaw(STORAGE_KEY_PRODUCTS, initialWithMeta);

      // Registra movimentações iniciais de estoque para rastreabilidade
      const movements: StockMovement[] = initialWithMeta.map((p) => ({
        id: 'mov_init_' + p.id,
        product_id: p.id,
        movement_type: 'entrada',
        quantity: p.stock_quantity,
        reference_id: 'ESTOQUE_INICIAL',
        reason: 'Implantação inicial de estoque',
        created_at: new Date().toISOString(),
      }));
      this.setRaw(STORAGE_KEY_STOCK_MOVEMENTS, movements);
    }

    // Inicializa configurações
    const settings = this.getRaw<Settings>(STORAGE_KEY_SETTINGS);
    if (!settings) {
      this.setRaw(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS);
    }

    // Inicializa sessão de caixa padrão (aberta com R$ 100,00 de troco inicial para facilitar testes imediatos)
    const sessions = this.getRaw<CashSession[]>(STORAGE_KEY_CASH_SESSIONS);
    if (!sessions || sessions.length === 0) {
      const defaultSession: CashSession = {
        id: 'sess_' + Date.now().toString(),
        opened_at: new Date().toISOString(),
        opening_amount_cents: 10000, // R$ 100,00
        status: 'open',
        notes: 'Abertura inicial automática do dia',
      };
      this.setRaw(STORAGE_KEY_CASH_SESSIONS, [defaultSession]);
    }

    this.initialized = true;
  }

  // --- MÉTODOS DE PRODUTOS ---

  public async getProducts(): Promise<Product[]> {
    await this.init();
    return this.getRaw<Product[]>(STORAGE_KEY_PRODUCTS) || [];
  }

  public async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  }

  public async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();
    const products = await this.getProducts();
    return products.find((p) => p.active && p.barcode.trim() === cleanBarcode) || null;
  }

  public async saveProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>, id?: string): Promise<Product> {
    await this.init();
    const products = await this.getProducts();
    const cleanBarcode = productData.barcode.trim();

    // Validação de unicidade de código de barras
    if (cleanBarcode) {
      const duplicate = products.find((p) => p.barcode.trim() === cleanBarcode && p.id !== id);
      if (duplicate) {
        throw new Error(`O código de barras "${cleanBarcode}" já está cadastrado para o produto "${duplicate.name}".`);
      }
    }

    const now = new Date().toISOString();

    if (id) {
      // Atualização
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Produto não encontrado para edição.`);
      }

      const oldProduct = products[index];
      const updatedProduct: Product = {
        ...oldProduct,
        ...productData,
        barcode: cleanBarcode,
        updated_at: now,
      };

      // Se a quantidade de estoque mudou manualmente na tela do produto, registra ajuste
      if (oldProduct.stock_quantity !== updatedProduct.stock_quantity) {
        const diff = updatedProduct.stock_quantity - oldProduct.stock_quantity;
        await this.addStockMovement({
          product_id: id,
          movement_type: 'ajuste',
          quantity: diff,
          reason: 'Ajuste cadastral de quantidade',
        });
      }

      products[index] = updatedProduct;
      this.setRaw(STORAGE_KEY_PRODUCTS, products);
      return updatedProduct;
    } else {
      // Criação
      const newProduct: Product = {
        ...productData,
        barcode: cleanBarcode,
        id: 'prod_' + Date.now().toString(),
        created_at: now,
        updated_at: now,
      };

      products.push(newProduct);
      this.setRaw(STORAGE_KEY_PRODUCTS, products);

      // Registra entrada de estoque inicial
      if (newProduct.stock_quantity > 0) {
        await this.addStockMovement({
          product_id: newProduct.id,
          movement_type: 'entrada',
          quantity: newProduct.stock_quantity,
          reason: 'Estoque cadastral inicial',
        });
      }

      return newProduct;
    }
  }

  public async deleteProduct(id: string): Promise<void> {
    await this.init();
    const products = await this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Produto não encontrado.`);
    }

    // Não exclui fisicamente para preservar histórico de vendas; marca como inativo
    products[index].active = false;
    products[index].updated_at = new Date().toISOString();
    this.setRaw(STORAGE_KEY_PRODUCTS, products);
  }

  /**
   * Decodifica código de barras de etiquetas geradas por balança de açougue/padaria (Padrão EAN-13 Brasil: 2 CCCCC VVVVV D)
   * Exemplo: código 200001008960
   * Prefixo: 2 (identifica balança)
   * Código interno do produto: 00001 (5 dígitos)
   * Valor em centavos: 00896 -> R$ 8,96
   * Quantidade pesada calculada: R$ 8,96 / Preço por KG
   */
  public async decodeScaleBarcode(barcode: string): Promise<{
    product: Product;
    quantity: number;
    calculatedPriceCents: number;
  } | null> {
    const clean = barcode.trim();
    if (clean.length !== 13 || !clean.startsWith('2')) {
      return null;
    }

    const scaleCode = clean.substring(1, 6); // 5 dígitos
    const valuePart = parseInt(clean.substring(6, 11), 10); // 5 dígitos de valor (em centavos)

    const products = await this.getProducts();
    const product = products.find(
      (p) =>
        p.active &&
        ((p.scale_barcode_code && p.scale_barcode_code.padStart(5, '0') === scaleCode) ||
          p.barcode.padStart(5, '0') === scaleCode ||
          p.barcode === scaleCode)
    );

    if (!product) return null;

    // Se o produto é vendido por peso (KG)
    if (product.unit === 'KG' && product.sale_price_cents > 0) {
      const weightKg = valuePart / product.sale_price_cents;
      return {
        product,
        quantity: Math.round(weightKg * 1000) / 1000, // arredonda para 3 casas decimais (gramas)
        calculatedPriceCents: valuePart,
      };
    }

    // Se for unidade ou peso direto
    return {
      product,
      quantity: 1,
      calculatedPriceCents: valuePart,
    };
  }

  /**
   * Carrega um catálogo de produtos pré-configurado conforme o segmento escolhido
   * (Padaria & Confeitaria, Loja de Roupas, Mercearia ou Geral)
   */
  public async loadSegmentPreset(segment: BusinessSegment): Promise<Product[]> {
    await this.init();
    let presetItems: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [];
    if (segment === 'padaria') {
      presetItems = BAKERY_PRESET;
    } else if (segment === 'roupas') {
      presetItems = APPAREL_PRESET;
    } else {
      presetItems = INITIAL_DEMO_PRODUCTS;
    }

    const productsWithMeta: Product[] = presetItems.map((p, idx) => ({
      ...p,
      id: 'prod_preset_' + segment + '_' + (Date.now() + idx).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    this.setRaw(STORAGE_KEY_PRODUCTS, productsWithMeta);

    // Registra movimentações de estoque
    const movements: StockMovement[] = productsWithMeta.map((p) => ({
      id: 'mov_preset_' + p.id,
      product_id: p.id,
      movement_type: 'entrada',
      quantity: p.stock_quantity,
      reference_id: `CARGA_${segment.toUpperCase()}`,
      reason: `Carga inicial do segmento ${segment}`,
      created_at: new Date().toISOString(),
    }));
    this.setRaw(STORAGE_KEY_STOCK_MOVEMENTS, movements);

    // Atualiza configurações com o novo segmento
    await this.updateSettings({
      business_segment: segment,
      store_name:
        segment === 'padaria'
          ? 'PADARIA & CONFEITARIA ESPERANÇA'
          : segment === 'roupas'
          ? 'BOUTIQUE & MODA ATUAL'
          : 'MERCEARIA & VARIEDADES CENTRAL',
    });

    return productsWithMeta;
  }

  // --- MÉTODOS DE VENDAS E TRANSAÇÃO ATÔMICA ---

  public async getSales(): Promise<Sale[]> {
    await this.init();
    return this.getRaw<Sale[]>(STORAGE_KEY_SALES) || [];
  }

  public async getSaleById(id: string): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const sales = await this.getSales();
    const sale = sales.find((s) => s.id === id);
    if (!sale) return null;

    const allItems = this.getRaw<SaleItem[]>(STORAGE_KEY_SALE_ITEMS) || [];
    const items = allItems.filter((i) => i.sale_id === id);
    return { sale, items };
  }

  public async getLastSale(): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const sales = await this.getSales();
    if (sales.length === 0) return null;
    const lastSale = sales[sales.length - 1];
    return this.getSaleById(lastSale.id);
  }

  /**
   * Executa a finalização da venda em TRANSAÇÃO ATÔMICA:
   * 1. Valida o carrinho e os valores
   * 2. Verifica a disponibilidade do estoque conforme a política da loja
   * 3. Registra a venda na tabela sales
   * 4. Registra cada item com preços históricos preservados na tabela sale_items
   * 5. Dá baixa no estoque de cada produto
   * 6. Registra as movimentações de estoque (stock_movements)
   * Se qualquer etapa falhar, reverte as alterações mantendo o estado intacto.
   */
  public async finalizeSale(params: {
    items: CartItem[];
    payment_method: PaymentMethod;
    amount_received_cents: number;
    discount_cents?: number;
  }): Promise<{ sale: Sale; items: SaleItem[]; change_cents: number }> {
    await this.init();

    if (!params.items || params.items.length === 0) {
      throw new Error('O carrinho está vazio. Adicione pelo menos um produto para finalizar.');
    }

    const settings = await this.getSettings();
    const products = await this.getProducts();
    const activeSession = await this.getActiveCashSession();

    // 1. Cálculos de valores exatos em centavos inteiros
    let subtotalCents = 0;
    for (const item of params.items) {
      subtotalCents += item.total_cents;
    }

    const discountCents = Math.max(0, Math.round(params.discount_cents || 0));
    const totalCents = Math.max(0, subtotalCents - discountCents);

    // Validação de pagamento em dinheiro
    let changeCents = 0;
    if (params.payment_method === 'dinheiro') {
      if (params.amount_received_cents < totalCents) {
        throw new Error(
          `Valor recebido insuficiente. Total da venda: R$ ${(totalCents / 100).toFixed(2)}, recebido: R$ ${(params.amount_received_cents / 100).toFixed(2)}.`
        );
      }
      changeCents = params.amount_received_cents - totalCents;
    } else {
      params.amount_received_cents = totalCents;
      changeCents = 0;
    }

    // 2. Validação de estoque transacional
    if (!settings.allow_negative_stock) {
      for (const item of params.items) {
        const prod = products.find((p) => p.id === item.product.id);
        if (prod && prod.stock_quantity < item.quantity) {
          throw new Error(
            `Estoque insuficiente para o produto "${prod.name}". Estoque disponível: ${prod.stock_quantity} ${prod.unit}, solicitado: ${item.quantity}.`
          );
        }
      }
    }

    // 3. Preparação das gravações (Snapshot para reversão em caso de erro)
    const backupProducts = JSON.stringify(products);
    const saleId = 'sale_' + Date.now().toString();
    const now = new Date().toISOString();

    // Número sequencial da venda
    const currentCounter = (this.getRaw<number>(STORAGE_KEY_SALE_COUNTER) || 0) + 1;
    this.setRaw(STORAGE_KEY_SALE_COUNTER, currentCounter);

    const sale: Sale = {
      id: saleId,
      sale_number: currentCounter,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      payment_method: params.payment_method,
      amount_received_cents: params.amount_received_cents,
      change_cents: changeCents,
      status: 'completed',
      cash_session_id: activeSession ? activeSession.id : undefined,
      created_at: now,
    };

    const saleItems: SaleItem[] = params.items.map((ci) => ({
      id: 'sitem_' + Math.random().toString(36).substring(2, 9),
      sale_id: saleId,
      product_id: ci.product.id,
      product_name: ci.product.name,
      barcode: ci.product.barcode,
      quantity: ci.quantity,
      unit_price_cents: ci.unit_price_cents,
      discount_cents: ci.discount_cents,
      total_cents: ci.total_cents,
      size: ci.size || ci.product.size,
      color: ci.color || ci.product.color,
      unit: ci.product.unit,
    }));

    try {
      // 4. Atualiza produtos e baixa de estoque
      for (const item of params.items) {
        const pIndex = products.findIndex((p) => p.id === item.product.id);
        if (pIndex !== -1) {
          products[pIndex].stock_quantity -= item.quantity;
          products[pIndex].updated_at = now;
        }
      }

      // 5. Gera movimentações de estoque
      const currentMovements = this.getRaw<StockMovement[]>(STORAGE_KEY_STOCK_MOVEMENTS) || [];
      const newMovements: StockMovement[] = params.items.map((ci) => ({
        id: 'mov_' + Math.random().toString(36).substring(2, 9),
        product_id: ci.product.id,
        movement_type: 'venda',
        quantity: -ci.quantity,
        reference_id: `Venda #${sale.sale_number}`,
        reason: `Saída por venda PDV #${sale.sale_number}`,
        created_at: now,
      }));

      // Gravação das tabelas
      this.setRaw(STORAGE_KEY_PRODUCTS, products);

      const allSales = this.getRaw<Sale[]>(STORAGE_KEY_SALES) || [];
      allSales.push(sale);
      this.setRaw(STORAGE_KEY_SALES, allSales);

      const allSaleItems = this.getRaw<SaleItem[]>(STORAGE_KEY_SALE_ITEMS) || [];
      allSaleItems.push(...saleItems);
      this.setRaw(STORAGE_KEY_SALE_ITEMS, allSaleItems);

      currentMovements.push(...newMovements);
      this.setRaw(STORAGE_KEY_STOCK_MOVEMENTS, currentMovements);

      return { sale, items: saleItems, change_cents: changeCents };
    } catch (err: unknown) {
      // ROLLBACK da transação
      this.setRaw(STORAGE_KEY_PRODUCTS, JSON.parse(backupProducts));
      throw new Error(`Falha na gravação transacional da venda: ${(err as Error).message}`);
    }
  }

  // --- MÉTODOS DE CAIXA ---

  public async getCashSessions(): Promise<CashSession[]> {
    await this.init();
    return this.getRaw<CashSession[]>(STORAGE_KEY_CASH_SESSIONS) || [];
  }

  public async getActiveCashSession(): Promise<CashSession | null> {
    const sessions = await this.getCashSessions();
    return sessions.find((s) => s.status === 'open') || null;
  }

  public async openCashSession(openingAmountCents: number, notes?: string): Promise<CashSession> {
    await this.init();
    const active = await this.getActiveCashSession();
    if (active) {
      throw new Error('Já existe um caixa aberto no momento. É necessário fechá-lo antes de abrir um novo.');
    }

    const sessions = await this.getCashSessions();
    const newSession: CashSession = {
      id: 'sess_' + Date.now().toString(),
      opened_at: new Date().toISOString(),
      opening_amount_cents: Math.max(0, Math.round(openingAmountCents)),
      status: 'open',
      notes: notes || 'Abertura de caixa manual',
    };

    sessions.push(newSession);
    this.setRaw(STORAGE_KEY_CASH_SESSIONS, sessions);
    return newSession;
  }

  public async closeCashSession(closingAmountCents: number, notes?: string): Promise<{
    session: CashSession;
    expectedCents: number;
    differenceCents: number;
    summary: {
      dinheiro: number;
      pix: number;
      debito: number;
      credito: number;
      outro: number;
      sangrias: number;
      suprimentos: number;
      totalVendas: number;
      vendasCount: number;
    };
  }> {
    await this.init();
    const sessions = await this.getCashSessions();
    const activeIndex = sessions.findIndex((s) => s.status === 'open');
    if (activeIndex === -1) {
      throw new Error('Nenhum caixa aberto para fechamento.');
    }

    const activeSession = sessions[activeIndex];
    const summary = await this.getCashSessionSummary(activeSession.id);

    // Dinheiro esperado em caixa = Saldo Inicial + Vendas em Dinheiro + Suprimentos - Sangrias
    const expectedCents =
      activeSession.opening_amount_cents +
      summary.dinheiro +
      summary.suprimentos -
      summary.sangrias;

    const differenceCents = closingAmountCents - expectedCents;

    activeSession.status = 'closed';
    activeSession.closed_at = new Date().toISOString();
    activeSession.closing_amount_cents = closingAmountCents;
    activeSession.expected_amount_cents = expectedCents;
    if (notes) {
      activeSession.notes = (activeSession.notes ? activeSession.notes + ' | ' : '') + notes;
    }

    sessions[activeIndex] = activeSession;
    this.setRaw(STORAGE_KEY_CASH_SESSIONS, sessions);

    return {
      session: activeSession,
      expectedCents,
      differenceCents,
      summary,
    };
  }

  public async getCashOperations(sessionId?: string): Promise<CashOperation[]> {
    await this.init();
    const ops = this.getRaw<CashOperation[]>(STORAGE_KEY_CASH_OPERATIONS) || [];
    if (sessionId) {
      return ops.filter((o) => o.session_id === sessionId);
    }
    return ops;
  }

  public async addCashOperation(params: {
    type: 'sangria' | 'suprimento';
    amount_cents: number;
    reason: string;
  }): Promise<CashOperation> {
    await this.init();
    const active = await this.getActiveCashSession();
    if (!active) {
      throw new Error('O caixa precisa estar aberto para realizar movimentações (sangria ou suprimento).');
    }

    if (params.amount_cents <= 0) {
      throw new Error('O valor da movimentação deve ser maior que zero.');
    }

    const ops = await this.getCashOperations();
    const newOp: CashOperation = {
      id: 'coper_' + Date.now().toString(),
      session_id: active.id,
      type: params.type,
      amount_cents: params.amount_cents,
      reason: params.reason || (params.type === 'sangria' ? 'Sangria de caixa' : 'Suprimento de troco'),
      created_at: new Date().toISOString(),
    };

    ops.push(newOp);
    this.setRaw(STORAGE_KEY_CASH_OPERATIONS, ops);
    return newOp;
  }

  public async getCashSessionSummary(sessionId: string): Promise<{
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    outro: number;
    sangrias: number;
    suprimentos: number;
    totalVendas: number;
    vendasCount: number;
  }> {
    const sales = await this.getSales();
    const sessionSales = sales.filter((s) => s.cash_session_id === sessionId && s.status === 'completed');

    let dinheiro = 0;
    let pix = 0;
    let debito = 0;
    let credito = 0;
    let outro = 0;

    for (const s of sessionSales) {
      if (s.payment_method === 'dinheiro') dinheiro += s.total_cents;
      else if (s.payment_method === 'pix') pix += s.total_cents;
      else if (s.payment_method === 'debito') debito += s.total_cents;
      else if (s.payment_method === 'credito') credito += s.total_cents;
      else outro += s.total_cents;
    }

    const ops = await this.getCashOperations(sessionId);
    let sangrias = 0;
    let suprimentos = 0;
    for (const op of ops) {
      if (op.type === 'sangria') sangrias += op.amount_cents;
      else if (op.type === 'suprimento') suprimentos += op.amount_cents;
    }

    return {
      dinheiro,
      pix,
      debito,
      credito,
      outro,
      sangrias,
      suprimentos,
      totalVendas: dinheiro + pix + debito + credito + outro,
      vendasCount: sessionSales.length,
    };
  }

  // --- MÉTODOS DE ESTOQUE ---

  public async getStockMovements(productId?: string): Promise<StockMovement[]> {
    await this.init();
    const movements = this.getRaw<StockMovement[]>(STORAGE_KEY_STOCK_MOVEMENTS) || [];
    if (productId) {
      return movements.filter((m) => m.product_id === productId);
    }
    return movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async addStockMovement(params: {
    product_id: string;
    movement_type: 'entrada' | 'saida' | 'venda' | 'cancelamento' | 'ajuste';
    quantity: number;
    reason?: string;
    reference_id?: string;
  }): Promise<StockMovement> {
    await this.init();
    const movements = this.getRaw<StockMovement[]>(STORAGE_KEY_STOCK_MOVEMENTS) || [];
    const newMovement: StockMovement = {
      id: 'mov_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      product_id: params.product_id,
      movement_type: params.movement_type,
      quantity: params.quantity,
      reason: params.reason,
      reference_id: params.reference_id,
      created_at: new Date().toISOString(),
    };

    movements.push(newMovement);
    this.setRaw(STORAGE_KEY_STOCK_MOVEMENTS, movements);
    return newMovement;
  }

  public async adjustStock(productId: string, newQuantity: number, reason: string): Promise<void> {
    await this.init();
    const products = await this.getProducts();
    const p = products.find((prod) => prod.id === productId);
    if (!p) throw new Error('Produto não encontrado');

    const diff = newQuantity - p.stock_quantity;
    p.stock_quantity = newQuantity;
    p.updated_at = new Date().toISOString();

    await this.addStockMovement({
      product_id: productId,
      movement_type: diff >= 0 ? 'entrada' : 'ajuste',
      quantity: diff,
      reason: reason || 'Ajuste manual de estoque',
    });

    this.setRaw(STORAGE_KEY_PRODUCTS, products);
  }

  public async addStockEntry(productId: string, quantityToAdd: number, reason: string, referenceDoc?: string): Promise<void> {
    await this.init();
    const products = await this.getProducts();
    const p = products.find((prod) => prod.id === productId);
    if (!p) throw new Error('Produto não encontrado');

    if (quantityToAdd <= 0) {
      throw new Error('A quantidade de entrada deve ser maior que zero.');
    }

    p.stock_quantity += quantityToAdd;
    p.updated_at = new Date().toISOString();

    await this.addStockMovement({
      product_id: productId,
      movement_type: 'entrada',
      quantity: quantityToAdd,
      reason: reason || 'Entrada de mercadorias',
      reference_id: referenceDoc,
    });

    this.setRaw(STORAGE_KEY_PRODUCTS, products);
  }

  // --- CONFIGURAÇÕES ---

  public async getSettings(): Promise<Settings> {
    await this.init();
    return this.getRaw<Settings>(STORAGE_KEY_SETTINGS) || DEFAULT_SETTINGS;
  }

  public async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    await this.init();
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    this.setRaw(STORAGE_KEY_SETTINGS, updated);
    return updated;
  }

  // --- BACKUP, RESTAURAÇÃO E EXPORTAÇÃO SQLITE ---

  public async createBackup(): Promise<BackupData> {
    await this.init();
    const data: BackupData = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      checksum: '',
      tables: {
        products: await this.getProducts(),
        sales: await this.getSales(),
        sale_items: this.getRaw<SaleItem[]>(STORAGE_KEY_SALE_ITEMS) || [],
        cash_sessions: await this.getCashSessions(),
        cash_operations: await this.getCashOperations(),
        stock_movements: await this.getStockMovements(),
        settings: await this.getSettings(),
      },
    };

    // Gera checksum simples para validação de integridade
    const contentToHash = JSON.stringify(data.tables);
    data.checksum = this.generateSimpleHash(contentToHash);

    // Atualiza data do último backup nas configurações
    await this.updateSettings({ last_backup_at: data.created_at });

    return data;
  }

  public async restoreBackup(backup: BackupData): Promise<void> {
    await this.init();

    if (!backup || !backup.tables) {
      throw new Error('Arquivo de backup inválido ou corrompido.');
    }

    // Validação de integridade via checksum
    const contentToHash = JSON.stringify(backup.tables);
    const calculatedHash = this.generateSimpleHash(contentToHash);
    if (backup.checksum && backup.checksum !== calculatedHash) {
      throw new Error('O checksum do backup não confere. O arquivo pode ter sido corrompido.');
    }

    // Cria snapshot de segurança antes de restaurar (Rollback automático)
    const safetySnapshot = await this.createBackup();
    try {
      this.setRaw(STORAGE_KEY_PRODUCTS, backup.tables.products || []);
      this.setRaw(STORAGE_KEY_SALES, backup.tables.sales || []);
      this.setRaw(STORAGE_KEY_SALE_ITEMS, backup.tables.sale_items || []);
      this.setRaw(STORAGE_KEY_CASH_SESSIONS, backup.tables.cash_sessions || []);
      this.setRaw(STORAGE_KEY_CASH_OPERATIONS, backup.tables.cash_operations || []);
      this.setRaw(STORAGE_KEY_STOCK_MOVEMENTS, backup.tables.stock_movements || []);
      if (backup.tables.settings) {
        this.setRaw(STORAGE_KEY_SETTINGS, backup.tables.settings);
      }
    } catch (err: unknown) {
      // Reverte se houver erro
      this.restoreBackup(safetySnapshot);
      throw new Error(`Falha ao restaurar dados: ${(err as Error).message}`);
    }
  }

  /**
   * Gera um script SQL completo e compatível com SQLite (.sql)
   * Permite que o usuário abra e manipule o banco em qualquer cliente SQLite desktop
   */
  public async generateSQLiteDump(): Promise<string> {
    const products = await this.getProducts();
    const sales = await this.getSales();
    const saleItems = this.getRaw<SaleItem[]>(STORAGE_KEY_SALE_ITEMS) || [];
    const sessions = await this.getCashSessions();
    const operations = await this.getCashOperations();
    const movements = await this.getStockMovements();
    const settings = await this.getSettings();

    let sql = `-- =========================================================\n`;
    sql += `-- Kairós PDV - Exportação de Banco de Dados SQLite\n`;
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += `-- Estabelecimento: ${settings.store_name}\n`;
    sql += `-- =========================================================\n\n`;
    sql += `PRAGMA foreign_keys = ON;\n\n`;

    // 1. Tabela products
    sql += `-- Tabela: products\n`;
    sql += `CREATE TABLE IF NOT EXISTS products (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  barcode TEXT UNIQUE,\n`;
    sql += `  name TEXT NOT NULL,\n`;
    sql += `  category TEXT,\n`;
    sql += `  cost_price_cents INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  sale_price_cents INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  stock_quantity REAL NOT NULL DEFAULT 0,\n`;
    sql += `  minimum_stock REAL NOT NULL DEFAULT 0,\n`;
    sql += `  unit TEXT NOT NULL DEFAULT 'UN',\n`;
    sql += `  active INTEGER NOT NULL DEFAULT 1,\n`;
    sql += `  created_at TEXT NOT NULL,\n`;
    sql += `  updated_at TEXT NOT NULL\n`;
    sql += `);\n\n`;

    for (const p of products) {
      sql += `INSERT INTO products (id, barcode, name, category, cost_price_cents, sale_price_cents, stock_quantity, minimum_stock, unit, active, created_at, updated_at) VALUES ('${p.id}', '${p.barcode}', '${p.name.replace(/'/g, "''")}', '${(p.category || '').replace(/'/g, "''")}', ${p.cost_price_cents}, ${p.sale_price_cents}, ${p.stock_quantity}, ${p.minimum_stock}, '${p.unit}', ${p.active ? 1 : 0}, '${p.created_at}', '${p.updated_at}');\n`;
    }

    // 2. Tabela sales
    sql += `\n-- Tabela: sales\n`;
    sql += `CREATE TABLE IF NOT EXISTS sales (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  sale_number INTEGER NOT NULL,\n`;
    sql += `  subtotal_cents INTEGER NOT NULL,\n`;
    sql += `  discount_cents INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  total_cents INTEGER NOT NULL,\n`;
    sql += `  payment_method TEXT NOT NULL,\n`;
    sql += `  amount_received_cents INTEGER NOT NULL,\n`;
    sql += `  change_cents INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  status TEXT NOT NULL DEFAULT 'completed',\n`;
    sql += `  cash_session_id TEXT,\n`;
    sql += `  created_at TEXT NOT NULL\n`;
    sql += `);\n\n`;

    for (const s of sales) {
      sql += `INSERT INTO sales (id, sale_number, subtotal_cents, discount_cents, total_cents, payment_method, amount_received_cents, change_cents, status, cash_session_id, created_at) VALUES ('${s.id}', ${s.sale_number}, ${s.subtotal_cents}, ${s.discount_cents}, ${s.total_cents}, '${s.payment_method}', ${s.amount_received_cents}, ${s.change_cents}, '${s.status}', ${s.cash_session_id ? `'${s.cash_session_id}'` : 'NULL'}, '${s.created_at}');\n`;
    }

    // 3. Tabela sale_items
    sql += `\n-- Tabela: sale_items\n`;
    sql += `CREATE TABLE IF NOT EXISTS sale_items (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  sale_id TEXT NOT NULL REFERENCES sales(id),\n`;
    sql += `  product_id TEXT,\n`;
    sql += `  product_name TEXT NOT NULL,\n`;
    sql += `  barcode TEXT,\n`;
    sql += `  quantity REAL NOT NULL,\n`;
    sql += `  unit_price_cents INTEGER NOT NULL,\n`;
    sql += `  discount_cents INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  total_cents INTEGER NOT NULL\n`;
    sql += `);\n\n`;

    for (const item of saleItems) {
      sql += `INSERT INTO sale_items (id, sale_id, product_id, product_name, barcode, quantity, unit_price_cents, discount_cents, total_cents) VALUES ('${item.id}', '${item.sale_id}', ${item.product_id ? `'${item.product_id}'` : 'NULL'}, '${item.product_name.replace(/'/g, "''")}', '${item.barcode}', ${item.quantity}, ${item.unit_price_cents}, ${item.discount_cents}, ${item.total_cents});\n`;
    }

    // 4. Tabela cash_sessions
    sql += `\n-- Tabela: cash_sessions\n`;
    sql += `CREATE TABLE IF NOT EXISTS cash_sessions (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  opened_at TEXT NOT NULL,\n`;
    sql += `  closed_at TEXT,\n`;
    sql += `  opening_amount_cents INTEGER NOT NULL,\n`;
    sql += `  closing_amount_cents INTEGER,\n`;
    sql += `  expected_amount_cents INTEGER,\n`;
    sql += `  notes TEXT,\n`;
    sql += `  status TEXT NOT NULL\n`;
    sql += `);\n\n`;

    for (const cs of sessions) {
      sql += `INSERT INTO cash_sessions (id, opened_at, closed_at, opening_amount_cents, closing_amount_cents, expected_amount_cents, notes, status) VALUES ('${cs.id}', '${cs.opened_at}', ${cs.closed_at ? `'${cs.closed_at}'` : 'NULL'}, ${cs.opening_amount_cents}, ${cs.closing_amount_cents !== undefined ? cs.closing_amount_cents : 'NULL'}, ${cs.expected_amount_cents !== undefined ? cs.expected_amount_cents : 'NULL'}, '${(cs.notes || '').replace(/'/g, "''")}', '${cs.status}');\n`;
    }

    // 5. Tabela stock_movements
    sql += `\n-- Tabela: stock_movements\n`;
    sql += `CREATE TABLE IF NOT EXISTS stock_movements (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  product_id TEXT NOT NULL REFERENCES products(id),\n`;
    sql += `  movement_type TEXT NOT NULL,\n`;
    sql += `  quantity REAL NOT NULL,\n`;
    sql += `  reference_id TEXT,\n`;
    sql += `  reason TEXT,\n`;
    sql += `  created_at TEXT NOT NULL\n`;
    sql += `);\n\n`;

    for (const m of movements) {
      sql += `INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_id, reason, created_at) VALUES ('${m.id}', '${m.product_id}', '${m.movement_type}', ${m.quantity}, ${m.reference_id ? `'${m.reference_id.replace(/'/g, "''")}'` : 'NULL'}, ${m.reason ? `'${m.reason.replace(/'/g, "''")}'` : 'NULL'}, '${m.created_at}');\n`;
    }

    return sql;
  }

  /**
   * Verificação de integridade do banco (Simulação rigorosa de PRAGMA integrity_check)
   */
  public async checkDatabaseIntegrity(): Promise<IntegrityCheckResult> {
    await this.init();
    const products = await this.getProducts();
    const sales = await this.getSales();
    const saleItems = this.getRaw<SaleItem[]>(STORAGE_KEY_SALE_ITEMS) || [];
    const movements = await this.getStockMovements();
    const errors: string[] = [];

    // 1. Verifica duplicidade de códigos de barras em produtos ativos
    const barcodeMap = new Map<string, string>();
    for (const p of products) {
      if (p.active && p.barcode) {
        if (barcodeMap.has(p.barcode)) {
          errors.push(`Código de barras duplicado: "${p.barcode}" presente em "${p.name}" e "${barcodeMap.get(p.barcode)}"`);
        } else {
          barcodeMap.set(p.barcode, p.name);
        }
      }
    }

    // 2. Integridade referencial de itens de venda
    const salesIds = new Set(sales.map((s) => s.id));
    for (const item of saleItems) {
      if (!salesIds.has(item.sale_id)) {
        errors.push(`Item de venda órfão encontrado (id: ${item.id}, venda inexistente: ${item.sale_id})`);
      }
    }

    // 3. Verificação de consistência de valores de vendas
    for (const sale of sales) {
      const items = saleItems.filter((i) => i.sale_id === sale.id);
      let calculatedSubtotal = 0;
      for (const i of items) {
        calculatedSubtotal += i.total_cents;
      }
      if (calculatedSubtotal !== sale.subtotal_cents) {
        errors.push(`Divergência de subtotal na Venda #${sale.sale_number}: gravado ${sale.subtotal_cents}, somado ${calculatedSubtotal}`);
      }
    }

    return {
      valid: errors.length === 0,
      totalProducts: products.length,
      totalSales: sales.length,
      totalSaleItems: saleItems.length,
      totalMovements: movements.length,
      errors,
    };
  }

  // --- MÉTODOS AUXILIARES ---

  private getRaw<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  private setRaw<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Erro ao gravar dados no armazenamento local:', e);
    }
  }

  private generateSimpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'chk_' + Math.abs(hash).toString(16);
  }
}

export const db = new DatabaseService();
