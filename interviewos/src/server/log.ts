/** Minimal structured logger. Messages go to stdout/stderr of the Next.js process. */
type Level = "info" | "warn" | "error";

function write(level: Level, scope: string, message: string, data?: Record<string, unknown>) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${scope}: ${message}${
    data ? ` ${JSON.stringify(data)}` : ""
  }`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("info", scope, message, data),
  warn: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("warn", scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("error", scope, message, data),
};
