/**
 * Logging utility for development and debugging
 * Only logs in development mode, silent in production
 */

type LogLevel = "info" | "warn" | "error" | "debug";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Logger class for consistent logging across the application
 */
class Logger {
  /**
   * Logs informational messages
   */
  info(...args: unknown[]): void {
    if (isDevelopment) {
      console.log("[INFO]", ...args);
    }
  }

  /**
   * Logs warning messages
   */
  warn(...args: unknown[]): void {
    if (isDevelopment) {
      console.warn("[WARN]", ...args);
    }
  }

  /**
   * Logs error messages
   * Errors are logged in both development and production
   */
  error(...args: unknown[]): void {
    console.error("[ERROR]", ...args);
  }

  /**
   * Logs debug messages
   * Only shown in development mode
   */
  debug(...args: unknown[]): void {
    if (isDevelopment) {
      console.log("[DEBUG]", ...args);
    }
  }

  /**
   * Logs messages with a specific log level
   */
  log(level: LogLevel, ...args: unknown[]): void {
    switch (level) {
      case "info":
        this.info(...args);
        break;
      case "warn":
        this.warn(...args);
        break;
      case "error":
        this.error(...args);
        break;
      case "debug":
        this.debug(...args);
        break;
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * LLM-specific logger for tracking AI request/response cycles
 */
export const llmLogger = {
  request(functionName: string, model: string, promptPreview: string): void {
    if (!isDevelopment) return;

    const timestamp = new Date().toISOString();
    console.log("\n" + "=".repeat(80));
    console.log(`🤖 LLM REQUEST | ${timestamp}`);
    console.log("=".repeat(80));
    console.log(`Function: ${functionName}`);
    console.log(`Model: ${model}`);
    console.log(`Prompt Preview (first 200 chars):`);
    console.log(promptPreview.substring(0, 200).replace(/\n/g, " ") + "...");
    console.log("=".repeat(80) + "\n");
  },

  response(
    functionName: string,
    model: string,
    responsePreview: string,
    success: boolean = true
  ): void {
    if (!isDevelopment) return;

    const timestamp = new Date().toISOString();
    const icon = success ? "✅" : "❌";
    console.log("\n" + "=".repeat(80));
    console.log(`${icon} LLM RESPONSE | ${timestamp}`);
    console.log("=".repeat(80));
    console.log(`Function: ${functionName}`);
    console.log(`Model: ${model}`);
    console.log(`Status: ${success ? "SUCCESS" : "FAILED"}`);
    console.log(`Response Preview (first 300 chars):`);
    console.log(
      responsePreview.substring(0, 300).replace(/\n/g, " ") +
        (responsePreview.length > 300 ? "..." : "")
    );
    console.log("=".repeat(80) + "\n");
  },

  error(functionName: string, model: string, error: unknown): void {
    const timestamp = new Date().toISOString();
    console.error("\n" + "=".repeat(80));
    console.error(`❌ LLM ERROR | ${timestamp}`);
    console.error("=".repeat(80));
    console.error(`Function: ${functionName}`);
    console.error(`Model: ${model}`);
    console.error(`Error:`, error instanceof Error ? error.message : String(error));
    console.error("=".repeat(80) + "\n");
  },

  retryAttempt(functionName: string, attempt: number, maxRetries: number, reason: string): void {
    if (!isDevelopment) return;
    console.log(`\n🔄 RETRY ${attempt}/${maxRetries} | ${functionName} | ${reason}\n`);
  },

  modelFallback(fromModel: string, toModel: string, functionName: string): void {
    if (!isDevelopment) return;
    console.log(`\n⚠️  MODEL FALLBACK | ${functionName}`);
    console.log(`   From: ${fromModel} → To: ${toModel}\n`);
  },
};
