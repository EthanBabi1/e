import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "racer" | "guardian" | "sponsor" | "track_staff" | "admin";
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }
}
