"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Unlink,
  Undo2,
  Redo2,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeightClass?: string;
}

export function RichTextEditor({ value, onChange, minHeightClass = "min-h-48" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `rich-text ${minHeightClass} px-3 py-2 text-sm text-stone-900 focus:outline-none`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (e.g. https://example.com)", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const buttons = [
    { icon: Bold, label: "Bold", active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Underline, label: "Underline", active: state.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    "divider",
    { icon: Heading2, label: "Heading", active: state.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Subheading", active: state.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    "divider",
    { icon: List, label: "Bulleted list", active: state.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numbered list", active: state.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    "divider",
    { icon: Link, label: "Add link", active: state.link, run: setLink },
    ...(state.link
      ? [{ icon: Unlink, label: "Remove link", active: false, run: () => editor.chain().focus().unsetLink().run() }]
      : []),
    "divider",
    { icon: Undo2, label: "Undo", active: false, disabled: !state.canUndo, run: () => editor.chain().focus().undo().run() },
    { icon: Redo2, label: "Redo", active: false, disabled: !state.canRedo, run: () => editor.chain().focus().redo().run() },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 px-1.5 py-1">
      {buttons.map((b, i) =>
        b === "divider" ? (
          <span key={i} className="mx-1 h-5 w-px bg-stone-200" />
        ) : (
          <button
            key={i}
            type="button"
            title={b.label}
            aria-label={b.label}
            aria-pressed={b.active}
            disabled={"disabled" in b ? b.disabled : false}
            // Keep focus (and the selection) in the editor while clicking the toolbar
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.run}
            className={cn(
              "p-1.5 rounded-md transition-colors disabled:opacity-30",
              b.active ? "bg-brand-50 text-brand-700" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            )}
          >
            <b.icon className="w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
}
