import { NextResponse } from "next/server";
import { Middleware } from "./compose";
import { ZodSchema, ZodError } from "zod";

export const withValidation = (schema: ZodSchema): Middleware => {
  return async (req, next) => {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();
      
      const parsedBody = schema.parse(body);
      req.ctx.parsedBody = parsedBody;

      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        req.logger.warn({ err: error, details: error.issues }, "Validation Error in middleware");
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

      req.logger.error({ err: error }, "Failed to parse JSON body");
      return NextResponse.json(
        { error: "Invalid JSON", code: "BAD_REQUEST", status: 400 },
        { status: 400 }
      );
    }
  };
};
