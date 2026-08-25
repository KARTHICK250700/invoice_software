"""
Migration: Add tax_rate and discount columns to invoice_services and invoice_parts
Run this once from the backend folder: python migrate_add_item_tax.py
"""
import sys
sys.path.insert(0, '.')
from app.db.session import engine
from sqlalchemy import text

migrations = [
    ('ALTER TABLE invoice_services ADD COLUMN discount FLOAT DEFAULT 0.0',
     'discount → invoice_services'),
    ('ALTER TABLE invoice_services ADD COLUMN tax_rate FLOAT DEFAULT 18.0',
     'tax_rate → invoice_services'),
    ('ALTER TABLE invoice_parts ADD COLUMN discount FLOAT DEFAULT 0.0',
     'discount → invoice_parts'),
    ('ALTER TABLE invoice_parts ADD COLUMN tax_rate FLOAT DEFAULT 18.0',
     'tax_rate → invoice_parts'),
    ('ALTER TABLE invoice_parts MODIFY COLUMN quantity FLOAT',
     'quantity FLOAT (fractional qty) → invoice_parts'),
]

with engine.connect() as conn:
    for sql, msg in migrations:
        try:
            conn.execute(text(sql))
            print(f'  OK  {msg}')
        except Exception as e:
            # Column already exists is fine
            print(f'  -- skip ({msg}): {e}')
    conn.commit()
    print('\nMigration complete. Restart the backend server.')
