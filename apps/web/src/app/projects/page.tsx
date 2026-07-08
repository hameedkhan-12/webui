"use client";

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ProjectsDashboard = dynamic(
  () => import('../../components/ProjectsDashboard').then((m) => m.ProjectsDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d0f1a]">
        <Loader2 size={24} className="animate-spin text-purple-500" />
      </div>
    ),
  }
);

export default function ProjectsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d0f1a]">
        <Loader2 size={24} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return <ProjectsDashboard />;
}
