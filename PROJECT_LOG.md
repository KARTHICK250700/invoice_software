# Invoice Software — Full Project Log & Production Plan
**Last Updated:** 2026-04-18  
**Project:** Car Service Center Invoice Software  
**Stack:** FastAPI + SQLAlchemy + MySQL (backend) | React 19 + TypeScript + Vite (frontend)

---

## ✅ ALREADY FIXED (Previous Sessions)

### Backend Fixes
| # | Fix | File |
|---|-----|------|
| 1 | Global JWT middleware — all `/api/*` routes protected except auth/health/docs | `backend/main.py` |
| 2 | Replaced weak SECRET_KEY with 64-char random hex | `backend/.env` |
| 3 | Added DB indexes on `client_id`, `vehicle_id`, `invoice_date`, `payment_status`, `status` | `backend/models/models.py` |
| 4 | Added missing packages `python-jose` and `passlib[bcrypt]` | `backend/requirements.txt` |
| 5 | Changed all version pins from `==` to `>=` | `backend/requirements.txt` |
| 6 | Removed test endpoint `GET /api/invoices/{id}/test` | `backend/main.py` |
| 7 | Removed duplicate `PUT /api/invoices/{id}/status` endpoint | `backend/main.py` |
| 8 | All `str(e)` in HTTPException replaced → generic messages + `_log.exception()` | `backend/main.py` |
| 9 | Added 3 missing quotation endpoints: `accept`, `reject`, `convert-to-invoice` | `backend/main.py` |
| 10 | Fixed `or 18.0` tax_rate bug → `if not None else 0.0` everywhere | `backend/main.py` |
| 11 | Fixed GET quotation: `cgst_amount`/`sgst_amount` now computed from per-item tax_rate instead of hardcoded 9% | `backend/main.py` |
| 12 | **Startup column migration** — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for 80+ columns across all tables (runs on every startup, safe to repeat) | `backend/main.py` |
| 13 | Added missing core invoice columns to migration: `invoice_date`, `due_date`, `service_type`, `tax_rate`, `tax_amount`, `discount_amount`, `notes`, `created_at` | `backend/main.py` |
| 14 | `GET /api/invoices/{id}` items now include `tax_rate` and `discount` fields (needed for PDF GST calculation) | `backend/main.py` |
| 15 | Removed `from utils.logger import logger` + custom `logger.log_api_request()` calls from create_invoice → replaced with `_log` | `backend/main.py` |

### Frontend Fixes
| # | Fix | File |
|---|-----|------|
| 1 | Created `Toast.tsx` system (success/error/warning/info) with `useToast()` hook + singleton `toast` object | `frontend/src/components/UI/Toast.tsx` |
| 2 | Wrapped app with `<ToastProvider>` | `frontend/src/App.tsx` |
| 3 | Added toast slide-in animation | `frontend/src/index.css` |
| 4 | Removed hardcoded login credentials (`admin` / `Avan@123`) | `frontend/src/pages/LoginPage.tsx` |
| 5 | Fixed `useToast is not defined` — added import to 7 affected files | Multiple files |
| 6 | Fixed `useToast()` inside `convertToWords()` — moved hook call to component top level | `PDFInvoice.tsx`, `PDFQuotation.tsx` |
| 7 | Fixed `calcTotals is not defined` in PDF invoice — moved IIFE before template literal | `PDFInvoice.tsx` |
| 8 | Fixed `calcTotals is not defined` in quotation PDF — moved IIFE before template literal | `quotationPdfGenerator.ts` |
| 9 | Replaced `InvoiceModal` with `DynamicInvoiceModal` in Dashboard and QuotationsPage | `Dashboard.tsx`, `QuotationsPage.tsx` |
| 10 | Fixed trailing slash bug: `PUT /api/invoices/${id}/` → `PUT /api/invoices/${id}` | `DynamicInvoiceModal.tsx` |
| 11 | Dashboard now loads real chart data from `/api/reports/chart/services` | `Dashboard.tsx` |
| 12 | Added dark mode support to ClientModal and DynamicInvoiceModal | Multiple files |
| 13 | Added loading spinner (Loader2) to Save buttons | Multiple files |
| 14 | Added `PageHeader`, `QuickStats`, `LoadingState`, `EmptyState` to VehiclesPage | `VehiclesPage.tsx` |
| 15 | Code splitting in Vite build (vendor-react, vendor-charts, vendor-pdf chunks) | `vite.config.ts` |

### Files Deleted (Dead Code)
- `pages/StaticReportsPage.tsx.bak`
- `utils/unifiedPdfGenerator_backup.ts`
- `utils/unifiedPdfGenerator.ts.backup`
- `components/QuotationGenerator.tsx`
- `components/EnhancedQuotationGenerator.tsx`
- `components/ExactFormatQuotationGenerator.tsx`
- `context/ToastContext.tsx` (orphan duplicate)

---

## 🔴 CRITICAL — Fix Before Production

### 1. Auth header boundary check crash
**File:** `backend/main.py` ~line 212  
**Problem:** `token = auth_header.split(" ", 1)[1]` — if header is malformed ("Bearer" with no space), this crashes with `IndexError` → unhandled 500  
**Fix:**
```python
parts = auth_header.split(" ", 1)
if len(parts) != 2 or parts[0].lower() != "bearer":
    return JSONResponse({"detail": "Invalid auth header"}, status_code=401)
token = parts[1]
```

### 2. `convert-to-invoice` allows any quotation status
**File:** `backend/main.py` in `/api/quotations/{id}/convert-to-invoice`  
**Problem:** Any quotation (even rejected/expired) can be converted to invoice. Should only allow `accepted` or `pending`.  
**Fix:** Add status check before conversion.

### 3. `unifiedPdfGenerator.ts` — possible duplicate/stale code
**File:** `frontend/src/utils/unifiedPdfGenerator.ts`  
**Problem:** This file still exists alongside `quotationPdfGenerator.ts`. Check if it's imported anywhere — if not, delete it.

---

## 🟡 IMPORTANT — Fix Soon

### 4. Invoice update transaction not atomic
**File:** `backend/main.py` PUT `/api/invoices/{id}`  
**Problem:** Old items are deleted first, then new ones added. If new item creation fails midway, the invoice has 0 items — data is corrupted.  
**Fix:** Wrap delete + insert inside a single `try/except` with `db.rollback()` on failure.

### 5. Quotation `discount_amount` column missing from Quotation model
**File:** `backend/models/models.py`  
**Problem:** The GET quotation endpoint returns `discount_amount` (computed from items), but the model has no such column. This is fine for GET, but if code tries to set `quotation.discount_amount`, it crashes.  
**Status:** Currently safe (computed, not stored). Just don't add `discount_amount` as a direct DB write.

### 6. Invoice creation `invoice_count` race condition
**File:** `backend/main.py` in `create_invoice`  
**Problem:** `invoice_count = db.query(Invoice).count() + 1` — if two invoices are created at the same time, both get the same number.  
**Fix:** Use `SELECT MAX(id)` or a DB sequence, or add `UNIQUE` constraint and retry on duplicate.

### 7. `EnhancedInvoicesPage.tsx` not using `DynamicInvoiceModal`
**File:** `frontend/src/pages/EnhancedInvoicesPage.tsx`  
**Problem:** This is the main invoice page. Verify it uses the new `DynamicInvoiceModal`, not the old `InvoiceModal`.  
**Action:** Open the file and check line 1–30 imports.

---

## 🟢 POLISH — Nice to Have

| # | Item | Where |
|---|------|--------|
| 1 | Pagination for Clients, Vehicles, Invoices, Quotations list pages | Backend + Frontend |
| 2 | Full dark mode for QuotationModal (container/overlay missing `dark:`) | `QuotationModal.tsx` |
| 3 | Revenue chart in Dashboard uses hardcoded mock data | `backend/main.py` GET `/api/dashboard/revenue-chart` |
| 4 | `settings.json` file path hardcoded to same folder as `main.py` | `backend/main.py` |
| 5 | `convert-to-invoice` should mark old quotation status as `"converted"` (verify it does) | `backend/main.py` |
| 6 | Add `UNIQUE` constraint on `invoice_unique_id` column (currently no DB constraint) | `backend/models/models.py` |
| 7 | CustomerLookupPage and VerifyInvoicePage — verify these work with JWT auth | Frontend pages |

---

## 🗄️ DATABASE STATUS

### Tables and Their Migration Coverage

| Table | Core Columns in DB? | Extra Columns Migrated? |
|-------|---------------------|------------------------|
| `invoices` | ✅ Fixed (invoice_date, due_date, service_type, etc. added to migration) | ✅ 40+ extra columns covered |
| `invoice_services` | ✅ | ✅ hsn_sac_code, discount, tax_rate, unit_price, total_price |
| `invoice_parts` | ✅ | ✅ hsn_sac_code, discount, tax_rate, unit_price, total_price |
| `quotations` | ✅ | ✅ subtotal, total_amount, valid_until |
| `quotation_items` | ✅ | ✅ discount, tax_rate, hsn_sac |
| `clients` | ✅ | ✅ mobile, billing_address, pickup_drop_required |
| `vehicles` | ✅ | ✅ chassis_number, engine_number, transmission, insurance_expiry, puc_expiry, notes |
| `services` | ✅ (created by create_all) | N/A |
| `parts` | ✅ (created by create_all) | N/A |
| `users` | ✅ (created by create_all) | N/A |

**How Migration Works:**  
On every backend startup, `_run_migrations()` runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for every column. If the column already exists, MySQL silently skips it. This is safe to run 1000 times. The error logs from 2026-03-28 showing "Unknown column 'invoices.invoice_date'" will NOT happen after this fix.

---

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

### Backend
- [ ] Change `DEFAULT_ADMIN_PASSWORD` in `.env` to a strong password
- [ ] Set `SECRET_KEY` to a fresh 64-char hex (run: `python -c "import secrets; print(secrets.token_hex(32))"`)
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` to appropriate value (currently 1440 = 24h)
- [ ] Fix auth header boundary check (Critical #1 above)
- [ ] Run `pip install -r requirements.txt`
- [ ] Start backend: `uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] On first start, watch logs — migration will print "Startup migrations complete."
- [ ] Test: `GET /health` should return `{"status": "healthy"}`
- [ ] Test: `POST /api/auth/token` with admin credentials

### Frontend
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Verify `dist/` folder is created without errors
- [ ] Check that API base URL points to production backend (check `frontend/src/config/api.ts`)
- [ ] Serve `dist/` with nginx or any static server

### MySQL
- [ ] Ensure MySQL is running and accessible
- [ ] DB name: `car_service_center`
- [ ] DB credentials match `.env` file
- [ ] On first backend start, all tables are created and columns migrated automatically

---

## 🗺️ PROJECT STRUCTURE (4 Main Pages)

```
Frontend Pages:
├── LoginPage          → /login
├── Dashboard          → / (charts, stats, quick actions)
├── EnhancedInvoicesPage → /invoices (create, edit, PDF download)
├── QuotationsPage     → /quotations (create, accept, reject, convert to invoice, PDF download)
├── ClientsPage        → /clients
├── VehiclesPage       → /vehicles
├── EnhancedReportsPage → /reports
└── SettingsPage       → /settings

Backend API Groups:
├── Auth               → POST /api/auth/token, GET /api/auth/me
├── Invoices           → CRUD /api/invoices/ + items + status
├── Quotations         → CRUD /api/quotations/ + accept/reject/convert
├── Clients            → CRUD /api/clients/
├── Vehicles           → CRUD /api/vehicles/
├── Services/Parts     → CRUD /api/services/, /api/services/parts/
├── Reports            → /api/reports/, /api/dashboard/
└── Settings           → /api/settings/
```

---

## 🐛 ERROR HISTORY (Resolved)

| Date | Error | Root Cause | Fix Applied |
|------|-------|-----------|-------------|
| 2026-03-28 | `Unknown column 'invoices.invoice_date'` | create_all() doesn't add columns to existing tables | Startup migration added |
| 2026-04-18 | `useToast is not defined` in QuotationsPage | Import missing after automated replacement script | Import added to 7 files |
| 2026-04-18 | `calcTotals is not defined` in quotationPdfGenerator.ts | Variable used inside template literal before being defined | Moved IIFE before template |
| 2026-04-18 | `GET /api/invoices/9/items` → 500 | Missing columns in DB (discount, tax_rate, hsn_sac_code) | Startup migration covers these |
| 2026-04-18 | `useToast()` inside `convertToWords()` — React hook violation | Automated script placed hook inside nested function | Moved to component top level |
| 2026-04-18 | `accept`/`reject`/`convert-to-invoice` → 404 | Endpoints never existed | Added all 3 to backend |
| 2026-04-18 | `tax_rate: 0` replaced with 18.0 | Python `or` operator: `0 or 18.0 = 18.0` | Changed to `if not None` pattern |
