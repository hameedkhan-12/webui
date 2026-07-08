"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#070913]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
    </div>
  );
}
