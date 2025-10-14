
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

if (!process.env.NEXTAUTH_SECRET) {
  console.error("****************************************************************************************************************************************************************************************************************************************************************");
  console.error("FATAL_ERROR: NEXTAUTH_SECRET is not defined in your environment variables. NextAuth.js will not function correctly without it. Please generate a secret (e.g., using `openssl rand -base64 32`) and add it to your .env file.");
  console.error("****************************************************************************************************************************************************************************************************************************************************************");
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("****************************************************************************************************************************************************************************************************************************************************************");
  console.warn("WARNING: NEXTAUTH_URL is not defined in your environment variables. This might cause issues, especially in production or with OAuth providers. Set it to your application's base URL (e.g., http://localhost:9002 for development).");
  console.warn("****************************************************************************************************************************************************************************************************************************************************************");
}


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials.password) {
            return null;
          }

          const lowerCaseEmail = credentials.username.toLowerCase();

          // 1. proceed with database authentication
          const userFromDb = await prisma.user.findUnique({
            where: { email: lowerCaseEmail },
          });

          if (!userFromDb) {
            return null;
          }

          if (!userFromDb.password) {
            return null; // Or handle as an error, but for login, it means invalid setup
          }

          const passwordMatch = await bcrypt.compare(credentials.password, userFromDb.password);

          if (passwordMatch) {
            return {
              id: userFromDb.id,
              name: userFromDb.name,
              email: userFromDb.email,
              image: userFromDb.image,
            };
          } else {
            return null;
          }
        } catch (error: any) {
          console.error('[NextAuth] Authorize: UNEXPECTED ERROR in authorize callback:', error.message, error.stack);
          // Do not re-throw the error here as it might not be handled well by NextAuth upstream.
          // Returning null is the standard way to indicate authentication failure.
          // If a specific error message needs to be shown to the user, throw an error NextAuth recognizes.
          if (error.message.includes('deactivated')) {
             throw error; // Re-throw specific known errors
          }
          return null;
        }
      },
    }),
  ],
  session: {
  strategy: 'jwt',
  maxAge: 5 * 60, // 5 minutes
  updateAge: 0,   // force update on every request
},
jwt: {
  maxAge: 5 * 60, // match session
},
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user id and role to the token
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Optionally, define a custom error page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
    