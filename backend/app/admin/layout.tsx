import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  if ((session.user as { role?: string }).role !== "PLATFORM_ADMIN") {
    redirect("/");
  }

  const pendingCount = await prisma.nonprofitApplication.count({
    where: { status: "PENDING" },
  });

  return <AdminShell pendingCount={pendingCount}>{children}</AdminShell>;
}
