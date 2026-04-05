import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppRequest, Middleware } from "./compose";

export const withAuth: Middleware = async (req, next) => {
  const { userId } = await auth();
  
  if (!userId) {
    req.logger.warn("Unauthorized access attempt");
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED", status: 401 },
      { status: 401 }
    );
  }

  req.ctx.clerk_user_id = userId;
  return next();
};
