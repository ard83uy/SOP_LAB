import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protege TODAS as rotas exceto /, /sign-in, /sign-up
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/health", "/api/auth/redirect"]);

export default clerkMiddleware(async (auth, request) => {
  const { nextUrl } = request;
  
  // Bypass explícito para o healthcheck do Railway
  if (nextUrl.pathname === "/api/health") {
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
