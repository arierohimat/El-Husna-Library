import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { UserTable } from "@/components/users/user-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardLayout userRole={session.role} userName={session.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <UserTable users={users} />
      </div>
    </DashboardLayout>
  );
}
