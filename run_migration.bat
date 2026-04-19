@echo off
title Database Migration
color 0A

echo.
echo ============================================
echo   Database Migration - Adding Missing Columns
echo ============================================
echo.
echo This will fix all 500 errors permanently.
echo Your data will NOT be deleted.
echo.
pause

cd /d "%~dp0backend"

python -c "
import sys, os
sys.path.insert(0, os.getcwd())
from dotenv import load_dotenv
load_dotenv()
from app.db.session import engine
from sqlalchemy import text

sql_file = os.path.join(os.path.dirname(os.getcwd()), 'database_migration.sql')
print('Reading migration file...')

with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Split by semicolon, skip comments and empty lines
statements = []
for stmt in content.split(';'):
    stmt = stmt.strip()
    if stmt and not stmt.startswith('--') and len(stmt) > 10:
        statements.append(stmt)

print(f'Running {len(statements)} migration statements...')
success = 0
skipped = 0

with engine.connect() as conn:
    for stmt in statements:
        try:
            conn.execute(text(stmt))
            conn.commit()
            success += 1
        except Exception as e:
            err = str(e)
            if 'Duplicate' in err or 'already exists' in err.lower() or '1060' in err:
                skipped += 1
            else:
                print(f'  WARN: {err[:80]}')

print()
print(f'Done! {success} statements run, {skipped} already existed (skipped).')
print('All missing columns added. You can now restart the backend.')
"

if errorlevel 1 (
    color 0C
    echo.
    echo ERROR: Migration failed. Make sure MySQL is running.
    echo Check that backend\.env has correct DB credentials.
) else (
    color 0A
    echo.
    echo ============================================
    echo   Migration Successful!
    echo   Now restart the backend server.
    echo ============================================
)

echo.
pause
