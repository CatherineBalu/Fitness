import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  splitPhone,
} from '@/lib/countryCodes';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({
  value,
  onChange,
  className,
}: PhoneInputProps) {
  const { prefix, local } = splitPhone(value || DEFAULT_COUNTRY_CODE);

  const update = (nextPrefix: string, nextLocal: string) => {
    onChange(`${nextPrefix}${nextLocal.replace(/\D/g, '')}`);
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={prefix} onValueChange={(p) => update(p, local)}>
        <SelectTrigger className="bg-background w-[108px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="tel"
        placeholder="Phone number"
        className="bg-background"
        value={local}
        onChange={(e) => update(prefix, e.target.value)}
      />
    </div>
  );
}
