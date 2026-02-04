/**
 * Logging utility for ServiceNow MCP Server
 * CRITICAL: Uses console.error() for all logging since stdio servers cannot use stdout
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    console.error(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    console.error(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}

// Export singleton logger instance
export const logger = new Logger();
