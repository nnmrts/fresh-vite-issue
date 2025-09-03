import define from "../define.js";
import responseLoggerMiddleware from "../response-logger-middleware.js";

/**
 * @param context
 * @param {...any} args
 * @param {...any} arguments_
 * @example
 */
const handler = define.middleware([
  responseLoggerMiddleware,
]);

export { handler };
