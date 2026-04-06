import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export function withErrorHandler(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const requestId = crypto.randomUUID();
    const reqLogger = logger.child({ request_id: requestId, url: req.url, method: req.method });

    try {
      return await handler(req, { ...args[0], logger: reqLogger });
    } catch (error: any) {
      if (error instanceof ZodError) {
        reqLogger.warn({ err: error, details: error.issues }, "Validation Error");
        return NextResponse.json(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            status: 400,
            details: error.issues,
          },
          { status: 400 }
        );
      }

      reqLogger.error({ err: error, stack: error.stack }, "Unhandled Exception");
      return NextResponse.json(
        {
          error: "Internal Server Error",
          code: "INTERNAL_SERVER_ERROR",
          status: 500,
        },
        { status: 500 }
      );
    }
  };
}
