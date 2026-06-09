export interface Lecture {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  registered: number;
}

export interface StaffMember {
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

export interface ExerciseType {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}
