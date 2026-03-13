export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  route?: string;
  operation?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export function createLogger(baseContext: LogContext = {}) {
  return {
    info: (message: string, ctx: LogContext = {}) =>
      console.log(JSON.stringify({ level: "info", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
    warn: (message: string, ctx: LogContext = {}) =>
      console.warn(JSON.stringify({ level: "warn", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
    error: (message: string, ctx: LogContext = {}) =>
      console.error(JSON.stringify({ level: "error", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
  };
}

export const logger = createLogger();
