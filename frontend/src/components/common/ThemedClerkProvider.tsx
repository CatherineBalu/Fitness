import { ClerkProvider } from '@clerk/clerk-react';
import { useContext } from 'react';

import { getClerkAppearance } from '@/lib/clerkAppearance';

import { ThemeContext } from './themeContext';

import type { ReactNode } from 'react';

type Props = { publishableKey: string; children: ReactNode };

export default function ThemedClerkProvider({
  publishableKey,
  children,
}: Props) {
  useContext(ThemeContext);
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={getClerkAppearance()}
    >
      {children}
    </ClerkProvider>
  );
}
