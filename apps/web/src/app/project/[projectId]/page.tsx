"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Workspace = dynamic(() => import('../../../components/Workspace'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#070913]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
        <p className="text-xs text-slate-500 tracking-widest uppercase">Loading workspace…</p>
      </div>
    </div>
  ),
});

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#070913]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}