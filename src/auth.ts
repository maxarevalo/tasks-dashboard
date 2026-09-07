import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Login temporal por contraseña única definida en la variable de entorno
 * APP_PASSWORD. Más adelante se puede volver a agregar el proveedor de Google
 * (ver README) sin tocar el resto de la app.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "password",
      name: "Contraseña",
      credentials: {
        password: { label: "Contraseña", type: "password" },
      },
      authorize(credentials) {
        const expected = process.env.APP_PASSWORD;
        if (!expected) {
          throw new Error("APP_PASSWORD no está configurada en el entorno.");
        }
        if (
          typeof credentials?.password === "string" &&
          credentials.password === expected
        ) {
          return {
            id: "owner",
            name: process.env.APP_USER_NAME ?? "Mi cuenta",
            email: process.env.APP_USER_EMAIL ?? "owner@local",
          };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
