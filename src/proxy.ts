import { auth } from "@/auth";

export default auth(function proxy(req) {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname === "/login";

  if (isLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/hub", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    if (nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    }
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Protege todo salvo las rutas de auth, assets estáticos, el favicon y lo
  // que el celular necesita sin sesión para instalar la app (manifest e íconos).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
