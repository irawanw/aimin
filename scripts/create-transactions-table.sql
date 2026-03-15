-- Migration: create store_transactions table
-- Run: mysql -u root -p aimin < scripts/create-transactions-table.sql

CREATE TABLE IF NOT EXISTS store_transactions (
  txn_id           VARCHAR(50)   PRIMARY KEY,
  txn_store_id     INT           NOT NULL,
  txn_paket_id     INT           NOT NULL,
  txn_type         ENUM('new','extend','upgrade') NOT NULL,
  txn_amount       DECIMAL(15,2) NOT NULL,
  txn_status       ENUM('pending','paid','failed','expired') DEFAULT 'pending',
  txn_payment_type VARCHAR(50)   DEFAULT NULL,
  txn_snap_token   VARCHAR(255)  DEFAULT NULL,
  txn_qr_string    TEXT          DEFAULT NULL,
  txn_midtrans_id  VARCHAR(100)  DEFAULT NULL,
  txn_created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  txn_paid_at      TIMESTAMP     NULL DEFAULT NULL,
  INDEX idx_store  (txn_store_id),
  INDEX idx_status (txn_status)
);
