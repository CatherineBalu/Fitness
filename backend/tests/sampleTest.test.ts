import { describe, it, expect } from 'bun:test';
import { app } from '../src';

describe('Backend API Tests', () => {
  it('should return a 200 OK status on the root route', async () => {
    // We send a fake request to your app
    const response = await app.handle(new Request('http://localhost/'));

    // We expect the server to respond with a success code (200)
    expect(response.status).toBe(200);
  });
});
