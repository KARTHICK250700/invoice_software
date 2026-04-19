// SMART HTTPS INTERCEPTOR: Only enforces HTTPS in production
// Allows HTTP localhost in development

const PRODUCTION_HTTPS_URL = 'https://car-service-backend-56g8.onrender.com';
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('172.') || window.location.hostname.startsWith('10.');

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
    if (finalUrl.includes('your-production-backend.com')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }

    // Force HTTPS for any localhost API calls in production
    if (finalUrl.includes('localhost:8000')) {
      finalUrl = finalUrl.replace('http://localhost:8000', PRODUCTION_HTTPS_URL);
    }
  }

  if (isDevelopment) {
  } else {
  }

  return originalFetch.call(this, finalUrl, options);
};

// Override XMLHttpRequest to catch axios requests
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
  let finalUrl = url.toString();

  // Only intercept and force HTTPS in production
  if (!isDevelopment) {
    // Force HTTPS replacement for any Railway HTTP URLs in production
    if (finalUrl.includes('your-production-backend.com')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }

    // Force HTTPS for any localhost API calls in production
    if (finalUrl.includes('localhost:8000')) {
      finalUrl = finalUrl.replace('http://localhost:8000', PRODUCTION_HTTPS_URL);
    }
  }


  return originalXHROpen.call(this, method, finalUrl, ...args);
};


export default {};