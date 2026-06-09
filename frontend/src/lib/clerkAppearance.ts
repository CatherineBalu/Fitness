import type { SignIn } from '@clerk/clerk-react';
import type { ComponentProps } from 'react';

type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function getClerkAppearance(): Appearance {
  const card = cssVar('--card');
  const foreground = cssVar('--foreground');
  const mutedForeground = cssVar('--muted-foreground');
  const secondary = cssVar('--secondary');
  const border = cssVar('--border');
  const primary = cssVar('--primary');
  const primaryForeground = cssVar('--primary-foreground');
  const destructive = cssVar('--destructive');

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
