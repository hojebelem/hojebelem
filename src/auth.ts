import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(8) })
          .safeParse(raw);
        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (
          !user?.passwordHash ||
          !(await bcrypt.compare(parsed.data.password, user.passwordHash))
        )
          return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && user?.email && profile?.email_verified) {
        const email = normalizeEmail(user.email);
        const existing = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        const db =
          existing ??
          (await prisma.user.create({
            data: { email, name: user.name, avatarUrl: user.image },
          }));
        token.sub = db.id;
        token.role = db.role;
      } else if (user && "role" in user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as "USER" | "ADMIN" | "ORGANIZER";
      }
      return session;
    },
  },
});
