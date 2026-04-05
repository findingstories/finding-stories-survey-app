import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { InviteUserForm } from "@/components/admin/invite-user-form";

export default async function TeamPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const [users, pendingInvites] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Team</h1>
        {isAdmin && <InviteUserForm />}
      </div>

      {/* Members */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
          Members ({users.length})
        </h2>
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center px-6 py-4 gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {u.name}{" "}
                  {u.id === session?.user?.id && (
                    <span className="text-stone-400 font-normal">(you)</span>
                  )}
                </p>
                <p className="text-xs text-stone-400">{u.email}</p>
              </div>
              <Badge variant={u.role === "ADMIN" ? "brand" : "stone"}>
                {u.role === "ADMIN" ? "Admin" : "Member"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {isAdmin && pendingInvites.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            Pending invitations ({pendingInvites.length})
          </h2>
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center px-6 py-4 justify-between"
              >
                <div>
                  <p className="text-sm text-stone-900">{inv.email}</p>
                  <p className="text-xs text-stone-400">
                    Expires {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <Badge variant="stone">Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
