import type { SignIn } from '@clerk/clerk-react';
import type { ComponentProps } from 'react';

type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

const TOKENS = {
  light: {
    card: 'oklch(0.99 0.018 135)',
    foreground: 'oklch(0.19 0.018 135)',
    mutedForeground: 'oklch(0.5 0.018 135)',
    secondary: 'oklch(0.92 0.054 135)',
    border: 'oklch(0.84 0.06 135)',
    primary: '#aacc00',
    primaryForeground: '#0d0d0d',
    destructive: 'oklch(0.577 0.245 27.325)',
  },
  dark: {
    card: '#161616',
    foreground: '#e5e5e5',
    mutedForeground: '#888888',
    secondary: '#1e1e1e',
    border: '#2a2a2a',
    primary: '#aacc00',
    primaryForeground: '#0d0d0d',
    destructive: 'oklch(0.704 0.191 22.216)',
  },
} as const;

export function getClerkAppearance(theme: 'light' | 'dark'): Appearance {
  const {
    card,
    foreground,
    mutedForeground,
    secondary,
    border,
    primary,
    primaryForeground,
    destructive,
  } = TOKENS[theme];

  return {
    variables: {
      colorBackground: card,
      colorPrimary: primary,
      colorText: foreground,
      colorTextSecondary: mutedForeground,
      colorInputBackground: secondary,
      colorInputText: foreground,
      colorDanger: destructive,
      borderRadius: '12px',
      fontFamily: "'Inter Variable', system-ui, sans-serif",
    },
    elements: {
      card: {
        backgroundColor: card,
        border: `1px solid ${border}`,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      headerTitle: { color: foreground },
      headerSubtitle: { color: mutedForeground },
      dividerLine: { backgroundColor: border },
      dividerText: { color: mutedForeground },
      formButtonPrimary: {
        backgroundColor: primary,
        color: primaryForeground,
        fontWeight: '700',
      },
      formFieldInput: {
        backgroundColor: secondary,
        borderColor: border,
        color: foreground,
      },
      formFieldLabel: { color: foreground },
      formFieldHintText: { color: mutedForeground },
      formFieldSuccessText: { color: primary },
      formFieldErrorText: { color: destructive },
      identityPreviewText: { color: foreground },
      identityPreviewEditButtonIcon: { color: mutedForeground },
      alternativeMethodsBlockButton: {
        backgroundColor: secondary,
        border: `1px solid ${border}`,
        color: foreground,
      },
      alternativeMethodsBlockButtonText: { color: foreground },
      footerActionLink: { color: primary },
      socialButtonsBlockButton: {
        backgroundColor: secondary,
        border: `1px solid ${border}`,
        color: foreground,
      },
      socialButtonsBlockButtonText: {
        color: foreground,
        fontWeight: '600',
      },
      socialButtonsBlockButtonArrow: { color: mutedForeground },
      socialButtonsProviderIcon: { filter: 'brightness(1)' },
      userButtonPopoverCard: {
        backgroundColor: card,
        border: `1px solid ${border}`,
      },
      userButtonPopoverActionButton: {
        color: foreground,
        '&:hover': { backgroundColor: border, color: primary },
      },
      userButtonPopoverActionButtonText: {
        color: foreground,
        '&:hover': { color: primary },
      },
      userButtonPopoverActionButtonIcon: {
        color: foreground,
        '&:hover': { color: primary },
      },
      userButtonPopoverCustomItemButton: {
        color: foreground,
        '&:hover': { backgroundColor: border, color: primary },
      },
      userButtonPopoverCustomItemButtonText: {
        color: foreground,
        '&:hover': { color: primary },
      },
      userButtonPopoverCustomItemButtonIcon: {
        color: foreground,
        '&:hover': { color: primary },
      },
      userButtonPopoverFooter: { display: 'none' },
      badge: {
        backgroundColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
        color: primary,
        fontWeight: '600',
        fontSize: '11px',
        borderRadius: '6px',
        padding: '1px 6px',
      },
    },
  };
}
