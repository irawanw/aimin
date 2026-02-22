import path from 'path';
import os from 'os';

export const PRODUCTS_TEMP_DIR = path.join(os.tmpdir(), 'aimin-products');

export interface ParsedTempFile {
  headers: string[];
  rows: any[][];
  filename: string;
}

export interface ColumnMapping {
  name: string | null;
  sku: string | null;
  category: string | null;
  price: string | null;
  price_max: string | null;
  description: string | null;
  stock_qty: string | null;
  stock_status: string | null;
  image_url: string | null;
  specs: string[];
}
