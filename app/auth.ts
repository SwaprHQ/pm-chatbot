import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { createUser, getUser } from "../lib/db/queries";
import { User } from "../lib/db/schema";

const providers = [
  CredentialsProvider({
    name: "Ethereum",
    credentials: {
      message: {},
      signature: {},
    },
    async authorize(credentials, req) {
      try {
        if (
          typeof credentials?.message !== "string" ||
          typeof credentials?.signature !== "string"
        ) {
          throw new Error("Invalid credentials");
        }

        const siwe = new SiweMessage(JSON.parse(credentials.message));
        const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!);

        const csrfToken = req.headers
          .get("cookie")
          ?.split("; ")
          .find((cookie) => cookie.startsWith("authjs.csrf-token="))
          ?.split("=")[1]
          .split("%7C")[0];

        if (!csrfToken) {
          throw new Error("CSRF token not found");
        }
        const result = await siwe.verify({
          signature: credentials.signature,
          domain: nextAuthUrl.host,
          nonce: csrfToken,
        });

        if (result.success) {
          const users = await getUser(siwe.address);
          if (users.length !== 0) return users[0];
          await createUser(siwe.address);
          const newUser = await getUser(siwe.address);
          if (newUser.length !== 0) return newUser[0];

          return null;
        }
        return null;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = (user as User).walletAddress;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.name = token.name;
      session.user.image = "";
      return session;
    },
  },
});
