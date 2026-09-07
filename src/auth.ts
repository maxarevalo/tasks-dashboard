import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Lista opcional de correos autorizados (separados por coma) en la variable
 * de entorno ALLOWED_EMAILS. Si está vacía, se permite cualquier cuenta de Google.
 */
const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ profile }) {
      if (allowedEmails.length === 0) return true;
      const email = profile?.email?.toLowerCase();
      return !!email && allowedEmails.includes(email);
    },
  },
});
