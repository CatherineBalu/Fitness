import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import ConsentField from './ConsentField';
import SummaryBlock from './SummaryBlock';

import type { ContactForm } from '../checkoutPage.types';
import type { SubscriptionPlan } from '@/hooks/useSubscriptions';
import type { UseFormReturn } from 'react-hook-form';

interface ContactStepProps {
  contactForm: UseFormReturn<ContactForm>;
  plan: SubscriptionPlan;
  validUntil: Date | null;
  onSubmit: (values: ContactForm) => void;
  onCancel: () => void;
}

export default function ContactStep({
  contactForm,
  plan,
  validUntil,
  onSubmit,
  onCancel,
}: ContactStepProps) {
  return (
    <>
      <h2 className="text-foreground mb-1 text-[22px] font-bold">
        Your details
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Review your contact info and accept the required agreements.
      </p>
      <SummaryBlock plan={plan} validUntil={validUntil} />
      <Form {...contactForm}>
        <form onSubmit={contactForm.handleSubmit(onSubmit)}>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-1">
            <FormField
              control={contactForm.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First name{' '}
                    <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={contactForm.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Last name <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={contactForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>
                    Email <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <h3 className="text-foreground mt-2 mb-4 text-[18px] font-bold">
            Agreements & consent
          </h3>
          <div className="mb-6 flex flex-col gap-3.5">
            <ConsentField
              form={contactForm}
              name="agreeSms"
              label="I agree to receive SMS marketing."
            />
            <ConsentField
              form={contactForm}
              name="agreeEmailMarketing"
              label="I agree to receive email marketing."
            />
            <ConsentField
              form={contactForm}
              name="agreePrivacy"
              required
              label="I have read and accept the Privacy Policy."
            />
            <ConsentField
              form={contactForm}
              name="agreeVisitor"
              required
              label="I accept the gym's Visitor Regulations."
            />
            <ConsentField
              form={contactForm}
              name="agreeTerms"
              required
              label="I accept the General Terms & Conditions."
            />
          </div>

          <div className="mt-2 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-border text-foreground min-w-[110px]"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold"
            >
              Next
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
