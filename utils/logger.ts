export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static format(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  public static debug(message: string, ...args: any[]): void {
    console.debug(this.format('debug', message), ...args);
  }

  public static info(message: string, ...args: any[]): void {
    console.info(this.format('info', message), ...args);
  }

  public static warn(message: string, ...args: any[]): void {
    console.warn(this.format('warn', message), ...args);
  }

  public static error(message: string, ...args: any[]): void {
    console.error(this.format('error', message), ...args);
  }
}
