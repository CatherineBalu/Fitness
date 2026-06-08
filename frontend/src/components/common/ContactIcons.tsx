import { Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

interface ContactIconsProps {
  phone: string | null | undefined;
  email: string | null | undefined;
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

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`, { description: value });
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const activeBtn = cn(
    'bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground flex cursor-pointer items-center justify-center rounded-full border-none transition-colors',
    buttonSize,
  );
  const disabledBtn = cn(
    'bg-secondary text-muted-foreground/50 flex items-center justify-center rounded-full opacity-50',
    buttonSize,
  );

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {phone ? (
        <button
          type="button"
          onClick={() => void copy(phone, 'Phone number')}
          title={`Copy phone number ${phone}`}
          aria-label={`Copy phone number ${phone}`}
          className={activeBtn}
        >
          <Phone className={iconSize} aria-hidden />
        </button>
      ) : (
        <span
          title="Phone number not available"
          aria-label="Phone number not available"
          className={disabledBtn}
        >
          <Phone className={iconSize} aria-hidden />
        </span>
      )}
      {email ? (
        <button
          type="button"
          onClick={() => void copy(email, 'Email')}
          title={`Copy email ${email}`}
          aria-label={`Copy email ${email}`}
          className={activeBtn}
        >
          <Mail className={iconSize} aria-hidden />
        </button>
      ) : (
        <span
          title="Email not available"
          aria-label="Email not available"
          className={disabledBtn}
        >
          <Mail className={iconSize} aria-hidden />
        </span>
      )}
    </div>
  );
}
