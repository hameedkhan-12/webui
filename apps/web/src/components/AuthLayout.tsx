"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Button } from "./ui/button";

type AuthModalMode = "sign-in" | "sign-up" | null;

interface AuthModalProps {
  mode: AuthModalMode;
  onClose: () => void;
  redirectUrl?: string;
}

// Webra logo as inline SVG data URI
const WEBRA_LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="10" fill="#171717"/>
      <rect x="8"  y="8"  width="14" height="14" rx="2" fill="white"/>
      <rect x="26" y="8"  width="14" height="14" rx="2" fill="white" opacity="0.45"/>
      <rect x="8"  y="26" width="14" height="14" rx="2" fill="white" opacity="0.45"/>
      <rect x="26" y="26" width="14" height="14" rx="2" fill="white" opacity="0.7"/>
    </svg>`
  );

const CLERK_APPEARANCE = {
  elements: {
    // ✅ Let Clerk's card be the only white box
    rootBox: "w-full",
    card: "shadow-2xl rounded-[20px] w-full",
    headerTitle: "text-[20px] font-bold tracking-tight text-neutral-900",
    headerSubtitle: "text-[13px] text-neutral-500",
    socialButtonsBlockButton:
      "border border-neutral-200 bg-white rounded-[10px] text-[14px] font-medium text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 transition-all h-11",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-neutral-200",
    dividerText: "text-[12px] text-neutral-400",
    formFieldLabel: "text-[12px] font-medium text-neutral-600",
    formFieldInput:
      "rounded-[9px] border border-neutral-200 text-[14px] text-neutral-900 placeholder:text-neutral-300 h-11 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/6 transition-all",
    formButtonPrimary:
      "bg-neutral-900 hover:opacity-85 rounded-[10px] text-[14px] font-semibold h-11 transition-all",
    footerActionText: "text-[12px] text-neutral-400",
    footerActionLink: "text-[12px] font-semibold text-neutral-900 hover:underline",
    identityPreviewText: "text-[13px]",
    formResendCodeLink: "text-neutral-900 font-medium text-[13px]",
    otpCodeFieldInput: "rounded-[9px] border border-neutral-200 focus:border-neutral-900",
    alert: "rounded-[10px] text-[13px]",
    // ✅ Show logo box so the Webra logo appears
    logoBox: "flex items-center justify-center mb-1",
    logoImage: "h-10 w-10",
  },
  layout: {
    logoImageUrl: WEBRA_LOGO,
    logoLinkUrl: "/",
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
  },
};

export function AuthModal({ mode, onClose, redirectUrl = "/generate" }: AuthModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!mode) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [mode, handleKey]);

  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[3px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ✅ Thin relative wrapper — only for close button positioning, no bg/padding */}
      <div className="relative w-full max-w-md">

        <Button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-[12px] text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Close"
        >
          ✕
        </Button>

        {mode === "sign-up" ? (
          <SignUp
            appearance={CLERK_APPEARANCE}
            routing="virtual"
            fallbackRedirectUrl={redirectUrl}
          />
        ) : (
          <SignIn
            appearance={CLERK_APPEARANCE}
            routing="virtual"
            fallbackRedirectUrl={redirectUrl}
          />
        )}
      </div>
    </div>
  );
}

// ─── AuthLayout ───────────────────────────────────────────────────────────────
// Full-page layout used by /sign-in and /sign-up route pages.

interface AuthLayoutProps {
  mode: 'sign-in' | 'sign-up';
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(168,85,247,0.12),transparent)]" />

      <div className="relative w-full max-w-md">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <rect x="4"  y="4"  width="18" height="18" rx="3" fill="white" />
              <rect x="26" y="4"  width="18" height="18" rx="3" fill="white" opacity="0.45" />
              <rect x="4"  y="26" width="18" height="18" rx="3" fill="white" opacity="0.45" />
              <rect x="26" y="26" width="18" height="18" rx="3" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">Webra</span>
        </div>

        {children}
      </div>
    </div>
  );
}