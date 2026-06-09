import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import { DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';

interface ExerciseType {
  id: string;
  name: string;
}

interface EmployeeType {
  id: string;
  roleName: string;
}

const staffListKey = ['staff', 'list'] as const;
const employeeTypesKey = ['employee-types'] as const;

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Invalid email address'),
    phoneNumber: z.string().regex(/^\+\d{6,15}$/, 'Enter a valid phone number'),
    role: z.string().min(1, 'Please select a role'),
    specializations: z.array(z.string()),
  })
  .superRefine((d, ctx) => {
    if (d.role === 'Instructor' && d.specializations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specializations'],
        message: 'Select at least one specialization',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  exerciseTypes: ExerciseType[];
}

export default function AddMemberDialog({
  open,
  onClose,
  onAdded,
  exerciseTypes,
}: Props) {
  const qc = useQueryClient();
  const { data: employeeTypes = [] } = useQuery({
    queryKey: employeeTypesKey,
    queryFn: () => apiClient<EmployeeType[]>('/api/employee-types'),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: DEFAULT_COUNTRY_CODE,
      role: '',
      specializations: [],
    },
  });

  const role = useWatch({ control: form.control, name: 'role' });
  const isInstructor = role === 'Instructor';

  const createStaff = useMutation({
    mutationFn: (payload: FormValues) =>
      apiClient<{ success: boolean }>('/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          specializations:
            payload.role === 'Instructor' ? payload.specializations : [],
        }),
      }),
    onSuccess: () => {
      toast.success('Staff member created. Login details sent to their email.');
      void qc.invalidateQueries({ queryKey: staffListKey });
      onAdded();
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  function toggleSpecialization(id: string) {
    const current = form.getValues('specializations');
    form.setValue(
      'specializations',
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[400px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[1.2rem] font-bold">
            Add staff member
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => createStaff.mutate(values))}
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
                    <Input
                      placeholder="Enter first name"
                      className="bg-background"
                      {...field}
                    />
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
                    <Input
                      placeholder="Enter last name"
                      className="bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email"
                      className="bg-background"
                      {...field}
                    />
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs-plus font-semibold">
                    Role
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== 'Instructor') {
                        form.setValue('specializations', []);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeeTypes.map((t) => (
                        <SelectItem key={t.id} value={t.roleName}>
                          {t.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              disabled={createStaff.isPending}
            >
              {createStaff.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
