# API Configuration Guide

## 🎯 Single Point Configuration System

This application now uses a **centralized API configuration system** that allows you to change the backend URL in one place and automatically updates all API endpoints throughout the entire application.

## 📁 Configuration Files

### 1. Environment Files (`.env`)

```bash
# For local development (.env or .env.local)
VITE_API_URL=http://localhost:8000

# For production (.env.production)
VITE_API_URL=https://your-production-backend.com
```

### 2. Centralized API Config (`src/config/api.ts`)

This is the main configuration file that all components use. It automatically detects the environment and uses the appropriate backend URL.

## 🔧 How to Change Backend URL

### Option 1: Using Environment Variables (Recommended)

1. **For Local Development:**
   ```bash
   # In .env or .env.local
   VITE_API_URL=http://localhost:8000
   ```

2. **For Production:**
   ```bash
   # In .env.production
   VITE_API_URL=https://apiavaniko.com
   # or
   VITE_API_URL=https://your-new-server.com
   ```

### Option 2: Direct Configuration

If you don't use environment variables, edit `src/config/api.ts`:

```typescript
// Change the fallback URL in the getBaseApiUrl function
const fallbackUrl = isDevelopment
  ? 'http://localhost:8000'
  : 'https://your-production-backend.com'; // Change this
```

## 📱 Usage Examples

All components now use the centralized configuration:

```typescript
import { API_CONFIG } from '../config/api';

// Basic endpoints (already configured)
const response = await fetch(API_CONFIG.ENDPOINTS.CLIENTS);

// Custom endpoints
const customUrl = API_CONFIG.buildEndpoint('/custom/endpoint');

// Endpoints with ID
const itemUrl = API_CONFIG.buildEndpointWithId('/api/invoices', '123');
```

## 🌐 Deployment Examples

### Example 1: Deploy to New Server

1. Update `.env.production`:
   ```bash
   VITE_API_URL=https://apiavaniko.com
   ```

2. Build and deploy:
   ```bash
   npm run build
   ```

3. All API calls will now use `https://apiavaniko.com`

### Example 2: Local Development

1. Update `.env`:
   ```bash
   VITE_API_URL=http://localhost:8000
   ```

2. Start development:
   ```bash
   npm run dev
   ```

3. All API calls will use `http://localhost:8000`

### Example 3: Custom Port

```bash
VITE_API_URL=http://localhost:3001
```

## 🔍 Debugging

The configuration system includes comprehensive logging:

```javascript
// Check console for configuration info
console.group('🔧 API CONFIGURATION LOADED');
console.log('📡 Base API URL:', BASE_API_URL);
console.log('🌍 Environment:', import.meta.env.MODE);
console.log('🏠 Hostname:', window.location.hostname);
console.groupEnd();
```

## ✅ Migration Completed

### What Was Changed:

1. **Removed Railway References**: All `https://invoicesoftware-production.up.railway.app` references removed
2. **Centralized Configuration**: Created `src/config/api.ts` as single source of truth
3. **Updated Components**: All files now use centralized API configuration:
   - `quotationPdfGenerator.ts`
   - `PDFInvoice.tsx`
   - `PDFQuotation.tsx`
   - `PublicInvoiceView.tsx`
   - `VerifyInvoicePage.tsx`
   - `dynamicApi.ts`
   - `httpsInterceptor.ts`

### Benefits:

- ✅ **Single Point Change**: Update one environment variable to change all API endpoints
- ✅ **Environment Aware**: Automatically detects development vs production
- ✅ **Future Proof**: Easy to deploy to any new server
- ✅ **Type Safe**: Full TypeScript support with IntelliSense
- ✅ **Debugging**: Comprehensive logging for troubleshooting

## 🚀 Quick Start

1. **Local Development:**
   ```bash
   echo "VITE_API_URL=http://localhost:8000" > .env
   npm run dev
   ```

2. **Production:**
   ```bash
   echo "VITE_API_URL=https://your-backend.com" > .env.production
   npm run build
   ```

That's it! The entire application will now use your specified backend URL.

---

**Pro Tip:** You can now easily switch between different backend servers by just changing the environment variable. Perfect for testing, staging, and production environments!