import { colors } from './colors';

import type { SignIn } from '@clerk/clerk-react';
import type { ComponentProps } from 'react';

type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

export const clerkAppearance: Appearance = {
  variables: {
    colorBackground: colors.card,
    colorPrimary: colors.primary,
    colorText: colors.foreground,
    colorTextSecondary: colors.mutedForeground,
    colorInputBackground: colors.secondary,
    colorInputText: colors.foreground,
    colorDanger: colors.destructive,
    borderRadius: '12px',
    fontFamily: "'Inter Variable', system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
    },
    headerTitle: { color: colors.white },
    headerSubtitle: { color: colors.mutedForeground },
    dividerLine: { backgroundColor: colors.border },
    dividerText: { color: colors.mutedForeground },
    formButtonPrimary: {
      backgroundColor: colors.primary,
      color: colors.primaryForeground,
      fontWeight: '700',
    },
    formFieldInput: {
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      color: colors.foreground,
    },
    formFieldLabel: { color: colors.foreground },
    formFieldHintText: { color: colors.mutedForeground },
    formFieldSuccessText: { color: colors.primary },
    formFieldErrorText: { color: colors.destructive },
    identityPreviewText: { color: colors.foreground },
    identityPreviewEditButtonIcon: { color: colors.mutedForeground },
    alternativeMethodsBlockButton: {
      backgroundColor: colors.secondary,
      border: `1px solid ${colors.border}`,
      color: colors.foreground,
    },
    alternativeMethodsBlockButtonText: { color: colors.foreground },
    footerActionLink: { color: colors.primary },
    socialButtonsBlockButton: {
      backgroundColor: colors.secondary,
      border: `1px solid ${colors.border}`,
      color: colors.foreground,
    },
    socialButtonsBlockButtonText: {
      color: colors.foreground,
      fontWeight: '600',
    },
    socialButtonsBlockButtonArrow: { color: colors.mutedForeground },
    socialButtonsProviderIcon: { filter: 'brightness(1)' },
    userButtonPopoverCard: {
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
    },
    userButtonPopoverActionButton: {
      color: colors.foreground,
      '&:hover': { backgroundColor: colors.border, color: colors.primary },
    },
    userButtonPopoverActionButtonText: {
      color: colors.foreground,
      '&:hover': { color: colors.primary },
    },
    userButtonPopoverActionButtonIcon: {
      color: colors.foreground,
      '&:hover': { color: colors.primary },
    },
    userButtonPopoverCustomItemButton: {
      color: colors.foreground,
      '&:hover': { backgroundColor: colors.border, color: colors.primary },
    },
    userButtonPopoverCustomItemButtonText: {
      color: colors.foreground,
      '&:hover': { color: colors.primary },
    },
    userButtonPopoverCustomItemButtonIcon: {
      color: colors.foreground,
      '&:hover': { color: colors.primary },
    },
    userButtonPopoverFooter: { display: 'none' },
    badge: {
      backgroundColor: colors.border,
      color: colors.foreground,
    },
  },
};
