
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Define your app's UserRole type if it's different or for clarity
type AppUserRole = PrismaUserRole; // Assuming Prisma's enum is the source of truth

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string; // Add id here
    } & DefaultSession["user"]; // Extends DefaultSession["user"]
  }

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    id: string; // Add id here
  }
}
