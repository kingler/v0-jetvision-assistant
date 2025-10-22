import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Create a mock instance that we can control
let mockCreate = vi.fn()

// Mock OpenAI before importing the route
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chatkit: {
        sessions: {
          create: mockCreate,
        },
      },
    })),
  }
})

// Import route AFTER mock is set up
const { POST, GET } = await import('@/app/api/chatkit/session/route')

describe('ChatKit Session API', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.OPENAI_API_KEY = 'sk-test-key'
    process.env.CHATKIT_WORKFLOW_ID = 'wf-test-workflow'
    mockCreate.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('POST /api/chatkit/session', () => {
    it('should create a session successfully with valid deviceId', async () => {
      const deviceId = 'test-device-123'
      const mockClientSecret = 'cs-test-secret-123'

      mockCreate.mockResolvedValue({
        client_secret: mockClientSecret,
      })

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ client_secret: mockClientSecret })
      expect(mockCreate).toHaveBeenCalledWith({
        workflow: { id: 'wf-test-workflow' },
        user: deviceId,
      })
    })

    it('should return 400 if deviceId is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid deviceId')
    })

    it('should return 400 if deviceId is empty string', async () => {
      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: '' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid deviceId')
    })

    it('should return 400 if deviceId is not a string', async () => {
      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 123 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid deviceId')
    })

    it('should return 500 if CHATKIT_WORKFLOW_ID is not configured', async () => {
      delete process.env.CHATKIT_WORKFLOW_ID

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device-123' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server configuration error')
    })

    it('should return 500 if OPENAI_API_KEY is not configured', async () => {
      delete process.env.OPENAI_API_KEY

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device-123' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server configuration error')
    })

    it('should return 401 if OpenAI API key is invalid', async () => {
      mockCreate.mockRejectedValue({
        status: 401,
        message: 'Invalid API key',
      })

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device-123' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('should return 404 if workflow does not exist', async () => {
      mockCreate.mockRejectedValue({
        status: 404,
        message: 'Workflow not found',
      })

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device-123' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workflow not found')
    })

    it('should return 500 for unknown errors', async () => {
      mockCreate.mockRejectedValue(new Error('Unknown error'))

      const req = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device-123' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create session')
    })
  })

  describe('GET /api/chatkit/session', () => {
    it('should return health check with configuration status', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'ok',
        configured: {
          openai_api_key: true,
          chatkit_workflow_id: true,
        },
      })
    })

    it('should show false for missing configuration', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.CHATKIT_WORKFLOW_ID

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'ok',
        configured: {
          openai_api_key: false,
          chatkit_workflow_id: false,
        },
      })
    })
  })
})
