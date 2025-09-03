import define from "./define.js";
import { logError, logInfo, logWarn } from "./elk-logger.js";

const responseLoggerMiddleware = define.middleware(async (context) => {
  const startTime = Date.now();

  const {
    req: {
      method,
      url,
    },
  } = context;

  let response;

  try {
    response = await context.next();
  } catch (error) {
    // Log unhandled errors and re-throw
    logError("UnhandledError", {
      error: error.message,
      stack: error.stack,
      url: url,
      method: method.toUpperCase(),
      userAgent: context.req.headers.get("user-agent"),
      context: {
        errorType: error.constructor.name,
        duration: Date.now() - startTime,
      },
    });
    throw error;
  }

  const duration = Date.now() - startTime;
  const status = response.status;

  // Determine log level based on status code
  const logData = {
    message: `${method.toUpperCase()} ${url} - ${status}`,
    method: method.toUpperCase(),
    url: url,
    status: status,
    duration: duration,
    userAgent: context.req.headers.get("user-agent"),
  };

  if (status >= 500) {
    logError("ResponseError", logData);
  } else if (status >= 400) {
    logWarn("ResponseWarning", logData);
  } else {
    logInfo("ResponseSuccess", logData);
  }

  return response;
});

export default responseLoggerMiddleware;
