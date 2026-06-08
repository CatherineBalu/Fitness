export interface Membership {
  name: string;
  price: number;
  durationDays: number;
  validUntil: string;
  isActive: boolean;
}

export interface ProfileData {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  membership: Membership | null;
}

export interface RegistrationInstructor {
  name: string;
  phoneNumber: string | null;
  email: string | null;
  isLead: boolean;
}

export interface Registration {
  reservationId: string;
  scheduleId: string;
  lectureName: string;
  startTime: string;
  endTime: string;
  roomName: string;
  instructors: RegistrationInstructor[];
}

export interface Payment {
  id: string;
  subscriptionName: string;
  kind: 'entry' | 'subscription';
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

export interface SpendingData {
  total: number;
  payments: Payment[];
}
