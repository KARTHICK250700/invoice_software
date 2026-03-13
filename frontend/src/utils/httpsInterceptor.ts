// SMART HTTPS INTERCEPTOR: Only enforces HTTPS in production
// Allows HTTP localhost in development

const RAILWAY_HTTPS_URL = 'https://invoicesoftware-production.up.railway.app';
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Override fetch globally to force HTTPS
const originalFetch = window.fetch;
window.fetch = function(url: string | URL | Request, options?: RequestInit) {
  let finalUrl: string;

  if (typeof url === 'string') {
    finalUrl = url;
  } else if (url instanceof URL) {
    finalUrl = url.toString();
  } else {
    finalUrl = url.url;
  }

  // Only intercept and force HTTPS in production
  if (!isDevelopment) {
    // Force HTTPS replacement for any Railway HTTP URLs in production
    if (finalUrl.includes('invoicesoftware-production.up.railway.app')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }

    // Force HTTPS for any localhost API calls in production
    if (finalUrl.includes('localhost:8000')) {
      finalUrl = finalUrl.replace('http://localhost:8000', RAILWAY_HTTPS_URL);
    }
  }

  if (isDevelopment) {
    console.log('🔧 DEV INTERCEPTOR - Local development, allowing HTTP to localhost');
  } else {
    console.log('🔒 PROD INTERCEPTOR - Production, forcing HTTPS');
  }
  console.log('🔧 URL:', typeof url === 'string' ? url : url.toString(), '→', finalUrl);

  return originalFetch.call(this, finalUrl, options);
};

// Override XMLHttpRequest to catch axios requests
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
  let finalUrl = url.toString();

  // Only intercept and force HTTPS in production
  if (!isDevelopment) {
    // Force HTTPS replacement for any Railway HTTP URLs in production
    if (finalUrl.includes('invoicesoftware-production.up.railway.app')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }

    // Force HTTPS for any localhost API calls in production
    if (finalUrl.includes('localhost:8000')) {
      finalUrl = finalUrl.replace('http://localhost:8000', RAILWAY_HTTPS_URL);
    }
  }

  console.log('🔧 XHR INTERCEPTOR:', url, '→', finalUrl);

  return originalXHROpen.call(this, method, finalUrl, ...args);
};

console.log('🔒 NUCLEAR HTTPS INTERCEPTOR LOADED - ALL HTTP REQUESTS WILL BE FORCED TO HTTPS');

export default {};