import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter, AdapterUser } from "next-auth/adapters";

// NextAuth expects `image` but our schema uses `avatarUrl`.
// This wrapper maps between the two.
function toAdapterUser(user: {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  emailVerified: Date | null;
  [key: string]: unknown;
}): AdapterUser {
  return { ...user, image: user.avatarUrl } as AdapterUser;
}

function buildAdapter(): Adapter {
  const base = PrismaAdapter(prisma);
  return {
    ...base,

    createUser: async (data) => {
      const { image, ...rest } = data as unknown as Record<string, unknown>;
      const user = await prisma.user.create({
        data: { ...(rest as Parameters<typeof prisma.user.create>[0]["data"]), avatarUrl: image as string | null | undefined },
      });
      return toAdapterUser(user);
    },

    updateUser: async (data) => {
      const { image, ...rest } = data as unknown as Record<string, unknown>;
      const user = await prisma.user.update({
        where: { id: data.id as string },
        data: {
          ...(rest as Parameters<typeof prisma.user.update>[0]["data"]),
          ...(image !== undefined ? { avatarUrl: image as string | null } : {}),
        },
      });
      return toAdapterUser(user);
    },

    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },

    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return account ? toAdapterUser(account.user) : null;
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: buildAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("exp://") || url.startsWith("givestream://")) {
        return url;
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.username = user.username ?? "";
        session.user.role = user.role ?? "DONOR";
        session.user.usernameSet = user.usernameSet ?? false;
        const count = await prisma.nonprofitAdmin.count({ where: { userId: user.id } });
        session.user.hasNonprofitAccess = count > 0;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
