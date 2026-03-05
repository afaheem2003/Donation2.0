import { prisma } from "@/lib/prisma";
import { Building2, Users, DollarSign, FileText, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING:      "bg-yellow-100 text-yellow-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED:     "bg-green-100 text-green-700",
  REJECTED:     "bg-red-100 text-red-700",
};

export default async function AdminDashboard() {
  const [totalUsers, totalNonprofits, donationAgg, pendingApps, recentApps] = await Promise.all([
    prisma.user.count(),
    prisma.nonprofit.count(),
    prisma.donation.aggregate({
      _count: { id: true },
      _sum: { amountCents: true },
      where: { status: "SUCCEEDED" },
    }),
    prisma.nonprofitApplication.count({ where: { status: "PENDING" } }),
    prisma.nonprofitApplication.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, orgName: true, submittedByEmail: true, status: true, createdAt: true },
    }),
  ]);

  const totalAmountDollars = ((donationAgg._sum.amountCents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const stats = [
    { label: "Total Users",          value: totalUsers.toLocaleString(),               icon: Users,        color: "bg-blue-50 text-blue-600" },
    { label: "Nonprofits",           value: totalNonprofits.toLocaleString(),           icon: Building2,    color: "bg-brand-50 text-brand-600" },
    { label: "Donations",            value: donationAgg._count.id.toLocaleString(),     icon: CheckCircle,  color: "bg-green-50 text-green-600" },
    { label: "Amount Raised",        value: totalAmountDollars,                         icon: DollarSign,   color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending Applications", value: pendingApps.toLocaleString(),               icon: FileText,     color: "bg-yellow-50 text-yellow-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide overview</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Applications</h2>
          <a href="/admin/applications" className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors">
            View all →
          </a>
        </div>
        <div className="divide-y divide-gray-100">
          {recentApps.length === 0 && (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No applications yet</p>
          )}
          {recentApps.map((app) => (
            <a
              key={app.id}
              href={`/admin/applications`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{app.orgName}</p>
                <p className="text-xs text-gray-400 truncate">{app.submittedByEmail}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status]}`}>
                {app.status.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
