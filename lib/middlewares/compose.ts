import { NextResponse, NextRequest } from "next/server";
import { logger } from "../logger";

export type AppContext = {
  clerk_user_id?: string;
  tenant_id?: string;
  user_id?: string;
  role?: string;
  profile_id?: string | null;
  parsedBody?: any;
};

export type AppRequest = NextRequest & { ctx: AppContext; logger: typeof logger };

export type Middleware = (
  req: AppRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

export function compose(...middlewares: (Middleware | Function)[]) {
  return async (req: NextRequest, { params }: { params: any } = { params: {} }) => {
    const requestId = crypto.randomUUID();
    const reqLogger = logger.child({ request_id: requestId, url: req.url, method: req.method });

    (req as AppRequest).ctx = {};
    (req as AppRequest).logger = reqLogger;

    const resolvedParams = params instanceof Promise ? await params : params;

    const execute = async (index: number): Promise<NextResponse> => {
      if (index === middlewares.length - 1) {
        const handler = middlewares[index] as Function;
        try {
          return await handler(req as AppRequest, { params: resolvedParams });
        } catch (error: any) {
             reqLogger.error({ err: error, stack: error.stack }, "Unhandled Exception in handler");
             return NextResponse.json(
               { error: "Internal Server Error", code: "INTERNAL_SERVER_ERROR", status: 500 },
               { status: 500 }
             );
        }
      }

      const middleware = middlewares[index] as Middleware;
      try {
        return await middleware(req as AppRequest, () => execute(index + 1));
      } catch (error: any) {
        reqLogger.error({ err: error, stack: error.stack }, "Unhandled Exception in middleware");
        return NextResponse.json(
          { error: "Internal Server Error", code: "INTERNAL_SERVER_ERROR", status: 500 },
          { status: 500 }
        );
      }
    };

    return execute(0);
  };
}
