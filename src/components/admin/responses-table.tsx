"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Trash2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ResponseRow {
  id: string;
  submittedAt: Date;
  preview: string;
}

interface Props {
  questionnaireId: string;
  responses: ResponseRow[];
}

export function ResponsesTable({ questionnaireId, responses }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!deletingId) return;
    setLoading(true);
    await fetch(`/api/responses/${deletingId}`, { method: "DELETE" });
    setLoading(false);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Submitted
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                First answer
              </th>
              <th className="px-6 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {responses.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-3 text-stone-600 whitespace-nowrap">
                  {formatDate(r.submittedAt)}
                </td>
                <td className="px-6 py-3 text-stone-700 max-w-xs truncate">
                  {r.preview}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link
                      href={`/questionnaires/${questionnaireId}/results/${r.id}`}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setDeletingId(r.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete this response?"
      >
        <p className="text-sm text-stone-600 mb-6">
          This will permanently delete this response and all its answers.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
