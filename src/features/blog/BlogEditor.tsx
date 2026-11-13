"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { buttonClasses } from "@/components/ButtonLink";
import { cx } from "@/components/cx";
import { Notice, inputClass } from "@/features/account/ui";
import { adminBlogPath, adminPostPath, blogPostPath } from "@/lib/routes";
import { deletePost, savePost, type SaveResult } from "./admin-actions";
import { markdownWords, renderMarkdown, videoEmbedUrl } from "./markdown";
import { htmlToMarkdown, isRichPaste } from "./paste-markdown";
import { ImagePrepError, prepareImage } from "./prepare-image";
import { EXCERPT_MAX, TITLE_MAX, cleanTags, formatLongDate, slugify, type PostErrors, type PostInput } from "./rules";

/**
 * The blog editor: the same tools as the Brainy job boards' editor. One
 * markdown box with a toolbar, a live preview, pasting from Google Docs or a
 * web page (converted to markdown, keeping headings, lists, links, bold and
 * pictures), and pictures uploaded to our own storage (toolbar, paste, or
 * drop a file on the box). Videos are YouTube or Vimeo links on their own
 * line.
 */

export type EditorPost = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  coverImageAlt: string;
  author: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type Fields = Omit<PostInput, "tags" | "publishedAt"> & { tags: string; date: string };

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function fieldsOf(post: EditorPost): Fields {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    author: post.author,
    tags: post.tags.join(", "),
    status: post.status,
    date: post.publishedAt.slice(0, 10),
  };
}

const sameFields = (a: Fields, b: Fields) => (Object.keys(a) as (keyof Fields)[]).every((k) => a[k] === b[k]);

// ---------------------------------------------------------------------------
// A small form in a pop-up (link address, picture address, video, alt text)
// ---------------------------------------------------------------------------

type DialogField = {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "url";
  required?: boolean;
};

type DialogRequest = {
  title: string;
  fields: DialogField[];
  submitLabel: string;
  /**
   * Returns an error to show, null when done, or false when it has opened
   * the next step itself (so this pop-up must not close).
   */
  onSubmit: (values: Record<string, string>) => string | null | false;
};

function InsertDialog({ request, onClose }: { request: DialogRequest | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      setError(null);
      dialog.showModal();
    }
    if (!request && dialog.open) dialog.close();
  }, [request]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-panel bg-white p-0 text-navy shadow-menu backdrop:bg-navy/40"
    >
      {request ? (
        <form
          // Keyed so each request starts with empty boxes.
          key={request.title + request.fields.map((f) => f.defaultValue ?? "").join("|")}
          className="flex flex-col gap-5 p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const values = Object.fromEntries(request.fields.map((f) => [f.name, String(data.get(f.name) ?? "").trim()]));
            const problem = request.onSubmit(values);
            if (typeof problem === "string") setError(problem);
            else if (problem === null) onClose();
          }}
        >
          <h2 id={`${id}-title`} className="font-heading text-2xl font-extrabold tracking-[-0.03em]">
            {request.title}
          </h2>
          {request.fields.map((field, index) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-${field.name}`} className="text-base font-bold">
                {field.label}
              </label>
              {field.hint ? <p className="text-[15px] text-muted">{field.hint}</p> : null}
              <input
                id={`${id}-${field.name}`}
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                autoFocus={index === 0}
                className={inputClass}
              />
            </div>
          ))}
          {error ? (
            <p role="alert" className="text-[15px] font-semibold text-[#B3261E]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={buttonClasses("primary-small", "cursor-pointer")}>
              {request.submitLabel}
            </button>
            <button type="button" onClick={onClose} className={buttonClasses("outline", "cursor-pointer")}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

const TOOLS = [
  "Heading",
  "Subheading",
  "Bold",
  "Italic",
  "Link",
  "Bullets",
  "Numbered",
  "Quote",
  "Upload picture",
  "Picture from address",
  "Video",
] as const;

const HELP: [string, string][] = [
  ["## Section", "Heading"],
  ["### Sub-section", "Subheading"],
  ["**bold**", "Bold"],
  ["[text](https://…)", "Link"],
  ["- item", "Bullet list"],
  ["1. item", "Numbered list"],
  ["![description](https://…)", "Picture (or paste or drop a file)"],
  ["https://youtu.be/…", "Video, on its own line"],
];

export function BlogEditor({ post, notice }: { post: EditorPost; notice?: string }) {
  const router = useRouter();
  const ids = useId();
  const isNew = post.id === null;

  const [fields, setFields] = useState<Fields>(() => fieldsOf(post));
  const [saved, setSaved] = useState<Fields>(() => fieldsOf(post));
  const [savedStatus, setSavedStatus] = useState(post.status);
  const [savedSlug, setSavedSlug] = useState(post.slug);
  const [lastSaved, setLastSaved] = useState<string | null>(post.updatedAt);
  // The version of the post this page is editing, and its saved date and
  // time: sent with each save, so a change made meanwhile by someone else
  // (or Grokbot) is never silently overwritten.
  const [version, setVersion] = useState<string | null>(post.updatedAt);
  const [savedPublishedAt, setSavedPublishedAt] = useState(post.publishedAt);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<PostErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: React.ReactNode } | null>(
    notice ? { tone: "success", text: notice } : null,
  );
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [uploading, setUploading] = useState<"body" | "cover" | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const area = useRef<HTMLTextAreaElement>(null);
  const bodyFile = useRef<HTMLInputElement>(null);
  const coverFile = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const dirty = !sameFields(fields, saved);
  const words = useMemo(() => markdownWords(fields.bodyMarkdown), [fields.bodyMarkdown]);
  const preview = useMemo(() => renderMarkdown(fields.bodyMarkdown), [fields.bodyMarkdown]);
  const effectiveSlug = fields.slug || slugify(fields.title);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (errors[key as keyof PostErrors]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (message) noticeRef.current?.focus();
  }, [message]);

  // ---- editing the markdown box ----

  /** Replaces the selection, then puts the cursor or selection back. */
  const edit = useCallback((fn: (selected: string) => { text: string; select?: [number, number] }) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const out = fn(value.slice(a, b));
    const next = value.slice(0, a) + out.text + value.slice(b);
    setFields((current) => ({ ...current, bodyMarkdown: next }));
    requestAnimationFrame(() => {
      el.focus();
      const [s, e] = out.select ?? [out.text.length, out.text.length];
      el.setSelectionRange(a + s, a + e);
    });
  }, []);

  const wrapWith = (mark: string, placeholder: string) =>
    edit((selected) => {
      const t = selected || placeholder;
      return { text: `${mark}${t}${mark}`, select: [mark.length, mark.length + t.length] };
    });

  /** Puts a prefix on every selected line (headings, lists, quotes). */
  const linePrefix = (prefix: (i: number) => string, placeholder: string) =>
    edit((selected) => {
      const lines = (selected || placeholder).split("\n");
      const text = lines.map((l, i) => `${prefix(i)}${l.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s?)/, "")}`).join("\n");
      // With nothing selected, only the placeholder words are selected, so
      // typing replaces them and keeps the "## " or "- " in front.
      const start = selected ? 2 : 2 + prefix(0).length;
      return { text: `\n\n${text}\n\n`, select: [start, text.length + 2] };
    });

  /** A block (picture, video) on its own lines. */
  const insertBlock = (text: string) => edit(() => ({ text: `\n\n${text}\n\n` }));

  function askLink() {
    const selected = area.current
      ? area.current.value.slice(area.current.selectionStart, area.current.selectionEnd)
      : "";
    setDialog({
      title: "Add a link",
      submitLabel: "Add link",
      fields: [
        {
          name: "url",
          label: "Link address",
          hint: "A full address (https://…) or a page on this site, for example /spain/madrid.",
          placeholder: "https://",
          required: true,
        },
        { name: "text", label: "Text to show", defaultValue: selected, required: true },
      ],
      onSubmit: ({ url, text }) => {
        if (!/^(https?:\/\/\S+|\/\S*|mailto:\S+)$/i.test(url)) return "Enter an address starting with https:// or /.";
        edit(() => ({ text: `[${text.replace(/[[\]]/g, "")}](${url})` }));
        return null;
      },
    });
  }

  function altRequest(url: string): DialogRequest {
    return {
      title: "Describe the picture",
      submitLabel: "Add picture",
      fields: [
        {
          name: "alt",
          label: "Description",
          hint: "One short sentence for people who cannot see it. Also helps Google.",
          required: true,
        },
        { name: "caption", label: "Caption (optional)", hint: "Shown under the picture." },
      ],
      onSubmit: ({ alt, caption }) => {
        const title = caption ? ` "${caption.replace(/"/g, "'")}"` : "";
        insertBlock(`![${alt.replace(/[[\]\n]/g, " ")}](${url}${title})`);
        return null;
      },
    };
  }

  const askAlt = (url: string) => setDialog(altRequest(url));

  function askImageUrl() {
    setDialog({
      title: "Add a picture from an address",
      submitLabel: "Next",
      fields: [
        {
          name: "url",
          label: "Picture address",
          hint: "Uploading is safer: pictures on other sites can disappear.",
          placeholder: "https://",
          type: "url",
          required: true,
        },
      ],
      onSubmit: ({ url }) => {
        if (!/^https:\/\/\S+$/i.test(url)) return "Enter an address starting with https://.";
        askAlt(url);
        return false;
      },
    });
  }

  function askVideo() {
    setDialog({
      title: "Add a video",
      submitLabel: "Add video",
      fields: [
        {
          name: "url",
          label: "YouTube or Vimeo link",
          hint: "Copy the link from the video's Share button.",
          placeholder: "https://www.youtube.com/watch?v=…",
          type: "url",
          required: true,
        },
      ],
      onSubmit: ({ url }) => {
        if (!videoEmbedUrl(url)) return "That is not a YouTube or Vimeo video link.";
        insertBlock(url);
        return null;
      },
    });
  }

  function runTool(tool: (typeof TOOLS)[number]) {
    switch (tool) {
      case "Heading":
        return linePrefix(() => "## ", "Section heading");
      case "Subheading":
        return linePrefix(() => "### ", "Sub-section");
      case "Bold":
        return wrapWith("**", "bold text");
      case "Italic":
        return wrapWith("*", "italic text");
      case "Link":
        return askLink();
      case "Bullets":
        return linePrefix(() => "- ", "Item");
      case "Numbered":
        return linePrefix((i) => `${i + 1}. `, "Item");
      case "Quote":
        return linePrefix(() => "> ", "Quote");
      case "Upload picture":
        return bodyFile.current?.click();
      case "Picture from address":
        return askImageUrl();
      case "Video":
        return askVideo();
    }
  }

  // ---- pictures ----

  async function upload(file: File, target: "body" | "cover"): Promise<string | null> {
    setUploading(target);
    setMessage(null);
    try {
      const ready = await prepareImage(file);
      const form = new FormData();
      form.append("file", ready);
      const response = await fetch("/api/admin/blog-images", { method: "POST", body: form });
      const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        setMessage({ tone: "error", text: json.error ?? "The picture could not be uploaded. Please try again." });
        return null;
      }
      return json.url;
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ImagePrepError ? error.message : "The picture could not be uploaded. Please try again.",
      });
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function insertImageFile(file: File) {
    const url = await upload(file, "body");
    if (url) askAlt(url);
  }

  async function setCoverFile(file: File) {
    const url = await upload(file, "cover");
    if (!url) return;
    set("coverImageUrl", url);
    setMessage({ tone: "info", text: "Cover picture uploaded. Add a description, then save." });
  }

  function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const image = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (image) {
      event.preventDefault();
      void insertImageFile(image);
      return;
    }
    const html = event.clipboardData.getData("text/html");
    if (!html || !isRichPaste(html)) return; // plain text pastes as it is
    const md = htmlToMarkdown(html);
    if (!md) return;
    event.preventDefault();
    edit(() => ({ text: md }));
    setMessage({ tone: "info", text: "Pasted and converted. Check the preview." });
  }

  function onDrop(event: React.DragEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    void insertImageFile(file);
  }

  // ---- publishing ----

  function setStatus(next: "draft" | "published") {
    // A post going live for the first time is dated today.
    if (next === "published" && savedStatus === "draft") {
      setFields((current) => ({ ...current, status: next, date: new Date().toISOString().slice(0, 10) }));
    } else {
      set("status", next);
    }
  }

  const save = useCallback(async () => {
    if (busy || uploading) return;
    setBusy("saving");
    setMessage(null);
    // What is sent is what counts as saved, even if typing carries on
    // while the save is under way.
    const sent = fields;
    const today = new Date().toISOString().slice(0, 10);
    const publishedAt =
      sent.date === savedPublishedAt.slice(0, 10)
        ? savedPublishedAt
        : sent.date === today
          ? new Date().toISOString()
          : `${sent.date}T12:00:00.000Z`;
    const input: PostInput = {
      title: sent.title,
      slug: effectiveSlug,
      excerpt: sent.excerpt,
      bodyMarkdown: sent.bodyMarkdown,
      coverImageUrl: sent.coverImageUrl,
      coverImageAlt: sent.coverImageAlt,
      author: sent.author,
      tags: cleanTags(sent.tags),
      status: sent.status,
      publishedAt,
    };
    let result: SaveResult;
    try {
      result = await savePost(post.id, version, input);
    } catch {
      result = { ok: false, message: "That did not save. Check your connection and try again." };
    }
    setBusy(null);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMessage({ tone: "error", text: result.message });
      return;
    }
    setSaved({ ...sent, slug: result.slug, status: result.status });
    setFields((current) => ({ ...current, slug: result.slug, status: result.status }));
    setVersion(result.updatedAt);
    setSavedPublishedAt(result.publishedAt);
    setSlugTouched(true);
    setErrors({});
    setLastSaved(result.updatedAt);
    const wentLive = result.status === "published" && savedStatus !== "published";
    const wentOff = result.status === "draft" && savedStatus === "published";
    setSavedStatus(result.status);
    setSavedSlug(result.slug);
    setMessage({
      tone: "success",
      text: wentLive ? (
        <>
          Published. It is live now at{" "}
          <a href={blogPostPath(result.slug)} target="_blank" rel="noopener" className="underline">
            /blog/{result.slug}
          </a>
          .
        </>
      ) : wentOff ? (
        "Saved as a draft. The post is no longer on the site."
      ) : result.status === "published" ? (
        "Saved. The live post is updated."
      ) : (
        "Draft saved. Only admins can see it."
      ),
    });
    // A new post moves to its own address; an existing one refreshes the
    // heading above the editor (its title and status).
    if (isNew) router.replace(`${adminPostPath(result.id)}?notice=${result.status}`);
    else router.refresh();
  }, [busy, uploading, fields, effectiveSlug, post.id, version, savedPublishedAt, savedStatus, isNew, router]);

  // Ctrl+S or Cmd+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function remove() {
    if (!post.id) return;
    setBusy("deleting");
    const result = await deletePost(post.id).catch(() => ({ ok: false, message: "That did not work. Please try again." }));
    if (!result.ok) {
      setBusy(null);
      setConfirmDelete(false);
      setMessage({ tone: "error", text: result.message ?? "That did not work. Please try again." });
      return;
    }
    setSaved(fields); // nothing left to lose
    router.replace(`${adminBlogPath}?notice=deleted`);
  }

  const saveLabel =
    busy === "saving"
      ? "Saving…"
      : fields.status === "published" && savedStatus !== "published"
        ? "Publish now"
        : fields.status === "draft" && savedStatus === "published"
          ? "Take off the site"
          : isNew
            ? "Save draft"
            : "Save changes";

  const errorText = (key: keyof PostErrors) =>
    errors[key] ? (
      <p id={`${ids}-${key}-error`} className="text-[15px] font-semibold text-[#B3261E]">
        {errors[key]}
      </p>
    ) : null;
  const describe = (key: keyof PostErrors, hint = false) =>
    [hint ? `${ids}-${key}-hint` : null, errors[key] ? `${ids}-${key}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  const panel = "flex flex-col gap-5 rounded-panel border-[1.5px] border-line-mid bg-white p-5 sm:p-7";
  const label = "text-base font-bold";
  const hint = "text-[15px] text-muted";

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(380px,560px)]">
      <div className="flex min-w-0 flex-col gap-6">
        {message ? (
          <Notice tone={message.tone} innerRef={noticeRef}>
            {message.text}
          </Notice>
        ) : null}

        {/* ---- Details ---- */}
        <section aria-labelledby={`${ids}-details`} className={panel}>
          <h2 id={`${ids}-details`} className="font-heading text-xl font-extrabold">
            Post details
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-title`} className={label}>
              Title
            </label>
            <input
              id={`${ids}-title`}
              value={fields.title}
              onChange={(event) => {
                const title = event.target.value;
                setFields((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
                if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
              }}
              maxLength={TITLE_MAX + 40}
              aria-invalid={Boolean(errors.title) || undefined}
              aria-describedby={describe("title", true)}
              placeholder="How to choose a recruitment agency"
              className={cx(inputClass, "font-heading text-xl font-bold")}
            />
            <p id={`${ids}-title-hint`} className={cx(hint, fields.title.length > 65 && "text-pink-text")}>
              {fields.title.length} characters. 45 to 65 shows in full on Google.
            </p>
            {errorText("title")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-slug`} className={label}>
              Web address
            </label>
            <div
              className={cx(
                "flex items-center rounded-btn border-[1.5px] border-line-control bg-white px-4 text-[17px] focus-within:border-indigo focus-within:ring-4 focus-within:ring-indigo/25",
                errors.slug && "border-[#B3261E]",
              )}
            >
              <span className="shrink-0 text-muted">recruiterlink.com/blog/</span>
              <input
                id={`${ids}-slug`}
                value={fields.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value);
                }}
                onBlur={(event) => set("slug", slugify(event.target.value))}
                placeholder={slugify(fields.title) || "your-post"}
                aria-invalid={Boolean(errors.slug) || undefined}
                aria-describedby={describe("slug", !isNew)}
                className="min-w-0 flex-1 bg-transparent py-3 outline-none"
              />
            </div>
            {!isNew ? (
              <p id={`${ids}-slug-hint`} className={hint}>
                If you change it, the old address keeps working and forwards to the new one.
              </p>
            ) : null}
            {errorText("slug")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-excerpt`} className={label}>
              Summary
            </label>
            <p id={`${ids}-excerpt-hint`} className={hint}>
              Shown on the blog page, under the title, and in Google. Aim for 140 to 160 characters.
            </p>
            <textarea
              id={`${ids}-excerpt`}
              rows={3}
              value={fields.excerpt}
              onChange={(event) => set("excerpt", event.target.value)}
              aria-invalid={Boolean(errors.excerpt) || undefined}
              aria-describedby={[describe("excerpt", true), `${ids}-excerpt-count`].filter(Boolean).join(" ")}
              className={cx(inputClass, "resize-y leading-relaxed")}
            />
            <p
              id={`${ids}-excerpt-count`}
              className={cx(hint, fields.excerpt.length > EXCERPT_MAX && "font-semibold text-[#B3261E]")}
            >
              {fields.excerpt.length} of {EXCERPT_MAX} characters
            </p>
            {errorText("excerpt")}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-author`} className={label}>
                Author
              </label>
              <input
                id={`${ids}-author`}
                value={fields.author}
                onChange={(event) => set("author", event.target.value)}
                placeholder="RecruiterLink"
                aria-describedby={describe("author", true)}
                className={inputClass}
              />
              <p id={`${ids}-author-hint`} className={hint}>
                Leave empty to publish as RecruiterLink.
              </p>
              {errorText("author")}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-tags`} className={label}>
                Topics
              </label>
              <input
                id={`${ids}-tags`}
                value={fields.tags}
                onChange={(event) => set("tags", event.target.value)}
                placeholder="Hiring, Recruitment agencies"
                aria-describedby={`${ids}-tags-hint`}
                className={inputClass}
              />
              <p id={`${ids}-tags-hint`} className={hint}>
                Separate with commas. 2 to 5 works best.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Cover ---- */}
        <section aria-labelledby={`${ids}-cover`} className={panel}>
          <div>
            <h2 id={`${ids}-cover`} className="font-heading text-xl font-extrabold">
              Cover picture
            </h2>
            <p className={cx(hint, "mt-1")}>
              Shown at the top of the post, on its card and when it is shared. A wide picture works best (16:9, at
              least 1600 pixels across).
            </p>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="aspect-[16/9] w-full shrink-0 overflow-hidden rounded-card bg-[linear-gradient(135deg,var(--color-lavender),var(--color-pink-tint))] sm:w-56">
              {fields.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fields.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <p className="flex h-full items-center justify-center p-3 text-center text-[15px] text-muted">
                  {uploading === "cover" ? "Uploading…" : "No cover yet"}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => coverFile.current?.click()}
                  disabled={uploading !== null}
                  className={buttonClasses("outline", "cursor-pointer disabled:cursor-wait disabled:opacity-60")}
                >
                  {uploading === "cover" ? "Uploading…" : fields.coverImageUrl ? "Replace picture" : "Upload a picture"}
                </button>
                {fields.coverImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setFields((current) => ({ ...current, coverImageUrl: "", coverImageAlt: "" }))}
                    className="min-h-11 cursor-pointer px-2 font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                ref={coverFile}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void setCoverFile(file);
                }}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${ids}-cover-url`} className="text-[15px] font-bold">
                  Or the picture&apos;s address
                </label>
                <input
                  id={`${ids}-cover-url`}
                  type="url"
                  value={fields.coverImageUrl}
                  onChange={(event) => set("coverImageUrl", event.target.value)}
                  placeholder="https://"
                  aria-invalid={Boolean(errors.coverImageUrl) || undefined}
                  aria-describedby={describe("coverImageUrl")}
                  className={inputClass}
                />
                {errorText("coverImageUrl")}
              </div>
              {fields.coverImageUrl ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${ids}-cover-alt`} className="text-[15px] font-bold">
                    Describe the picture
                  </label>
                  <input
                    id={`${ids}-cover-alt`}
                    value={fields.coverImageAlt}
                    onChange={(event) => set("coverImageAlt", event.target.value)}
                    placeholder="A recruiter meeting a candidate in a London office"
                    aria-describedby={describe("coverImageAlt")}
                    className={inputClass}
                  />
                  {errorText("coverImageAlt")}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ---- Article ---- */}
        <section aria-labelledby={`${ids}-article`} className={panel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${ids}-article`} className="font-heading text-xl font-extrabold">
              Article
            </h2>
            <span className={hint} aria-live="polite">
              {uploading === "body" ? "Uploading picture…" : `${words.toLocaleString("en")} words`}
            </span>
          </div>

          <div role="toolbar" aria-label="Formatting" aria-controls={`${ids}-body`} className="flex flex-wrap gap-2">
            {TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => runTool(tool)}
                disabled={uploading !== null && tool === "Upload picture"}
                className="min-h-10 cursor-pointer rounded-btn-sm border-[1.5px] border-line-strong bg-white px-3 text-[15px] font-semibold text-navy hover:border-navy hover:bg-pale disabled:cursor-wait disabled:opacity-60"
              >
                {tool}
              </button>
            ))}
          </div>
          <input
            ref={bodyFile}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void insertImageFile(file);
            }}
          />

          <label htmlFor={`${ids}-body`} className="sr-only">
            Article text
          </label>
          <textarea
            id={`${ids}-body`}
            ref={area}
            value={fields.bodyMarkdown}
            onChange={(event) => set("bodyMarkdown", event.target.value)}
            onPaste={onPaste}
            onDrop={onDrop}
            rows={26}
            spellCheck
            aria-invalid={Boolean(errors.bodyMarkdown) || undefined}
            aria-describedby={[describe("bodyMarkdown"), `${ids}-body-help`].filter(Boolean).join(" ")}
            placeholder={
              "Write the article here, or paste it from Google Docs.\n\n## First section\n\nA paragraph with **bold** and a [link](/united-kingdom/london).\n\n- A bullet\n- Another bullet"
            }
            className={cx(inputClass, "min-h-[420px] resize-y font-mono text-[15px] leading-7")}
          />
          {errorText("bodyMarkdown")}

          <dl id={`${ids}-body-help`} className="grid grid-cols-1 gap-x-6 gap-y-2 text-[15px] text-muted sm:grid-cols-2">
            {HELP.map(([code, what]) => (
              <div key={what} className="flex min-w-0 gap-3">
                <dt className="min-w-0 shrink-0 truncate font-mono text-navy sm:w-52">{code}</dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- Publishing ---- */}
        <section aria-labelledby={`${ids}-publishing`} className={panel}>
          <h2 id={`${ids}-publishing`} className="font-heading text-xl font-extrabold">
            Publishing
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-bold">Who can see it</legend>
            {(
              [
                ["draft", "Draft", "Only admins can see it. Use this to work on a post or take one off the site."],
                ["published", "Published", "Live on the blog for everyone."],
              ] as const
            ).map(([value, title, text]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-btn border-[1.5px] border-line-control bg-white px-4 py-3 has-[:checked]:border-navy has-[:checked]:bg-lavender"
              >
                <input
                  type="radio"
                  name={`${ids}-status`}
                  value={value}
                  checked={fields.status === value}
                  onChange={() => setStatus(value)}
                  className="mt-1 size-5 shrink-0 accent-[#21174B]"
                />
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-[15px] text-muted">{text}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor={`${ids}-date`} className={label}>
              Date shown on the post
            </label>
            <input
              id={`${ids}-date`}
              type="date"
              value={fields.date}
              onChange={(event) => set("date", event.target.value)}
              aria-invalid={Boolean(errors.publishedAt) || undefined}
              aria-describedby={describe("publishedAt")}
              className={inputClass}
            />
            {errorText("publishedAt")}
          </div>
        </section>

        {/* ---- Actions ---- */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t-[1.5px] border-line bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-card sm:border-[1.5px] sm:px-5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== null || uploading !== null}
            className={buttonClasses(
              fields.status === "draft" && savedStatus === "published" ? "navy" : "primary-small",
              "cursor-pointer disabled:cursor-wait disabled:opacity-70",
            )}
          >
            {saveLabel}
          </button>
          {!isNew && savedStatus === "published" ? (
            <a
              href={blogPostPath(savedSlug)}
              target="_blank"
              rel="noopener"
              className="min-h-11 content-center font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
            >
              View live<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <span className="text-[15px] text-muted" aria-live="polite">
            {dirty ? "Unsaved changes" : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
            <span className="hidden sm:inline"> · Ctrl+S to save</span>
          </span>
          {!isNew ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy !== null}
              className="ml-auto min-h-11 cursor-pointer font-bold text-[#B3261E] underline-offset-4 hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>

        {confirmDelete ? (
          <div role="alertdialog" aria-labelledby={`${ids}-del`} className="rounded-panel border-[1.5px] border-[#B3261E] bg-white p-5 sm:p-7">
            <h2 id={`${ids}-del`} className="font-heading text-xl font-extrabold">
              Delete this post for good?
            </h2>
            <p className="mt-2 text-[17px] text-muted">
              Its address will stop working. To take it off the site but keep it, choose Draft above and save instead.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy !== null}
                className={buttonClasses("navy", "cursor-pointer !bg-[#B3261E] hover:!bg-[#8C1D18] disabled:opacity-70")}
              >
                {busy === "deleting" ? "Deleting…" : "Delete for good"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={buttonClasses("outline", "cursor-pointer")}
                autoFocus
              >
                Keep it
              </button>
            </div>
          </div>
        ) : null}

        {post.updatedBy && !isNew ? (
          <p className="text-[15px] text-muted">Last changed by {post.updatedBy}.</p>
        ) : null}
        <p>
          <Link href={adminBlogPath} className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
            ← All posts
          </Link>
        </p>
      </div>

      {/* ---- Preview ---- */}
      <aside aria-label="Preview" className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <p className="label-mono mb-3 text-[13px] text-pink-text">Preview</p>
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto rounded-panel border-[1.5px] border-line-mid bg-white p-5 sm:p-8">
            <h1 className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance [overflow-wrap:anywhere]">
              {fields.title || "Untitled post"}
            </h1>
            <p className="mt-3 text-[15px] text-muted">
              {fields.date ? formatLongDate(`${fields.date}T12:00:00Z`) : ""} · {Math.max(1, Math.round(words / 200))} min
              read · By {fields.author.trim() || "RecruiterLink"}
            </p>
            {fields.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fields.coverImageUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-card object-cover" />
            ) : null}
            {fields.excerpt ? <p className="mt-6 text-lg leading-relaxed text-muted">{fields.excerpt}</p> : null}
            <div className="mt-6">
              {fields.bodyMarkdown.trim() ? (
                <div className="blog-md" dangerouslySetInnerHTML={{ __html: preview }} />
              ) : (
                <p className="text-muted">The article appears here as you write.</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      <InsertDialog request={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
