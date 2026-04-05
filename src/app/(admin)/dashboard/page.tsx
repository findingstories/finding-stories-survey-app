import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionnaireDashboardActions } from "@/components/admin/questionnaire-dashboard-actions";
import { Plus, BarChart2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();

  const questionnaires = await prisma.questionnaire.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { responses: true } },
      createdBy: { select: { name: true } },
    },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Questionnaires
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {questionnaires.length} questionnaire
            {questionnaires.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/questionnaires/new">
          <Button size="md">
            <Plus className="w-4 h-4" />
            New questionnaire
          </Button>
        </Link>
      </div>

      {questionnaires.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-stone-200">
          <BarChart2 className="w-10 h-10 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-medium mb-1">
            No questionnaires yet
          </h3>
          <p className="text-stone-400 text-sm mb-5">
            Create your first questionnaire to get started.
          </p>
          <Link href="/questionnaires/new">
            <Button>
              <Plus className="w-4 h-4" />
              New questionnaire
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {questionnaires.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-stone-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-stone-900 truncate">
                    {q.title}
                  </h3>
                  <Badge variant={q.isOpen ? "green" : "red"}>
                    {q.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                <p className="text-xs text-stone-400">
                  {q._count.responses} response
                  {q._count.responses !== 1 ? "s" : ""} · Created{" "}
                  {formatDate(q.createdAt)} by {q.createdBy.name}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <QuestionnaireDashboardActions
                  id={q.id}
                  isOpen={q.isOpen}
                  shareUrl={`${baseUrl}/q/${q.slug}`}
                  userRole={
                    (session?.user as { role?: string })?.role ?? "MEMBER"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
