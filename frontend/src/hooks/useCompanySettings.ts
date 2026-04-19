import { useState, useEffect } from 'react';
import axios from 'axios';

export interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  gst_number: string;
  pan_number: string;
  place_of_supply: string;
  invoice_prefix: string;
  quotation_prefix: string;
  default_tax_rate: number;
  currency: string;
}

const DEFAULTS: CompanySettings = {
  company_name: 'Om Murugan Auto Works',
  address: 'No.45, Anna Salai, Chennai - 600002, Tamil Nadu',
  phone: '+91 98765 43210',
  mobile: '+91 98765 43210',
  email: 'contact@ommunruganworks.com',
  website: 'www.ommunruganworks.com',
  gst_number: '33AABBA7890B1ZW',
  pan_number: '26CORPP3939N1',
  place_of_supply: 'Tamil Nadu (33)',
  invoice_prefix: 'INV',
  quotation_prefix: 'QUO',
  default_tax_rate: 18.0,
  currency: 'INR',
};

const LS_KEY = 'company_settings';

// ── pure helpers (work outside React, used in PDF generators) ─────────────────
export function getStoredCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function storeCompanySettings(s: Partial<CompanySettings>) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...getStoredCompanySettings(), ...s }));
}

// ── React hook ────────────────────────────────────────────────────────────────
export function useCompanySettings() {
  // Start with localStorage data immediately — no waiting spinner needed
  const [settings, setSettings] = useState<CompanySettings>(getStoredCompanySettings);
  const [loading,  setLoading]  = useState(false);   // false: we already have local data
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Try to load fresher data from backend on mount (optional — silent on failure)
  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;
    axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.data && typeof r.data === 'object') {
          const merged = { ...DEFAULTS, ...r.data };
          setSettings(merged);
          storeCompanySettings(merged); // keep localStorage in sync
        }
      })
      .catch(() => { /* backend not available — localStorage data is already loaded */ });
  }, []);

  const update = (patch: Partial<CompanySettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);

    // Step 1: Always save to localStorage first (this never fails)
    storeCompanySettings(settings);

    // Step 2: Try to sync to backend (optional)
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
      await axios.post('/api/settings', settings, { headers });
    } catch {
      // Backend unavailable (e.g. not restarted yet) — that's OK, localStorage is saved
    }

    // Step 3: Always show success (localStorage save succeeded)
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return { settings, loading, saving, saved, error, update, save };
}
