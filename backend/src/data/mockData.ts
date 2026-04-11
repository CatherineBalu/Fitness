export interface Lecture {
  id: number;
  name: string;
  time: string;
  room: string;
  capacity: number;
  registered: number;
}

export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  since: string;
  lectureIds: number[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
}

export const lectures: Lecture[] = [
  {
    id: 1,
    name: 'Morning Pilates',
    time: '08:00 - 09:00',
    room: 'Room A',
    capacity: 15,
    registered: 7,
  },
  {
    id: 2,
    name: 'Evening Pilates',
    time: '18:00 - 19:00',
    room: 'Room A',
    capacity: 15,
    registered: 14,
  },
  {
    id: 3,
    name: 'Core Strength',
    time: '10:00 - 11:00',
    room: 'Room B',
    capacity: 12,
    registered: 12,
  },
  {
    id: 4,
    name: 'Vinyasa Yoga',
    time: '09:00 - 10:00',
    room: 'Room C',
    capacity: 20,
    registered: 10,
  },
  { id: 5, name: 'Yin Yoga', time: '17:00 - 18:00', room: 'Room C', capacity: 20, registered: 18 },
  {
    id: 6,
    name: 'HIIT Cardio',
    time: '07:00 - 08:00',
    room: 'Room D',
    capacity: 25,
    registered: 25,
  },
  {
    id: 7,
    name: 'Cardio Blast',
    time: '16:00 - 17:00',
    room: 'Room D',
    capacity: 25,
    registered: 20,
  },
  { id: 8, name: 'Spin Class', time: '06:30 - 07:30', room: 'Room B', capacity: 18, registered: 9 },
  {
    id: 9,
    name: 'CrossFit Basics',
    time: '12:00 - 13:00',
    room: 'Room D',
    capacity: 15,
    registered: 6,
  },
  {
    id: 10,
    name: 'Power Lifting',
    time: '15:00 - 16:00',
    room: 'Room B',
    capacity: 10,
    registered: 4,
  },
  {
    id: 11,
    name: 'CrossFit Advanced',
    time: '19:00 - 20:00',
    room: 'Room D',
    capacity: 12,
    registered: 11,
  },
];

export const staff: StaffMember[] = [
  {
    id: 1,
    firstName: 'Štefan',
    lastName: 'Murín',
    role: 'Pilates',
    since: '04/2024',
    lectureIds: [1, 2, 3],
  },
  {
    id: 2,
    firstName: 'Jana',
    lastName: 'Procházková',
    role: 'Yoga',
    since: '01/2023',
    lectureIds: [4, 5],
  },
  {
    id: 3,
    firstName: 'Martin',
    lastName: 'Horák',
    role: 'HIIT',
    since: '06/2023',
    lectureIds: [6, 7],
  },
  {
    id: 4,
    firstName: 'Katarína',
    lastName: 'Blahová',
    role: 'Spinning',
    since: '09/2024',
    lectureIds: [8],
  },
  {
    id: 5,
    firstName: 'Ján',
    lastName: 'Breja',
    role: 'CrossFit',
    since: '03/2022',
    lectureIds: [9, 10, 11],
  },
];

export const members: Member[] = [
  { id: 1, name: 'Jana Nováková', email: 'jana@example.com' },
  { id: 2, name: 'Peter Kováč', email: 'peter@example.com' },
  { id: 3, name: 'Mária Horáková', email: 'maria@example.com' },
  { id: 4, name: 'Tomáš Blaho', email: 'tomas@example.com' },
  { id: 5, name: 'Eva Slobodová', email: 'eva@example.com' },
];

// Maps lectureId -> memberIds (who is registered)
export const lectureMembers: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7],
  2: [1, 2, 3, 4, 5],
  3: [1, 2, 3, 4, 5],
  4: [1, 2, 3, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5],
  7: [1, 2, 3, 4, 5],
  8: [1, 2, 3, 4, 5],
  9: [1, 2, 3, 4, 5],
  10: [1, 2, 3, 4],
  11: [1, 2, 3, 4, 5],
};

let nextStaffId = staff.length + 1;

export function getNextStaffId() {
  return nextStaffId++;
}
