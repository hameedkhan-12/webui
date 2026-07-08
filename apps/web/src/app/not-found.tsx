'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center from-blue-50 to-white">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <p className="text-2xl font-semibold text-gray-600">Page Not Found</p>
        <p className="text-gray-500 max-w-md">The page you're looking for doesn't exist. Let's get you back on track.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
