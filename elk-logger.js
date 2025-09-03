import { ecsFormat } from "@elastic/ecs-pino-format";
import pino from "pino";
import pinoElasticsearch from "pino-elasticsearch";
import pinoPretty from "pino-pretty";

/**
 * Generates elasticsearch index name based on log timestamp
 * @param {string|number|Date} logTime - Timestamp for the log entry
 * @returns {string} Index name in format "logstash-YYYY.MM.DD"
 */
const getIndexFromLogTime = (logTime) => {
  const date = new Date(logTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `logstash-${year}.${month}.${day}`;
};

/**
 * Elasticsearch stream configuration for pino logging
 * Buffers logs and sends them to Elasticsearch with daily index rotation
 */
const streamToElasticSearch = pinoElasticsearch({
  esVersion: 8,
  flushBytes: 1_000,
  flushInterval: 1_000,
  index: (logTime) => getIndexFromLogTime(logTime),
  node: Deno.env.get("ELK_URL"),
});

// Error handling for elasticsearch stream
streamToElasticSearch.on(
  "insertError",
  (error) => console.log("ELK INSERTERROR", error),
);
streamToElasticSearch.on(
  "unknown",
  (error) => console.log("ELK UNKNOWN", error),
);
streamToElasticSearch.on("insert", (error) => console.log("ELK INSERT", error));
streamToElasticSearch.on("error", (error) => console.log("ELK ERROR", error));

/**
 * Environment to log level mapping
 * @type {Object<string, string>}
 */
const LOG_LEVELS = {
  development: "debug",
  test: "info",
  staging: "warn",
  production: "error",
};

/**
 * Current log level based on APPLICATION_ENV environment variable
 * @type {string}
 */
const logLevel = LOG_LEVELS[Deno.env.get("APPLICATION_ENV")] || "info";

/**
 * Pretty print stream for development/local environments
 */
const prettyStream = pinoPretty({
  colorize: true,
  translateTime: "HH:MM:ss Z",
  ignore: "process\\.pid,host\\.hostname,ecs\\.version,userAgent",
});

/**
 * Logging streams configuration
 * @type {Array<{stream: NodeJS.WriteStream | import('pino-elasticsearch').ElasticsearchStream, level?: string}>}
 */
const streams = [{
  stream: Deno.env.get("APPLICATION_ENV") === "development"
    ? prettyStream
    : process.stdout,
  level: logLevel, // Ensure stream respects the log level
}];

if (
  ["production", "staging", "test"].includes(Deno.env.get("APPLICATION_ENV"))
) {
  streams.push({
    stream: streamToElasticSearch,
    level: logLevel, // Also set level for elasticsearch stream
  });
}

console.log({
  logLevel,
});

/**
 * Shared ELK logger instance configured with ECS format and multistream output
 * Logs to console in all environments, and to Elasticsearch in production/staging/test environments
 * Log level is environment-based: development=debug, test=info, staging=warn, production=error
 */
const elkLogger = pino({
  level: logLevel,
  ...ecsFormat(),
  mixin: () => ({
    Application: Deno.env.get("APPLICATION_NAME"),
  }),
}, pino.multistream(streams));

/**
 * Log an error message with structured data to ELK stack
 * @param {string} errorType - Type of error for categorization (e.g., 'ValidationError', 'HttpError', 'AuthenticationError')
 * @param {Object} errorData - Additional structured data to include with the error
 * @param {string} [errorData.error] - Error message
 * @param {string} [errorData.stack] - Error stack trace
 * @param {string} [errorData.url] - Request URL path
 * @param {string} [errorData.method] - HTTP method
 * @param {string} [errorData.userAgent] - User agent string
 * @param {Object} [errorData.context] - Additional context data
 */
const logError = (errorType, errorData) => {
  elkLogger.error({
    errorType,
    ...errorData,
  });
};

/**
 * Log a warning message with structured data to ELK stack
 * @param {string} warningType - Type of warning for categorization (e.g., 'DeprecationWarning', 'ConfigurationWarning')
 * @param {Object} warningData - Additional structured data to include with the warning
 * @param {string} [warningData.message] - Warning message
 * @param {string} [warningData.url] - Request URL path
 * @param {string} [warningData.method] - HTTP method
 * @param {Object} [warningData.context] - Additional context data
 */
const logWarn = (warningType, warningData) => {
  elkLogger.warn({
    warningType,
    ...warningData,
  });
};

/**
 * Log an informational message with structured data to ELK stack
 * @param {string} infoType - Type of information for categorization (e.g., 'UserAction', 'SystemEvent')
 * @param {Object} infoData - Additional structured data to include with the info
 * @param {string} [infoData.message] - Information message
 * @param {string} [infoData.url] - Request URL path
 * @param {string} [infoData.method] - HTTP method
 * @param {Object} [infoData.context] - Additional context data
 */
const logInfo = (infoType, infoData) => {
  elkLogger.info({
    infoType,
    ...infoData,
  });
};

/**
 * Log a debug message with structured data to ELK stack
 * @param {string} debugType - Type of debug information for categorization
 * @param {Object} debugData - Additional structured data to include with the debug info
 * @param {string} [debugData.message] - Debug message
 * @param {Object} [debugData.context] - Additional context data
 */
const logDebug = (debugType, debugData) => {
  elkLogger.debug({
    debugType,
    ...debugData,
  });
};

export { elkLogger, logDebug, logError, logInfo, logWarn };
