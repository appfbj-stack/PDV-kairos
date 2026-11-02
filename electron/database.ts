/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Camada de Banco de Dados SQLite Local para Windows (Electron)
 * Armazenamento persistente em %APPDATA%/KairosPDV/database.sqlite
 * Nunca salvo em pasta temporária ou na pasta de instalação
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class LocalSQLiteManager {
  private dbPath: string;

  constructor() {
    // Diretório de dados do usuário do Windows (%APPDATA%/KairosPDV)
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'kairos_pdv.sqlite');
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Retorna os scripts SQL de migração das tabelas obrigatórias do PRD
   */
  public getInitialSchemaSQL(): string {
    return `
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        cost_price_cents INTEGER NOT NULL DEFAULT 0,
        sale_price_cents INTEGER NOT NULL DEFAULT 0,
        stock_quantity REAL NOT NULL DEFAULT 0,
        minimum_stock REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'UN',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        sale_number INTEGER NOT NULL,
        subtotal_cents INTEGER NOT NULL,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        amount_received_cents INTEGER NOT NULL,
        change_cents INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'completed',
        cash_session_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id TEXT,
        product_name TEXT NOT NULL,
        barcode TEXT,
        quantity REAL NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

      CREATE TABLE IF NOT EXISTS cash_sessions (
        id TEXT PRIMARY KEY,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        opening_amount_cents INTEGER NOT NULL,
        closing_amount_cents INTEGER,
        expected_amount_cents INTEGER,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'open'
      );

      CREATE TABLE IF NOT EXISTS cash_operations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        movement_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reference_id TEXT,
        reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;
  }
}
