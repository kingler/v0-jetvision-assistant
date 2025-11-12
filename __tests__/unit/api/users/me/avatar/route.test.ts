import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/me/avatar/route';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock Supabase with default resolved value
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-user', avatar_url: '/avatars/test.jpg' },
              error: null,
            }),
          })),
        })),
      })),
    })),
  })),
}));

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

describe('POST /api/users/me/avatar', () => {
  const mockUser = {
    id: 'clerk-user-123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (currentUser as any).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should validate file presence', async () => {
    (currentUser as any).mockResolvedValue(mockUser);

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
    (currentUser as any).mockResolvedValue(mockUser);

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
    (currentUser as any).mockResolvedValue(mockUser);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  clerk_id: 'clerk-user-123',
                  avatar_url: `/avatars/clerk-user-123-${Date.now()}.jpg`,
                },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: `/avatars/test.jpg` },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: `/avatars/test.png` },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: `/avatars/test.gif` },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: `/avatars/test.webp` },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

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
    (currentUser as any).mockResolvedValue(mockUser);

    const avatarUrls: string[] = [];

    for (let i = 0; i < 3; i++) {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    avatar_url: `/avatars/clerk-user-123-${Date.now()}-${i}.jpg`,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      (createClient as any).mockReturnValue(mockSupabase);

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

    // All URLs should be unique
    const uniqueUrls = new Set(avatarUrls);
    expect(uniqueUrls.size).toBe(3);
  });
});