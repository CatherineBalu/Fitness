import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import PhoneInput from '@/components/common/PhoneInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/apiClient';
import { DEFAULT_COUNTRY_CODE, normalizePhone } from '@/lib/countryCodes';

interface ExerciseType {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  clerkId: string;
  role: string;
  since: string;
  specializations: string[];
}

const staffListKey = ['staff', 'list'] as const;

const baseSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phoneNumber: z.string().regex(/^\+\d{6,15}$/, 'Enter a valid phone number'),
  specializations: z.array(z.string()),
});

function buildSchema(isInstructor: boolean) {
  return baseSchema.superRefine((d, ctx) => {
    if (isInstructor && d.specializations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specializations'],
        message: 'Select at least one specialization',
      });
    }
  });
}

type FormValues = z.infer<typeof baseSchema>;

interface Props {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  exerciseTypes: ExerciseType[];
}

export default function EditStaffDialog({
  staff,
  open,
  onClose,
  onSaved,
  exerciseTypes,
}: Props) {
  const qc = useQueryClient();
  const isInstructor = staff?.role === 'Instructor';
  const schema = useMemo(() => buildSchema(isInstructor), [isInstructor]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: DEFAULT_COUNTRY_CODE,
      specializations: [],
    },
  });

  useEffect(() => {
    if (!open || !staff) return;
    const ids = exerciseTypes
      .filter((et) => staff.specializations.includes(et.name))
      .map((et) => et.id);
    form.reset({
      firstName: staff.firstName,
      lastName: staff.lastName,
      phoneNumber: normalizePhone(staff.phoneNumber),
      specializations: ids,
    });
  }, [open, staff, exerciseTypes, form]);

  const updateStaff = useMutation({
    mutationFn: (payload: FormValues) =>
      apiClient<void>(`/api/staff/${staff!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          phoneNumber: payload.phoneNumber,
          specializations: isInstructor ? payload.specializations : undefined,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffListKey });
      onSaved();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function toggleSpecialization(id: string) {
    const current = form.getValues('specializations');
    form.setValue(
      'specializations',
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[400px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[1.2rem] font-bold">
            Edit staff member
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => updateStaff.mutate(values))}
            className="mt-2 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                    First name
                  </FormLabel>
                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                    Last name
                  </FormLabel>
                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                    Phone number
                  </FormLabel>
                  <PhoneInput value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            {isInstructor && (
              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                      Specializations
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {exerciseTypes.map((et) => {
                        const active = field.value.includes(et.id);
                        return (
                          <Button
                            type="button"
                            key={et.id}
                            size="sm"
                            variant={active ? 'default' : 'outline'}
                            className={
                              active
                                ? ''
                                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                            }
                            onClick={() => toggleSpecialization(et.id)}
                          >
                            {et.name}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 font-bold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={updateStaff.isPending}
            >
              {updateStaff.isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
