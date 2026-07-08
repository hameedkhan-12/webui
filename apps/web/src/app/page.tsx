"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/AuthLayout";
import { createProject } from "../lib/projectsApi";

type ModalMode = "sign-in" | "sign-up" | null;

const HINT_CHIPS = [
  { label: "Dashboard", prompt: "A project management dashboard" },
  { label: "Landing page", prompt: "A landing page for a SaaS product" },
  { label: "Portfolio", prompt: "A portfolio site for a designer" },
  { label: "Store", prompt: "An e-commerce store for handmade goods" },
] as const;

const EXAMPLE_PROMPTS = [
  "Real-time chat app",
  "Kanban board",
  "Component library",
  "Team wiki",
] as const;

export default function HomePage() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/projects');
    }
  }, [isSignedIn, router]);

  const redirectUrl = prompt.trim()
    ? `/generate?prompt=${encodeURIComponent(prompt.trim())}`
    : "/generate";

  const handleGenerate = useCallback(() => {
    const value = prompt.trim();
    if (!value) { textareaRef.current?.focus(); return; }

    if (isSignedIn) {
      setGenerating(true);
      (async () => {
        try {
          const token = await getToken({ skipCache: true });
          const name = value.split('\n')[0].slice(0, 30) || "AI Project";
          const created = await createProject(name, token);
          if (created) {
            router.push(`/project/${created.id}?prompt=${encodeURIComponent(value)}`);
          } else {
            router.push('/projects');
          }
        } catch {
          router.push('/projects');
        } finally {
          setGenerating(false);
        }
      })();
    } else {
      // Show Clerk sign-up modal — same UX as Lovable/Bolt
      setModalMode("sign-up");
    }
  }, [prompt, isSignedIn, router, getToken]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const fillPrompt = (text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-[family-name:var(--font-geist-sans)]">

      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-neutral-200 bg-[#FAFAFA]/85 px-8 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/plura-logo.svg" alt="Webra" width={22} height={22} />
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">Webra</span>
        </Link>

        <div className="flex items-center gap-1">
          {["Features", "Pricing", "Docs"].map((l) => (
            <Link
              key={l}
              href={`/${l.toLowerCase()}`}
              className="rounded-md px-3 py-1.5 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {l}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Link
              href="/projects"
              className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
            >
              Go to Projects
            </Link>
          ) : (
            <>
              <button
                onClick={() => setModalMode("sign-in")}
                className="rounded-lg border border-neutral-200 px-3.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
              >
                Sign in
              </button>
              <button
                onClick={() => setModalMode("sign-up")}
                className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-14 text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Now in public beta &mdash; free to use
        </div>

        <h1 className="mb-5 max-w-170 text-[clamp(36px,5.5vw,62px)] font-semibold leading-[1.1] tracking-[-1.5px] text-neutral-900">
          Build anything with{" "}
          <span className="text-neutral-400">a single prompt</span>
        </h1>

        <p className="mb-11 max-w-110 text-[clamp(15px,1.8vw,18px)] leading-relaxed text-neutral-500">
          Describe what you want to build. Webra generates a fully functional,
          collaborative canvas in seconds.
        </p>

        {/* Prompt box */}
        <div className="mb-5 w-full max-w-170 overflow-hidden rounded-[14px] border border-neutral-200 bg-white shadow-sm transition-all focus-within:border-neutral-400 focus-within:shadow-md">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build…"
            rows={3}
            className="w-full resize-none border-none bg-transparent px-5 py-5 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <div className="flex items-center justify-between border-t border-neutral-100 bg-[#FAFAFA] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {HINT_CHIPS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => fillPrompt(c.prompt)}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] text-neutral-500 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-85 active:scale-[0.97] disabled:opacity-50"
            >
              {generating ? "Creating..." : "Generate"}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[12px] text-neutral-400">Try:</span>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => fillPrompt(p)}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-500 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Clerk Auth Modal */}
      <AuthModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}