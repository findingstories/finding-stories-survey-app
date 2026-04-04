"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { UserPlus, Copy, Check } from "lucide-react";

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send invitation.");
      return;
    }

    setInviteUrl(data.inviteUrl);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setEmail("");
    setError("");
    setInviteUrl("");
    setCopied(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <UserPlus className="w-4 h-4" />
        Invite team member
      </Button>

      <Dialog open={open} onClose={handleClose} title="Invite team member">
        {!inviteUrl ? (
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <Input
              id="invite-email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="secondary" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Send invitation
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-600">
              Invitation created for{" "}
              <span className="font-medium">{email}</span>.
              {process.env.NEXT_PUBLIC_RESEND_ENABLED !== "true" &&
                " Copy the link below to share with them directly:"}
            </p>
            <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-3">
              <code className="text-xs text-stone-700 flex-1 truncate">
                {inviteUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-brand-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
