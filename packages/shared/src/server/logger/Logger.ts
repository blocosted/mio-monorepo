/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: any args */

import { injectable } from 'inversify';
import { ConsoleTransport, LogLayer, type LogLevel } from 'loglayer';
import { serializeError } from 'serialize-error';

import { ENV_DEFAULTS, environment } from '../../constants/environment.constants';

interface LogContext {
  module?: string;
  operation?: string;
  requestId?: string;
  userId?: string;
  profileId?: string;
}

/**
 * Get log enabled from environment
 */
function isLogEnabled(): boolean {
  const value = environment.LOG_ENABLED ?? ENV_DEFAULTS.LOG_ENABLED;
  return value !== 'false';
}

/**
 * Get log level from environment
 */
function getLogLevel(): LogLevel {
  const level = environment.LOG_LEVEL ?? ENV_DEFAULTS.LOG_LEVEL;
  return level as LogLevel;
}

@injectable()
export class Logger {
  private logger: LogLayer;

  /**
   * Private constructor - use Logger.create() instead
   */
  private constructor(logger: LogLayer) {
    this.logger = logger;
  }

  /**
   * Async factory method to create a Logger instance
   */
  public static async create(): Promise<Logger> {
    const isDev = environment.NODE_ENV !== 'production';
    const logLayer = isDev ? await Logger.createDevLogger() : Logger.createProdLogger();

    return new Logger(logLayer);
  }

  private static async createDevLogger(): Promise<LogLayer> {
    if (environment.NODE_ENV === 'production') {
      throw new Error('Dev logger should not be used in production');
    }

    // Dynamic import to avoid bundling dev dependency in production
    const { getSimplePrettyTerminal, neon } = await import('@loglayer/transport-simple-pretty-terminal');

    return new LogLayer({
      errorSerializer: serializeError,
      transport: getSimplePrettyTerminal({
        enabled: isLogEnabled(),
        level: getLogLevel(),
        runtime: 'node',
        viewMode: 'inline',
        theme: neon
      })
    });
  }

  private static createProdLogger(): LogLayer {
    return new LogLayer({
      errorSerializer: serializeError,
      transport: new ConsoleTransport({
        enabled: isLogEnabled(),
        logger: console,
        level: getLogLevel(),
        messageField: 'message',
        levelField: 'level',
        dateField: 'timestamp',
        dateFn: () => new Date().toISOString()
      })
    });
  }

  /**
   * Create a logger with specific context
   */
  public withContext(context: LogContext) {
    return this.logger.withContext(context);
  }

  /**
   * Logger for module operations
   */
  public withModule(moduleName: string, operation?: string) {
    return this.logger.withContext({
      module: moduleName,
      ...(operation && { operation })
    });
  }

  /**
   * Logger for requests with ID
   */
  public withRequest(requestId: string, additionalContext?: Partial<LogContext>) {
    return this.logger.withContext({
      requestId,
      ...additionalContext
    });
  }

  /**
   * Logger with metadata
   */
  public withMetadata(metadata: Record<string, any>) {
    return this.logger.withMetadata(metadata);
  }

  /**
   * Logger with error
   */
  public withError(error: Error) {
    return this.logger.withError(error);
  }

  /**
   * Direct access to the logger for special cases
   */
  public get raw() {
    return this.logger;
  }

  /**
   * Helper to properly format log arguments.
   * If an object is passed as the second argument, use withMetadata for proper serialization.
   */
  private formatLog(level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal', messages: any[]) {
    if (messages.length === 2 && typeof messages[0] === 'string' && typeof messages[1] === 'object' && messages[1] !== null) {
      // Pattern: logger.info('message', { key: value })
      return this.logger.withMetadata(messages[1])[level](messages[0]);
    }
    if (messages.length === 1 && typeof messages[0] === 'object' && messages[0] !== null) {
      // Pattern: logger.info({ key: value })
      return this.logger.withMetadata(messages[0])[level]('');
    }
    // Default: pass through
    return this.logger[level](...messages);
  }

  // Direct logging methods
  public info(...messages: any[]) {
    return this.formatLog('info', messages);
  }

  public warn(...messages: any[]) {
    return this.formatLog('warn', messages);
  }

  public error(...messages: any[]) {
    return this.formatLog('error', messages);
  }

  public debug(...messages: any[]) {
    return this.formatLog('debug', messages);
  }

  public trace(...messages: any[]) {
    return this.formatLog('trace', messages);
  }

  public fatal(...messages: any[]) {
    return this.formatLog('fatal', messages);
  }

  public setLevel(level: LogLevel) {
    return this.logger.setLevel(level);
  }
}
