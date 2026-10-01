"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  Edit2,
  BarChart2,
  Link2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Check,
  Copy,
} from "lucide-react";

interface Props {
  id: string;
  isOpen: boolean;
  shareUrl: string;
  userRole: string;
}

export function QuestionnaireDashboardActions({
  id,
  isOpen,
  shareUrl,
  userRole,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteConfirmed = confirmText.trim().toLowerCase() === "delete";
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggle() {
    setToggling(true);
    await fetch(`/api/questionnaires/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !isOpen }),
    });
    setToggling(false);
    router.refresh();
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/questionnaires/${id}/duplicate`, { method: "POST" });
    setDuplicating(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/questionnaires/${data.id}/edit`);
    }
  }

  function closeDeleteDialog() {
    setConfirmDelete(false);
    setConfirmText("");
  }

  async function handleDelete() {
    if (!deleteConfirmed) return;
    setDeleting(true);
    await fetch(`/api/questionnaires/${id}`, { method: "DELETE" });
    setDeleting(false);
    closeDeleteDialog();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        title="Copy share link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-brand-600" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>

      <button
        onClick={handleToggle}
        disabled={toggling}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40"
        title={isOpen ? "Close questionnaire" : "Open questionnaire"}
      >
        {isOpen ? (
          <ToggleRight className="w-4 h-4 text-brand-600" />
        ) : (
          <ToggleLeft className="w-4 h-4" />
        )}
      </button>

      <button
        onClick={handleDuplicate}
        disabled={duplicating}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40"
        title="Duplicate"
      >
        <Copy className="w-4 h-4" />
      </button>

      <Link
        href={`/questionnaires/${id}/edit`}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </Link>

      <Link
        href={`/questionnaires/${id}/results`}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        title="Results"
      >
        <BarChart2 className="w-4 h-4" />
      </Link>

      {userRole === "ADMIN" && (
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <Dialog
        open={confirmDelete}
        onClose={closeDeleteDialog}
        title="Delete questionnaire?"
      >
        <p className="text-sm text-stone-600 mb-4">
          This will permanently delete the questionnaire and all its responses.
          This action cannot be undone.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="flex flex-col gap-1.5 mb-6"
        >
          <label htmlFor={`confirm-delete-${id}`} className="text-sm text-stone-700">
            Type <span className="font-semibold">Delete</span> to confirm
          </label>
          <input
            id={`confirm-delete-${id}`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoFocus
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </form>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={closeDeleteDialog}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            disabled={!deleteConfirmed}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
