"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./rich-text-editor";
import { DEFAULT_COVER_BUTTON_LABEL } from "@/lib/cover";
import { ChevronDown, ChevronUp, ExternalLink, ImagePlus, Trash2 } from "lucide-react";

interface Props {
  questionnaireId: string;
  surveyTitle: string;
  surveyUrl: string;
  initial: {
    coverEnabled: boolean;
    coverTitle: string | null;
    coverBody: string | null;
    coverButtonLabel: string | null;
  };
  initialImageVersion: number | null;
}

export function CoverPageSettings({
  questionnaireId,
  surveyTitle,
  surveyUrl,
  initial,
  initialImageVersion,
}: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(initial.coverEnabled);
  const [savedEnabled, setSavedEnabled] = useState(initial.coverEnabled);
  const [coverTitle, setCoverTitle] = useState(initial.coverTitle ?? "");
  const [coverBody, setCoverBody] = useState(initial.coverBody ?? "");
  const [buttonLabel, setButtonLabel] = useState(initial.coverButtonLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [imageVersion, setImageVersion] = useState(initialImageVersion);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const imageUrl = `/api/questionnaires/${questionnaireId}/cover-image`;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/questionnaires/${questionnaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coverEnabled: enabled,
        coverTitle: coverTitle.trim() || null,
        coverBody: coverBody.trim() || null,
        coverButtonLabel: buttonLabel.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedEnabled(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(imageUrl, { method: "POST", body: form });
    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImageError(data.error || "Upload failed. Please try again.");
      return;
    }
    setImageVersion(data.version);
  }

  async function handleRemoveImage() {
    setImageError("");
    const res = await fetch(imageUrl, { method: "DELETE" });
    if (res.ok) setImageVersion(null);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          Cover page
          <Badge variant={savedEnabled ? "green" : "stone"}>{savedEnabled ? "On" : "Off"}</Badge>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-5 border-t border-stone-100">
          <label className="flex items-center gap-3 cursor-pointer pt-4">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Show a cover page before the questions</p>
              <p className="text-xs text-stone-400">
                Respondents see this page first and click a button to start. When off, the survey
                opens with the title and description as usual.
              </p>
            </div>
          </label>

          {enabled && (
            <>
              {/* Image */}
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-stone-700">Image or logo (optional)</p>
                <p className="text-xs text-stone-400">
                  Shown centred at the top. PNG, JPG, GIF or WebP, up to 2 MB. Uploads save straight away.
                </p>
                {imageVersion ? (
                  <div className="flex flex-wrap items-center gap-4 rounded-lg border border-stone-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${imageUrl}?v=${imageVersion}`}
                      alt="Cover image"
                      className="max-h-24 max-w-[12rem] object-contain"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInput.current?.click()}>
                        Replace
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleRemoveImage}>
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 py-5 border-2 border-dashed border-stone-200 rounded-lg text-sm text-stone-400 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-50"
                  >
                    <ImagePlus className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload image"}
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                {imageError && <p className="text-xs text-red-600">{imageError}</p>}
              </div>

              <Input
                label="Cover title"
                value={coverTitle}
                onChange={(e) => setCoverTitle(e.target.value)}
                placeholder={surveyTitle}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Introduction</label>
                <RichTextEditor value={coverBody} onChange={setCoverBody} />
              </div>

              <Input
                label="Button text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder={DEFAULT_COVER_BUTTON_LABEL}
                maxLength={60}
              />
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" loading={saving} onClick={handleSave}>
              {saved ? "Saved" : "Save cover page"}
            </Button>
            {savedEnabled && (
              <a
                href={surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Preview
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
