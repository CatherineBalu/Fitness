import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import { router } from './router';
import { clerkAppearance } from '@/lib/clerkAppearance';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
      <RouterProvider router={router} />
    </ClerkProvider>
  </StrictMode>,
);
