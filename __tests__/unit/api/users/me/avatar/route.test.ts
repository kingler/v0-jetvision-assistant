import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentUser } from '@clerk/nextjs/server';

// Shared mock state that can be modified per-test
let mockDbResponse = {
  data: { id: 'test-user', avatar_url: '/avatars/test.jpg' },
  error: null as { message: string } | null,
};

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock Supabase with controllable response
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockDbResponse)),
          })),
        })),
      })),
    })),
  })),
}));

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// Import after mocks are set up
import { POST } from '@/app/api/users/me/avatar/route';

describe('POST /api/users/me/avatar', () => {
  const mockUser = {
    id: 'clerk-user-123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock database response to default success
    mockDbResponse = {
      data: { id: 'test-user', avatar_url: '/avatars/test.jpg' },
      error: null,
    };
  });

  it('should require authentication', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should validate file presence', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    // No file added

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file uploaded');
  });

  it('should validate file type', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
  });

  it('should validate file size', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    // Create a file larger than 5MB
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File size must be less than 5MB');
  });

  it('should accept valid image files', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.avatar_url).toContain('/avatars/clerk-user-123-');
    expect(data.avatar_url).toContain('.jpg');
  });

  it('should handle JPEG files', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.jpeg', { type: 'image/jpeg' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle PNG files', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle GIF files', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.gif', { type: 'image/gif' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle WebP files', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.webp', { type: 'image/webp' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle database update error', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    // Set mock to return database error
    mockDbResponse = {
      data: null as unknown as { id: string; avatar_url: string },
      error: { message: 'Database error' },
    };

    const formData = new FormData();
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    formData.append('avatar', file);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update avatar');
  });

  it('should generate unique avatar URLs', async () => {
    (currentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    // Mock Date.now() to return incrementing values for deterministic timestamps
    // Start with a base timestamp and increment by 1ms for each call
    let timestampCounter = 1000000000000; // Base timestamp (arbitrary starting point)
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      return timestampCounter++;
    });

    const avatarUrls: string[] = [];

    try {
      for (let i = 0; i < 3; i++) {
        const formData = new FormData();
        const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
        formData.append('avatar', file);

        const request = new Request('http://localhost:3000/api/users/me/avatar', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        const data = await response.json();
        avatarUrls.push(data.avatar_url);
      }

      // All URLs should be unique (contain different timestamps)
      const uniqueUrls = new Set(avatarUrls);
      expect(uniqueUrls.size).toBe(3);
    } finally {
      // Restore Date.now() to its original implementation
      dateNowSpy.mockRestore();
    }
  });
});