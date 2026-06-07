import { Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

interface ContactIconsProps {
  phone: string | null | undefined;
  // TODO(NUE-46): wire `email` once team aligns on in-app email contact form.
  email?: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

export default function ContactIcons({
  phone,
  email,
  className,
  size = 'md',
}: ContactIconsProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  const handleCopyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.success('Phone number copied', { description: phone });
    } catch {
      toast.error('Could not copy phone number');
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {phone ? (
        <button
          type="button"
          onClick={() => void handleCopyPhone()}
          title={`Copy phone number ${phone}`}
          aria-label={`Copy phone number ${phone}`}
          className={cn(
            'bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground flex cursor-pointer items-center justify-center rounded-full border-none transition-colors',
            buttonSize,
          )}
        >
          <Phone className={iconSize} aria-hidden />
        </button>
      ) : (
        <span
          title="Phone number not available"
          aria-label="Phone number not available"
          className={cn(
            'bg-secondary text-muted-foreground/50 flex items-center justify-center rounded-full opacity-50',
            buttonSize,
          )}
        >
          <Phone className={iconSize} aria-hidden />
        </span>
      )}
      <span
        title={email ? `Email ${email}` : 'Email contact coming soon'}
        aria-label="Email contact coming soon"
        aria-disabled
        className={cn(
          'bg-secondary text-muted-foreground/50 flex items-center justify-center rounded-full opacity-50',
          buttonSize,
        )}
      >
        <Mail className={iconSize} aria-hidden />
      </span>
    </div>
  );
}
