"use client";
import { AdminIllustratedHeading } from "@/components/admin-section-art";
import { UiText } from "@/components/ui-locale";


import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminAiFailure } from "@/lib/admin-ai-errors";
import {
  assistantAccepted,
  attemptRetry,
  attemptSend,
  buildPanelRequest,
  createFlow,
  finishFailure,
  finishSuccess,
  markdownHref,
  requestStop,
  resetChat,
  setDraft,
  type FlowTurn,
  type FlowView,
} from "@/lib/admin-ai-flow";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

type Turn = FlowTurn;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function inlineMarkdown(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${key}-b${index}`}><UiText>{token.slice(2, -2)}</UiText></strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={`${key}-c${index}`} className="rounded bg-[#e7eef8] px-1">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = markdownHref(token);
      if (link) {
        nodes.push(
          <a key={`${key}-a${index}`} href={link.href} className="underline">
            <UiText>{link.label}</UiText>
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = start + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function SafeMarkdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).filter((block) => block.trim());
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const list = lines.every((line) => /^(\s*[-*]|\s*\d+\.)\s+/.test(line));
        if (list) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {inlineMarkdown(line.replace(/^(\s*[-*]|\s*\d+\.)\s+/, ""), `${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => line.startsWith("```"))) return null;
        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {inlineMarkdown(line, `${blockIndex}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AdminAiChat({ locale = "uz" }: { locale?: Locale }) {
  const copy = uiCopy(locale);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [view, setView] = useState<FlowView>(() => createFlow(copy.hello));
  const viewRef = useRef(view);
  viewRef.current = view;
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiHint, setOpenaiHint] = useState("");
  const [openaiLinked, setOpenaiLinked] = useState(false);
  const [replaceKey, setReplaceKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [keyNote, setKeyNote] = useState("");

  async function loadKey() {
    const res = await fetch("/api/admin/ai", { credentials: "same-origin" });
    const data = (await res.json().catch(() => null)) as {
      hasOpenAi?: boolean;
      openaiHint?: string;
    } | null;
    const linked = Boolean(data?.hasOpenAi);
    setOpenaiLinked(linked);
    setOpenaiHint(data?.openaiHint || "");
    setOpenaiKey("");
    setReplaceKey(false);
  }

  useEffect(() => {
    void loadKey();
  }, []);

  useEffect(() => {
    if (!openaiLinked) return;
    setView((prev) => {
      if (prev.turns.length !== 1 || prev.turns[0].id !== "hello") return prev;
      const next = {
        ...prev,
        turns: [{ ...prev.turns[0], text: copy.linkedHello }],
      };
      viewRef.current = next;
      return next;
    });
  }, [openaiLinked, copy.linkedHello]);

  function showError(message: string) {
    const next = { ...viewRef.current, error: message };
    viewRef.current = next;
    setView(next);
  }

  async function saveOpenAi(event: React.FormEvent) {
    event.preventDefault();
    const value = openaiKey.trim();
    if (!value) {
      showError(copy.keyRequired);
      return;
    }
    if (value.includes("…")) {
      setKeyNote(copy.keySaved);
      setReplaceKey(false);
      setOpenaiKey("");
      return;
    }
    setSaving(true);
    showError("");
    setKeyNote("");
    const res = await fetch("/api/admin/ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save-key", openaiKey: value }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      hasOpenAi?: boolean;
      openaiHint?: string;
      message?: string;
      error?: string;
    } | null;
    setSaving(false);
    if (!data?.ok) {
      showError(data?.message || data?.error || "ChatGPT kaliti saqlanmadi.");
      return;
    }
    setOpenaiLinked(Boolean(data.hasOpenAi));
    setOpenaiHint(data.openaiHint || "");
    setOpenaiKey("");
    setReplaceKey(false);
    setKeyNote(
      data.message ||
        (data.hasOpenAi
          ? "ChatGPT saqlandi. Keyingi kirishlarda qayta yozish shart emas."
          : "ChatGPT kaliti olib tashlandi."),
    );
  }

  function scrollThread() {
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }, 40);
  }

  function commit(next: FlowView) {
    viewRef.current = next;
    setView(next);
  }

  async function runRequest(generation: number, query: string, prior: Turn[]) {
    const controller = new AbortController();
    abortRef.current = controller;
    scrollThread();
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(buildPanelRequest(query, prior)),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        text?: string;
        source?: string;
        message?: string;
      } | null;
      if (controller.signal.aborted || viewRef.current.generation !== generation) return;
      const gate = assistantAccepted(res.ok, data);
      const next = gate.show
        ? finishSuccess(viewRef.current, generation, newId(), gate.text)
        : finishFailure(
            viewRef.current,
            generation,
            gate.error || data?.message || copy.noAnswer,
          );
      commit(next);
      if (gate.show) scrollThread();
    } catch {
      if (viewRef.current.generation !== generation) return;
      commit(
        finishFailure(
          viewRef.current,
          generation,
          controller.signal.aborted
            ? copy.stopped
            : adminAiFailure("network", locale).message,
        ),
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function send(event?: React.FormEvent) {
    event?.preventDefault();
    const result = attemptSend(viewRef.current, copy.tooLong, newId());
    commit(result.view);
    if (!result.ok) return;
    void runRequest(result.generation, result.query, result.prior);
  }

  function stop() {
    abortRef.current?.abort();
    commit(requestStop(viewRef.current, copy.stopped));
  }

  function retry() {
    const result = attemptRetry(viewRef.current);
    commit(result.view);
    if (!result.ok) return;
    void runRequest(result.generation, result.query, result.prior);
  }

  function newChat() {
    abortRef.current?.abort();
    commit(resetChat(viewRef.current, openaiLinked ? copy.linkedHello : copy.hello));
  }

  async function copyTurn(turn: Turn) {
    try {
      await navigator.clipboard.writeText(turn.text);
      setCopiedId(turn.id);
      window.setTimeout(() => setCopiedId(""), 1200);
    } catch {
      setCopiedId("");
    }
  }

  function onKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const showKeyForm = !openaiLinked || replaceKey;
  const turns = view.turns;
  const pending = view.pending;
  const error = view.error;
  const text = view.draft;
  const lastSource = view.source;

  return (
    <section
      id="ai-yordamchi"
      className="space-y-3 rounded-2xl border border-[#1a6fd4]/20 bg-white/95 p-5 shadow-sm"
    >
      <AdminIllustratedHeading kind="assistant" compact>      <div className="space-y-1">
        <p className="text-xs font-medium tracking-[0.22em] text-[#1a6fd4] uppercase">
          <UiText>{copy.aiKicker}</UiText>
        </p>
        <h2 className="font-heading text-xl font-semibold text-[#051530]">
          <UiText>{copy.aiTitle}</UiText>
        </h2>
        <p className="text-sm text-[#5a5248]"><UiText>{copy.aiLead}</UiText></p>
      </div></AdminIllustratedHeading>
      {openaiLinked && !replaceKey ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eaf3ff] px-3 py-2">
          <p className="text-sm font-medium text-[#0b4fa8]">
            <UiText>{copy.linkedNote}</UiText>
            <UiText>{openaiHint ? ` (${openaiHint})` : ""}</UiText>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[#9dbbe8] text-[#0b4fa8]"
            onClick={() => {
              setReplaceKey(true);
              setOpenaiKey("");
            }}
          >
            <UiText>{copy.replaceKey}</UiText>
          </Button>
        </div>
      ) : null}
      {showKeyForm ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => void saveOpenAi(event)}
        >
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="text-[#5b7aa8]"><UiText>{copy.chatgptKey}</UiText></span>
            <Input
              type="password"
              autoComplete="off"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="h-11 rounded-xl border-[#cfe0f5] bg-white"
            />
          </label>
          <Button
            type="submit"
            disabled={saving}
            className="h-11 rounded-full bg-[#1a6fd4] px-4 text-white hover:bg-[#155bb0]"
          >
            <UiText>{saving ? copy.saving : copy.save}</UiText>
          </Button>
          {openaiLinked ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="h-11 rounded-full"
              onClick={() => {
                setReplaceKey(false);
                setOpenaiKey("");
                showError("");
              }}
            ><UiText>{" Bekor "}</UiText></Button>
          ) : null}
        </form>
      ) : null}
      {!openaiLinked ? (
        <p className="text-xs text-[#5b7aa8]"><UiText>{" Kalit: platform.openai.com → API keys. sk- bilan boshlanadi. Bir marta saqlang. "}</UiText></p>
      ) : null}
      {keyNote ? <p className="text-sm text-[#0b4fa8]"><UiText>{keyNote}</UiText></p> : null}
      <div
        ref={listRef}
        data-admin-ai="thread"
        data-source={lastSource}
        className="flex max-h-80 min-h-52 flex-col gap-2 overflow-y-auto rounded-2xl bg-[#f4f8ff] p-3"
      >
        {turns.map((turn) => (
          <div
            key={turn.id}
            data-admin-ai={turn.role}
            className={
              turn.role === "user"
                ? "ml-10 rounded-2xl rounded-br-md bg-[#1a6fd4] px-3 py-2 text-sm text-white"
                : "mr-10 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-[#051530] shadow-sm"
            }
          >
            {turn.role === "assistant" && turn.id !== "hello" ? (
              <SafeMarkdown text={turn.text} />
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
            )}
            {turn.role === "assistant" && turn.id !== "hello" ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-[#0b4fa8]"
                onClick={() => void copyTurn(turn)}
              >
                <UiText>{copiedId === turn.id ? copy.copied : copy.copy}</UiText>
              </button>
            ) : null}
          </div>
        ))}
        {pending ? (
          <div className="mr-10 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-[#5b7aa8]" data-admin-ai="pending">
            <UiText>{copy.preparing}</UiText>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-[#b42318]" role="alert" data-admin-ai="error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-9 rounded-full" onClick={newChat}>
          <UiText>{copy.newChat}</UiText>
        </Button>
        {pending ? (
          <Button type="button" variant="outline" className="h-9 rounded-full" onClick={stop} data-admin-ai="stop">
            <UiText>{copy.stop}</UiText>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full"
            onClick={retry}
            disabled={!turns.some((turn) => turn.role === "user")}
            data-admin-ai="retry"
          >
            <UiText>{copy.retry}</UiText>
          </Button>
        )}
      </div>
      <form className="flex items-end gap-2" onSubmit={(event) => void send(event)} data-admin-ai="form">
        <Textarea
          value={text}
          onChange={(e) => commit(setDraft(viewRef.current, e.target.value))}
          onKeyDown={onKey}
          placeholder={copy.askPh}
          data-admin-ai="input"
          className="min-h-12 flex-1 resize-none rounded-xl border-[#cfe0f5] bg-white"
        />
        <Button
          type="submit"
          disabled={pending || !text.trim()}
          data-admin-ai="send"
          className="h-11 rounded-full bg-[#1a6fd4] px-4 text-white hover:bg-[#155bb0]"
        >
          <Sparkles className="size-4" />
          <UiText>{copy.send}</UiText>
        </Button>
      </form>
    </section>
  );
}
