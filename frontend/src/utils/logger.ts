/**
 * Invoice Software - Frontend Logging System
 * Comprehensive logging for React components, API calls, and user actions
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

export class InvoiceLogger {
  private isDevelopment = import.meta.env.DEV;
  private apiLogs: ApiLogData[] = [];
  private componentLogs: ComponentLogData[] = [];

  constructor() {
    this.info('Invoice Software Frontend Logging System Initialized', {
      environment: this.isDevelopment ? 'development' : 'production',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log info message
   */
  info(message: string, data?: LogData): void {
    this._log('INFO', message, data);
  }

  /**
   * Log warning message
   */
  warning(message: string, data?: LogData): void {
    this._log('WARN', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: any, data?: LogData): void {
    const errorData = {
      ...data,
      error: error?.message || error,
      stack: error?.stack
    };
    this._log('ERROR', message, errorData);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      this._log('DEBUG', message, data);
    }
  }

  /**
   * Log API request/response
   */
  logApiRequest(apiData: ApiLogData): void {
    this.apiLogs.push({
      ...apiData,
      timestamp: new Date().toISOString()
    } as any);

    const message = `API ${apiData.method} ${apiData.url} - ${apiData.statusCode || 'PENDING'}`;
    const logLevel = apiData.statusCode && apiData.statusCode >= 400 ? 'ERROR' : 'INFO';

    this._log(logLevel, `API_REQUEST: ${message}`, apiData);

    // Keep only last 100 API logs
    if (this.apiLogs.length > 100) {
      this.apiLogs.shift();
    }
  }

  /**
   * Log component lifecycle or user actions
   */
  logComponent(componentData: ComponentLogData): void {
    this.componentLogs.push({
      ...componentData,
      timestamp: new Date().toISOString()
    } as any);

    const message = `COMPONENT ${componentData.component} - ${componentData.action}`;
    const logLevel = componentData.error ? 'ERROR' : 'INFO';

    this._log(logLevel, message, componentData);

    // Keep only last 100 component logs
    if (this.componentLogs.length > 100) {
      this.componentLogs.shift();
    }
  }

  /**
   * Log user actions for audit trail
   */
  logUserAction(action: string, resource: string, details?: LogData): void {
    const logData = {
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.info(`USER_ACTION: ${action} on ${resource}`, logData);
  }

  /**
   * Log form submissions
   */
  logFormSubmission(formName: string, success: boolean, data?: any, error?: any): void {
    const logData = {
      formName,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    };

    const message = `FORM_SUBMISSION: ${formName} - ${success ? 'SUCCESS' : 'FAILED'}`;
    const logLevel = success ? 'INFO' : 'ERROR';

    this._log(logLevel, message, logData);
  }

  /**
   * Log navigation events
   */
  logNavigation(from: string, to: string): void {
    this.info(`NAVIGATION: ${from} -> ${to}`, {
      from,
      to,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get API logs for debugging
   */
  getApiLogs(): ApiLogData[] {
    return [...this.apiLogs];
  }

  /**
   * Get component logs for debugging
   */
  getComponentLogs(): ComponentLogData[] {
    return [...this.componentLogs];
  }

  /**
   * Export logs as JSON for support
   */
  exportLogs(): string {
    const logsData = {
      timestamp: new Date().toISOString(),
      environment: this.isDevelopment ? 'development' : 'production',
      userAgent: navigator.userAgent,
      url: window.location.href,
      apiLogs: this.apiLogs.slice(-50), // Last 50 API logs
      componentLogs: this.componentLogs.slice(-50) // Last 50 component logs
    };

    return JSON.stringify(logsData, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.apiLogs = [];
    this.componentLogs = [];
    this.info('All logs cleared');
  }

  /**
   * Internal logging method
   */
  private _log(level: string, message: string, data?: LogData): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    // Console output
    switch (level) {
      case 'ERROR':
        console.error(logMessage, data || '');
        break;
      case 'WARN':
        console.warn(logMessage, data || '');
        break;
      case 'DEBUG':
        console.debug(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }

    // Store in localStorage for persistence (only in development)
    if (this.isDevelopment) {
      try {
        const logs = JSON.parse(localStorage.getItem('invoice_logs') || '[]');
        logs.push({
          timestamp,
          level,
          message,
          data
        });

        // Keep only last 1000 logs
        if (logs.length > 1000) {
          logs.splice(0, logs.length - 1000);
        }

        localStorage.setItem('invoice_logs', JSON.stringify(logs));
      } catch (error) {
        console.error('Failed to store logs in localStorage:', error);
      }
    }
  }
}

// Global logger instance
export const logger = new InvoiceLogger();

// React Hook for component logging
export const useLogger = (componentName: string) => {
  return {
    logMount: (props?: any) => {
      logger.logComponent({
        component: componentName,
        action: 'MOUNT',
        props
      });
    },
    logUnmount: () => {
      logger.logComponent({
        component: componentName,
        action: 'UNMOUNT'
      });
    },
    logStateChange: (state: any) => {
      logger.logComponent({
        component: componentName,
        action: 'STATE_CHANGE',
        state
      });
    },
    logError: (error: any) => {
      logger.logComponent({
        component: componentName,
        action: 'ERROR',
        error
      });
    },
    logUserInteraction: (action: string, details?: any) => {
      logger.logComponent({
        component: componentName,
        action: `USER_${action.toUpperCase()}`,
        details
      });
    }
  };
};

// API interceptor for automatic logging
export const logApiCall = async (
  method: string,
  url: string,
  requestData?: any
): Promise<void> => {
  const startTime = Date.now();

  logger.logApiRequest({
    method,
    url,
    requestData,
    responseTime: 0
  });
};

export const logApiResponse = (
  method: string,
  url: string,
  statusCode: number,
  responseData?: any,
  startTime?: number,
  error?: any
): void => {
  const responseTime = startTime ? Date.now() - startTime : undefined;

  logger.logApiRequest({
    method,
    url,
    statusCode,
    responseData,
    responseTime,
    error
  });
};

// Utility functions for specific logging scenarios
export const logInvoiceAction = (action: string, invoiceId?: string, details?: any) => {
  logger.logUserAction(action, `invoice:${invoiceId || 'new'}`, details);
};

export const logQuotationAction = (action: string, quotationId?: string, details?: any) => {
  logger.logUserAction(action, `quotation:${quotationId || 'new'}`, details);
};

export const logClientAction = (action: string, clientId?: string, details?: any) => {
  logger.logUserAction(action, `client:${clientId || 'new'}`, details);
};

export const logVehicleAction = (action: string, vehicleId?: string, details?: any) => {
  logger.logUserAction(action, `vehicle:${vehicleId || 'new'}`, details);
};

export default logger;