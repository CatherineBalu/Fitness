export const clerkAppearance = {
  variables: {
    colorBackground: '#161616',
    colorPrimary: '#aacc00',
    colorText: '#e5e5e5',
    colorTextSecondary: '#888888',
    colorInputBackground: '#1e1e1e',
    colorInputText: '#e5e5e5',
    colorDanger: '#ef4444',
    borderRadius: '12px',
    fontFamily: "'Inter Variable', system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: '#161616',
      border: '1px solid #2a2a2a',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
    },
    headerTitle: { color: '#ffffff' },
    headerSubtitle: { color: '#888888' },
    dividerLine: { backgroundColor: '#2a2a2a' },
    dividerText: { color: '#888888' },
    formButtonPrimary: {
      backgroundColor: '#aacc00',
      color: '#0d0d0d',
      fontWeight: '700',
    },
    formFieldInput: {
      backgroundColor: '#1e1e1e',
      borderColor: '#2a2a2a',
      color: '#e5e5e5',
    },
    formFieldLabel: { color: '#e5e5e5' },
    formFieldHintText: { color: '#888888' },
    formFieldSuccessText: { color: '#aacc00' },
    formFieldErrorText: { color: '#ef4444' },
    identityPreviewText: { color: '#e5e5e5' },
    identityPreviewEditButtonIcon: { color: '#888888' },
    alternativeMethodsBlockButton: {
      backgroundColor: '#1e1e1e',
      border: '1px solid #2a2a2a',
      color: '#e5e5e5',
    },
    alternativeMethodsBlockButtonText: { color: '#e5e5e5' },
    footerActionLink: { color: '#aacc00' },
    socialButtonsBlockButton: {
      backgroundColor: '#1e1e1e',
      border: '1px solid #2a2a2a',
      color: '#e5e5e5',
    },
    socialButtonsBlockButtonText: {
      color: '#e5e5e5',
      fontWeight: '600',
    },
    socialButtonsBlockButtonArrow: { color: '#888888' },
    socialButtonsProviderIcon: { filter: 'brightness(1)' },
    userButtonPopoverCard: {
      backgroundColor: '#161616',
      border: '1px solid #2a2a2a',
    },
    userButtonPopoverActionButton: {
      color: '#e5e5e5',
      '&:hover': { backgroundColor: '#2a2a2a', color: '#aacc00' },
    },
    userButtonPopoverActionButtonText: {
      color: '#e5e5e5',
      '&:hover': { color: '#aacc00' },
    },
    userButtonPopoverActionButtonIcon: {
      color: '#e5e5e5',
      '&:hover': { color: '#aacc00' },
    },
    userButtonPopoverCustomItemButton: {
      color: '#e5e5e5',
      '&:hover': { backgroundColor: '#2a2a2a', color: '#aacc00' },
    },
    userButtonPopoverCustomItemButtonText: {
      color: '#e5e5e5',
      '&:hover': { color: '#aacc00' },
    },
    userButtonPopoverCustomItemButtonIcon: {
      color: '#e5e5e5',
      '&:hover': { color: '#aacc00' },
    },
    userButtonPopoverFooter: { display: 'none' },
    badge: {
      backgroundColor: '#2a2a2a',
      color: '#e5e5e5',
    },
  },
};
