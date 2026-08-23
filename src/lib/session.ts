import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  email: string;
  username: string;
  name: string;
  kelas: string | null;
  role: "ADMIN" | "SISWA" | "GURU";


}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies(); // ✅ BENAR untuk Next 16
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    return JSON.parse(sessionCookie.value) as SessionUser;
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("Dynamic server usage")) {
      throw error;
    }
    console.error("getSession error:", error);
    return null;
  }
}

export async function requireAuth(
  role?: "ADMIN" | "SISWA" | "GURU",
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
