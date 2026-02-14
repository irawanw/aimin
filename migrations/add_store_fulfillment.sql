-- Migration: Add store_fulfillment column to pelanggan table
-- Date: 2026-02-04
-- Description: Add store_fulfillment column to store fulfillment options (JSON array)
--              and update store_type values to use new format

-- Add store_fulfillment column
ALTER TABLE pelanggan
ADD COLUMN store_fulfillment JSON DEFAULT NULL AFTER store_type;

-- Update existing store_type values to new format
UPDATE pelanggan SET store_type = 'store' WHERE store_type = 'Toko';
UPDATE pelanggan SET store_type = 'services' WHERE store_type = 'Jasa';
UPDATE pelanggan SET store_type = 'others' WHERE store_type IN ('Perusahaan', 'Kantor Pemerintahan', 'Lainnya');

-- Note: Run this migration with:
-- mysql -u aimin -p aimin < migrations/add_store_fulfillment.sql
