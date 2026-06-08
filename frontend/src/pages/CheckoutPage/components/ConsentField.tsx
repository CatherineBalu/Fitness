import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

import type { ContactForm } from '../checkoutPage.types';
import type { UseFormReturn } from 'react-hook-form';

interface ConsentFieldProps {
  form: UseFormReturn<ContactForm>;
  name: keyof ContactForm;
  label: string;
  required?: boolean;
}

export default function ConsentField({
  form,
  name,
  label,
  required,
}: ConsentFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="text-foreground flex items-start gap-2.5 text-sm leading-[1.4]">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={(c) => field.onChange(!!c)}
              />
            </FormControl>
            <span>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
