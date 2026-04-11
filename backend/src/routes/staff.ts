import { Elysia } from 'elysia';
import { z } from 'zod';
import { staff, lectures, members, lectureMembers, getNextStaffId } from '../data/mockData';

const createStaffSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  .get('/', () => {
    return staff.map(({ id, firstName, lastName, role, since }) => ({
      id,
      firstName,
      lastName,
      role,
      since,
    }));
  })

  .post('/', async ({ body, set }) => {
    const result = createStaffSchema.safeParse(body);
    if (!result.success) {
      set.status = 400;
      return { error: result.error.issues[0].message };
    }

    const { fullName, role, email, password } = result.data;

    const emailExists = staff.some((s) => (s as unknown as { email?: string }).email === email);
    if (emailExists) {
      set.status = 409;
      return { error: 'A staff member with this email already exists' };
    }

    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || '';
    const hashedPassword = await Bun.password.hash(password);

    const newMember = {
      id: getNextStaffId(),
      firstName,
      lastName,
      role,
      email,
      password: hashedPassword,
      since: new Date().toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }),
      lectureIds: [] as number[],
    };

    staff.push(newMember);
    set.status = 201;

    return {
      id: newMember.id,
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      role: newMember.role,
      email: newMember.email,
      since: newMember.since,
    };
  })

  .delete('/:id', ({ params, set }) => {
    const id = Number(params.id);
    const index = staff.findIndex((s) => s.id === id);

    if (index === -1) {
      set.status = 404;
      return { error: 'Staff member not found' };
    }

    staff.splice(index, 1);
    set.status = 204;
  })

  .get('/:id/lectures', ({ params, set }) => {
    const id = Number(params.id);
    const member = staff.find((s) => s.id === id);

    if (!member) {
      set.status = 404;
      return { error: 'Staff member not found' };
    }

    const memberLectures = member.lectureIds
      .map((lectureId) => lectures.find((l) => l.id === lectureId))
      .filter(Boolean);

    return memberLectures;
  });

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' }).get(
  '/:id/members',
  ({ params, set }) => {
    const id = Number(params.id);
    const lecture = lectures.find((l) => l.id === id);

    if (!lecture) {
      set.status = 404;
      return { error: 'Lecture not found' };
    }

    const registeredIds = lectureMembers[id] ?? [];
    const registeredMembers = registeredIds
      .map((memberId) => members.find((m) => m.id === memberId))
      .filter(Boolean);

    return registeredMembers;
  },
);
