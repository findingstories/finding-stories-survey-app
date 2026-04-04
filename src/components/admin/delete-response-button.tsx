"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

interface Props {
  responseId: string;
  questionnaireId: string;
}

export function DeleteResponseButton({ responseId, questionnaireId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/responses/${responseId}`, { method: "DELETE" });
    setLoading(false);
    setOpen(false);
    router.push(`/questionnaires/${questionnaireId}/results`);
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4" />
        Delete response
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this response?"
      >
        <p className="text-sm text-stone-600 mb-6">
          This will permanently delete this response and all its answers.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
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
