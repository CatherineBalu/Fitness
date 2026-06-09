import { z } from 'zod';

export const contactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  agreeSms: z.boolean(),
  agreeEmailMarketing: z.boolean(),
  agreePrivacy: z.boolean().refine((v) => v === true, {
    message: 'You must accept the privacy policy',
  }),
  agreeVisitor: z.boolean().refine((v) => v === true, {
    message: 'You must accept the visitor regulations',
  }),
  agreeTerms: z
    .boolean()
    .refine((v) => v === true, { message: 'You must accept the terms' }),
});

export type ContactForm = z.infer<typeof contactSchema>;
export type PaymentMethod = 'card' | 'bank';
