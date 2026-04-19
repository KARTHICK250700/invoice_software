/**
 * Invoice Software - Frontend Logging System
 * Logs to: browser console + localStorage + backend /api/logs/frontend (errors only)
 */

interface LogData {
  [key: string]: any;
}

interface ApiLogData {
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  requestData?: any;
  responseData?: any;
  error?: any;
}

interface ComponentLogData {
  component: string;
  action: string;
  props?: any;
  state?: any;
  error?: any;
}

const MAX_LOCAL_LOGS = 500;

export class InvoiceLogger {
  private isDevelopment = import.meta.env.DEV;
  private apiLogs: ApiLogData[] = [];
  private componentLogs: ComponentLogData[] = [];

  constructor() {
    this.info('Invoice Software Frontend Logger Initialized', {
      environment: this.isDevelopment ? 'development' : 'production',
      timestamp: new Date().toISOString()
    });
  }

  info(message: string, data?: LogData): void {
    this._log('INFO', message, data);
  }

  warning(message: string, data?: LogData): void {
    this._log('WARN', message, data);
  }

  error(message: string, error?: any, data?: LogData): void {
    const errorData: LogData = {
      ...data,
      error: error?.message || String(error),
      stack: error?.stack,
    };
    this._log('ERROR', message, errorData);
    // Send errors to backend so they appear in errors.log
    this._sendToBackend('ERROR', message, errorData);
  }

  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      this._log('DEBUG', message, data);
    }
  }

  // ── API logging ────────────────────────────────────────────────────────
  logApiRequest(apiData: ApiLogData): void {
    const entry = { ...apiData, timestamp: new Date().toISOString() } as any;
    this.apiLogs.push(entry);
    if (this.apiLogs.length > 100) this.apiLogs.shift();

    const isError = apiData.statusCode !== undefined && apiData.statusCode >= 400;
    const level   = isError ? 'ERROR' : 'INFO';
    const message = `API ${apiData.method} ${apiData.url} - ${apiData.statusCode ?? 'PENDING'}`;
    this._log(level, `API_REQUEST: ${message}`, apiData);

    if (isError) this._sendToBackend('ERROR', `API_REQUEST: ${message}`, apiData);
  }

  // ── Component / user-action logging ───────────────────────────────────
  logComponent(data: ComponentLogData): void {
    const entry = { ...data, timestamp: new Date().toISOString() } as any;
    this.componentLogs.push(entry);
    if (this.componentLogs.length > 100) this.componentLogs.shift();

    const level   = data.error ? 'ERROR' : 'INFO';
    const message = `COMPONENT ${data.component} - ${data.action}`;
    this._log(level, message, data);
    if (data.error) this._sendToBackend('ERROR', message, data);
  }

  logUserAction(action: string, resource: string, details?: LogData): void {
    this.info(`USER_ACTION: ${action} on ${resource}`, {
      action, resource, details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  }

  logFormSubmission(formName: string, success: boolean, data?: any, error?: any): void {
    const payload = { formName, success, data, error: error?.message || error, timestamp: new Date().toISOString() };
    const message = `FORM_SUBMISSION: ${formName} - ${success ? 'SUCCESS' : 'FAILED'}`;
    if (success) {
      this._log('INFO', message, payload);
    } else {
      this._log('ERROR', message, payload);
      this._sendToBackend('ERROR', message, payload);
    }
  }

  logNavigation(from: string, to: string): void {
    this.info(`NAVIGATION: ${from} → ${to}`, { from, to, timestamp: new Date().toISOString() });
  }

  getApiLogs(): ApiLogData[] { return [...this.apiLogs]; }
  getComponentLogs(): ComponentLogData[] { return [...this.componentLogs]; }

  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: this.isDevelopment ? 'development' : 'production',
      userAgent: navigator.userAgent,
      url: window.location.href,
      apiLogs: this.apiLogs.slice(-50),
      componentLogs: this.componentLogs.slice(-50),
    }, null, 2);
  }

  clearLogs(): void {
    this.apiLogs = [];
    this.componentLogs = [];
    try { localStorage.removeItem('invoice_logs'); } catch {}
    this.info('All logs cleared');
  }

  // ── Internal ──────────────────────────────────────────────────────────
  private _log(level: string, message: string, data?: LogData): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${level}: ${message}`;

    switch (level) {
      case 'ERROR': console.error(line, data ?? ''); break;
      case 'WARN':  console.warn(line,  data ?? ''); break;
      case 'DEBUG': console.debug(line, data ?? ''); break;
      default:      console.log(line,   data ?? '');
    }

    // Persist to localStorage (capped at MAX_LOCAL_LOGS)
    try {
      const raw  = localStorage.getItem('invoice_logs');
      const logs = raw ? JSON.parse(raw) : [];
      logs.push({ timestamp, level, message, data });
      if (logs.length > MAX_LOCAL_LOGS) logs.splice(0, logs.length - MAX_LOCAL_LOGS);
      localStorage.setItem('invoice_logs', JSON.stringify(logs));
    } catch { /* quota exceeded or private browsing */ }
  }

  /** Send to backend /api/logs/frontend (fire-and-forget, never throws) */
  private _sendToBackend(level: string, message: string, data?: any): void {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/logs/frontend', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          level,
          message,
          data,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}); // silently ignore network errors
    } catch { /* never crash because of logging */ }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────
export const logger = new InvoiceLogger();

// ── React hook ────────────────────────────────────────────────────────────
export const useLogger = (componentName: string) => ({
  logMount:           (props?: any)            => logger.logComponent({ component: componentName, action: 'MOUNT', props }),
  logUnmount:         ()                       => logger.logComponent({ component: componentName, action: 'UNMOUNT' }),
  logStateChange:     (state: any)             => logger.logComponent({ component: componentName, action: 'STATE_CHANGE', state }),
  logError:           (error: any)             => logger.logComponent({ component: componentName, action: 'ERROR', error }),
  logUserInteraction: (action: string, d?: any)=> logger.logComponent({ component: componentName, action: `USER_${action.toUpperCase()}`, state: d }),
});

// ── Axios interceptor helpers ─────────────────────────────────────────────
export const logApiCall = (method: string, url: string, requestData?: any) => {
  logger.logApiRequest({ method, url, requestData, responseTime: 0 });
};

export const logApiResponse = (
  method: string, url: string, statusCode: number,
  responseData?: any, startTime?: number, error?: any
) => {
  logger.logApiRequest({ method, url, statusCode, responseData, error,
    responseTime: startTime ? Date.now() - startTime : undefined });
};

// ── Specific action helpers ───────────────────────────────────────────────
export const logInvoiceAction   = (a: string, id?: string, d?: any) => logger.logUserAction(a, `invoice:${id   ?? 'new'}`, d);
export const logQuotationAction = (a: string, id?: string, d?: any) => logger.logUserAction(a, `quotation:${id ?? 'new'}`, d);
export const logClientAction    = (a: string, id?: string, d?: any) => logger.logUserAction(a, `client:${id   ?? 'new'}`, d);
export const logVehicleAction   = (a: string, id?: string, d?: any) => logger.logUserAction(a, `vehicle:${id  ?? 'new'}`, d);

export default logger;
