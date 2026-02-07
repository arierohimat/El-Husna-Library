import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  email: string;
  username: string;
  name: string;
  role: "ADMIN" | "MEMBER";
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies(); // ✅ BENAR untuk Next 16
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    return JSON.parse(sessionCookie.value) as SessionUser;
  } catch (error) {
    console.error("getSession error:", error);
    return null; // ❗ jangan throw
  }
}

export async function requireAuth(
  role?: "ADMIN" | "MEMBER",
): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (role && session.role !== role) {
    throw new Error("Forbidden");
  }

  return session;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "ADMIN";
}
