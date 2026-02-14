'use client';

import { Suspense } from 'react';
import ChatInterface from './chat-interface';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-mint-600">Loading...</div>}>
      <ChatInterface />
    </Suspense>
  );
}
