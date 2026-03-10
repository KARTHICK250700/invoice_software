// NUCLEAR SOLUTION: HTTP to HTTPS interceptor
// This intercepts ALL HTTP requests and forces them to HTTPS

const RAILWAY_HTTPS_URL = 'https://invoicesoftware-production.up.railway.app';

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

  // Force HTTPS replacement for any Railway HTTP URLs
  if (finalUrl.includes('invoicesoftware-production.up.railway.app')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }

  // Force HTTPS for any localhost API calls in production
  if (finalUrl.includes('localhost:8000')) {
    finalUrl = finalUrl.replace('http://localhost:8000', RAILWAY_HTTPS_URL);
  }

  console.log('🔒 NUCLEAR INTERCEPTOR - Original URL:', typeof url === 'string' ? url : url.toString());
  console.log('🔒 NUCLEAR INTERCEPTOR - Final URL:', finalUrl);

  return originalFetch.call(this, finalUrl, options);
};

// Override XMLHttpRequest to catch axios requests
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
  let finalUrl = url.toString();

  // Force HTTPS replacement for any Railway HTTP URLs
  if (finalUrl.includes('invoicesoftware-production.up.railway.app')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }

  // Force HTTPS for any localhost API calls in production
  if (finalUrl.includes('localhost:8000')) {
    finalUrl = finalUrl.replace('http://localhost:8000', RAILWAY_HTTPS_URL);
  }

  console.log('🔒 NUCLEAR XHR INTERCEPTOR - Original URL:', url);
  console.log('🔒 NUCLEAR XHR INTERCEPTOR - Final URL:', finalUrl);

  return originalXHROpen.call(this, method, finalUrl, ...args);
};

console.log('🔒 NUCLEAR HTTPS INTERCEPTOR LOADED - ALL HTTP REQUESTS WILL BE FORCED TO HTTPS');

export default {};