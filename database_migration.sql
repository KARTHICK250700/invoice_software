-- ============================================================
--  Om Murugan Car Service Center — Database Migration Script
--  Run this ONCE in MySQL Workbench to fix all missing columns
--  Safe to run multiple times — IF NOT EXISTS protects data
-- ============================================================

USE car_service_center;

-- ════════════════════════════════════════════════════════════
--  1. CLIENTS
-- ════════════════════════════════════════════════════════════
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS mobile              VARCHAR(15)     NULL,
  ADD COLUMN IF NOT EXISTS billing_address     TEXT            NULL,
  ADD COLUMN IF NOT EXISTS pickup_drop_required TINYINT(1)    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city               VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS state              VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS pincode            VARCHAR(10)     NULL,
  ADD COLUMN IF NOT EXISTS created_at         DATETIME        NULL DEFAULT CURRENT_TIMESTAMP;

-- ════════════════════════════════════════════════════════════
--  2. VEHICLES
-- ════════════════════════════════════════════════════════════
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vin_number         VARCHAR(17)     NULL,
  ADD COLUMN IF NOT EXISTS chassis_number     VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS engine_number      VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS mileage            INT             NULL,
  ADD COLUMN IF NOT EXISTS km_reading_in      INT             NULL,
  ADD COLUMN IF NOT EXISTS km_reading_out     INT             NULL,
  ADD COLUMN IF NOT EXISTS color              VARCHAR(30)     NULL,
  ADD COLUMN IF NOT EXISTS transmission       VARCHAR(20)     NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type       VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS last_service_date  DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS insurance_expiry   DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS puc_expiry         DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS notes              TEXT            NULL,
  ADD COLUMN IF NOT EXISTS created_at         DATETIME        NULL DEFAULT CURRENT_TIMESTAMP;

-- ════════════════════════════════════════════════════════════
--  3. SERVICES
-- ════════════════════════════════════════════════════════════
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS service_type       VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS service_category   VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS base_price         FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS labor_hours        FLOAT           NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS labor_rate         FLOAT           NOT NULL DEFAULT 500.0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code       VARCHAR(20)     NULL DEFAULT '9986';

-- ════════════════════════════════════════════════════════════
--  4. PARTS
-- ════════════════════════════════════════════════════════════
ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS part_number        VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS hsn_code           VARCHAR(20)     NULL,
  ADD COLUMN IF NOT EXISTS description        TEXT            NULL,
  ADD COLUMN IF NOT EXISTS stock_quantity     INT             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_stock      INT             NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS supplier           VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS is_oem             TINYINT(1)      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS warranty_months    INT             NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS auto_reduce_stock  TINYINT(1)      NOT NULL DEFAULT 1;

-- ════════════════════════════════════════════════════════════
--  5. INVOICES  (most columns — this is the main problem table)
-- ════════════════════════════════════════════════════════════
ALTER TABLE invoices
  -- Core date & status
  ADD COLUMN IF NOT EXISTS invoice_date       DATETIME        NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS due_date           DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS service_type       VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS notes              TEXT            NULL,
  ADD COLUMN IF NOT EXISTS created_at         DATETIME        NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by         INT             NULL,
  -- KM readings
  ADD COLUMN IF NOT EXISTS km_reading_in      INT             NULL,
  ADD COLUMN IF NOT EXISTS km_reading_out     INT             NULL,
  -- Financials
  ADD COLUMN IF NOT EXISTS subtotal           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS gst_enabled        TINYINT(1)      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tax_rate           FLOAT           NOT NULL DEFAULT 18.0,
  ADD COLUMN IF NOT EXISTS tax_amount         FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS cgst_rate          FLOAT           NOT NULL DEFAULT 9.0,
  ADD COLUMN IF NOT EXISTS sgst_rate          FLOAT           NOT NULL DEFAULT 9.0,
  ADD COLUMN IF NOT EXISTS igst_rate          FLOAT           NOT NULL DEFAULT 18.0,
  ADD COLUMN IF NOT EXISTS cgst_amount        FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS sgst_amount        FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS igst_amount        FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS discount_amount    FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_amount       FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS paid_amount        FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS balance_due        FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS round_off          FLOAT           NOT NULL DEFAULT 0.0,
  -- GST & supply
  ADD COLUMN IF NOT EXISTS place_of_supply    VARCHAR(100)    NULL DEFAULT 'Tamil Nadu (33)',
  ADD COLUMN IF NOT EXISTS hsn_sac_code       VARCHAR(20)     NULL DEFAULT '8302',
  -- Challan / transport
  ADD COLUMN IF NOT EXISTS challan_no         VARCHAR(20)     NULL,
  ADD COLUMN IF NOT EXISTS challan_date       DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS eway_bill_no       VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS transport          VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS transport_id       VARCHAR(50)     NULL,
  -- Service details
  ADD COLUMN IF NOT EXISTS technician_name    VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS work_order_no      VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS estimate_no        VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS insurance_claim    TINYINT(1)      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_applicable TINYINT(1)     NOT NULL DEFAULT 0,
  -- QR / unique access
  ADD COLUMN IF NOT EXISTS unique_access_code VARCHAR(50)     NULL,
  ADD COLUMN IF NOT EXISTS qr_code_url        VARCHAR(200)    NULL,
  ADD COLUMN IF NOT EXISTS invoice_unique_id  VARCHAR(50)     NULL,
  -- Payment
  ADD COLUMN IF NOT EXISTS payment_method     VARCHAR(50)     NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS payment_reference  VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS payment_date       DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS payment_notes      TEXT            NULL,
  ADD COLUMN IF NOT EXISTS payment_type       VARCHAR(20)     NULL DEFAULT 'Full',
  ADD COLUMN IF NOT EXISTS advance_amount     FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS advance_date       DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS payment_due_days   INT             NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS late_fee_applicable TINYINT(1)     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_amount    FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS early_payment_discount FLOAT       NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS credit_limit       FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS credit_days        INT             NOT NULL DEFAULT 0,
  -- Notifications
  ADD COLUMN IF NOT EXISTS mobile_invoice_sent  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_invoice_sent   TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_sent        TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_mobile_alt  VARCHAR(15)  NULL,
  ADD COLUMN IF NOT EXISTS customer_email_alt   VARCHAR(100) NULL;

-- ════════════════════════════════════════════════════════════
--  6. INVOICE_SERVICES
-- ════════════════════════════════════════════════════════════
ALTER TABLE invoice_services
  ADD COLUMN IF NOT EXISTS service_name       VARCHAR(200)    NULL,
  ADD COLUMN IF NOT EXISTS amount             FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code       VARCHAR(20)     NULL DEFAULT '9986',
  ADD COLUMN IF NOT EXISTS quantity           FLOAT           NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS unit_price         FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS discount           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tax_rate           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_price        FLOAT           NOT NULL DEFAULT 0.0;

-- ════════════════════════════════════════════════════════════
--  7. INVOICE_PARTS
-- ════════════════════════════════════════════════════════════
ALTER TABLE invoice_parts
  ADD COLUMN IF NOT EXISTS part_name          VARCHAR(200)    NULL,
  ADD COLUMN IF NOT EXISTS cost               FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code       VARCHAR(20)     NULL DEFAULT '8708',
  ADD COLUMN IF NOT EXISTS quantity           FLOAT           NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS unit_price         FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS discount           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tax_rate           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_price        FLOAT           NOT NULL DEFAULT 0.0;

-- ════════════════════════════════════════════════════════════
--  8. QUOTATIONS
-- ════════════════════════════════════════════════════════════
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS subtotal           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_amount       FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS valid_until        DATETIME        NULL,
  ADD COLUMN IF NOT EXISTS notes              TEXT            NULL,
  ADD COLUMN IF NOT EXISTS created_at         DATETIME        NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by         INT             NULL;

-- ════════════════════════════════════════════════════════════
--  9. QUOTATION_ITEMS
-- ════════════════════════════════════════════════════════════
ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS hsn_sac            VARCHAR(20)     NULL,
  ADD COLUMN IF NOT EXISTS quantity           FLOAT           NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS discount           FLOAT           NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tax_rate           FLOAT           NOT NULL DEFAULT 0.0;

-- ════════════════════════════════════════════════════════════
--  10. PAYMENTS
-- ════════════════════════════════════════════════════════════
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_id     VARCHAR(100)    NULL,
  ADD COLUMN IF NOT EXISTS notes              TEXT            NULL,
  ADD COLUMN IF NOT EXISTS payment_date       DATETIME        NULL DEFAULT CURRENT_TIMESTAMP;

-- ════════════════════════════════════════════════════════════
--  11. ADD INDEXES (speed up queries)
-- ════════════════════════════════════════════════════════════
-- Only add if they don't already exist (ignore errors)
ALTER TABLE invoices
  ADD INDEX IF NOT EXISTS idx_inv_client   (client_id),
  ADD INDEX IF NOT EXISTS idx_inv_vehicle  (vehicle_id),
  ADD INDEX IF NOT EXISTS idx_inv_date     (invoice_date),
  ADD INDEX IF NOT EXISTS idx_inv_status   (payment_status);

ALTER TABLE quotations
  ADD INDEX IF NOT EXISTS idx_quot_client  (client_id),
  ADD INDEX IF NOT EXISTS idx_quot_vehicle (vehicle_id),
  ADD INDEX IF NOT EXISTS idx_quot_date    (quotation_date),
  ADD INDEX IF NOT EXISTS idx_quot_status  (status);

ALTER TABLE clients
  ADD INDEX IF NOT EXISTS idx_cli_mobile   (mobile);

-- ════════════════════════════════════════════════════════════
--  DONE — Verify by running:
--  DESCRIBE invoices;
--  DESCRIBE invoice_services;
--  DESCRIBE invoice_parts;
-- ════════════════════════════════════════════════════════════
SELECT 'Migration completed successfully!' AS result;
