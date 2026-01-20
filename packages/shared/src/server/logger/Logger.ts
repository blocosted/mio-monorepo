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
  private logger!: LogLayer;

  constructor() {
    const isDev = environment.NODE_ENV !== 'production';
    if (isDev) {
      // In development: Pretty terminal with colors
      this.initializeDevLogger();
    } else {
      // In production: Console transport JSON structured
      this.initializeProdLogger();
    }
  }

  private initializeDevLogger() {
    if (environment.NODE_ENV === 'production') {
      throw new Error('Dev logger should not be used in production');
    }

    // Dynamic import to avoid inclusion in production bundle
    const { getSimplePrettyTerminal, neon } = require('@loglayer/transport-simple-pretty-terminal');

    this.logger = new LogLayer({
      errorSerializer: serializeError,
      transport: getSimplePrettyTerminal({
        enabled: isLogEnabled(),
        level: getLogLevel(),
        runtime: 'node',
        viewMode: 'inline',
        theme: neon,
      }),
    });
  }

  private initializeProdLogger() {
    this.logger = new LogLayer({
      errorSerializer: serializeError,
      transport: new ConsoleTransport({
        enabled: isLogEnabled(),
        logger: console,
        level: getLogLevel(),
        messageField: 'message',
        levelField: 'level',
        dateField: 'timestamp',
        dateFn: () => new Date().toISOString(),
      }),
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
      ...(operation && { operation }),
    });
  }

  /**
   * Logger for requests with ID
   */
  public withRequest(requestId: string, additionalContext?: Partial<LogContext>) {
    return this.logger.withContext({
      requestId,
      ...additionalContext,
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

  // Direct logging methods
  public info(...messages: any[]) {
    return this.logger.info(...messages);
  }

  public warn(...messages: any[]) {
    return this.logger.warn(...messages);
  }

  public error(...messages: any[]) {
    return this.logger.error(...messages);
  }

  public debug(...messages: any[]) {
    return this.logger.debug(...messages);
  }

  public trace(...messages: any[]) {
    return this.logger.trace(...messages);
  }

  public fatal(...messages: any[]) {
    return this.logger.fatal(...messages);
  }

  public setLevel(level: LogLevel) {
    return this.logger.setLevel(level);
  }
}

