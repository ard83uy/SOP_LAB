import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/auth/redirect
// Redirect pós-login: determina o destino com base no role do usuário.
// Usado como forceRedirectUrl no componente <SignIn> do Clerk.
// Opera em HTTP puro — sem React rendering — para evitar race conditions de hidratação.

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const user = await prisma.user.findUnique({
    where: { clerk_user_id: userId },
    select: { role: true },
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const target = isAdmin ? "/admin/checklists" : "/staff/checklists";

  return NextResponse.redirect(new URL(target, request.url));
}
