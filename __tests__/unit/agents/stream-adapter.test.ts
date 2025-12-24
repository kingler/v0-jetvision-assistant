/**
 * Unit Tests for SSE Stream Adapter
 *
 * Tests conversion of AgentResult to SSE streaming format
 */

import { describe, it, expect } from 'vitest'
import {
  convertAgentResultToStreamResponse,
  createAgentSSEStream,
  SSE_HEADERS,
} from '@/lib/agents/stream-adapter'
import type { AgentResult } from '@agents/core/types'

describe('SSE Stream Adapter', () => {
  describe('convertAgentResultToStreamResponse', () => {
    it('should convert basic agent result to stream response', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Hello, how can I help you?',
        },
        metadata: { executionTime: 100 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.content).toBe('Hello, how can I help you?')
      expect(response.done).toBe(true)
      expect(response.mock_mode).toBe(false)
    })

    it('should set mock_mode when specified', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Test response',
        },
        metadata: { executionTime: 50 },
      }

      const response = convertAgentResultToStreamResponse(result, true)

      expect(response.mock_mode).toBe(true)
    })

    it('should include agent metadata when present', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Response with metadata',
          intent: 'RFP_CREATION',
          conversationState: {
            phase: 'gathering_info',
            extractedData: {},
            pendingQuestions: ['What is the departure date?'],
          },
          agentChain: ['orchestrator'],
          processingTime: 150,
        },
        metadata: { executionTime: 150 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.agent).toBeDefined()
      expect(response.agent?.intent).toBe('RFP_CREATION')
      expect(response.agent?.conversationState.phase).toBe('gathering_info')
      expect(response.agent?.conversationState.pendingQuestions).toContain(
        'What is the departure date?'
      )
    })

    it('should extract trip data from create_trip tool call', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Trip created successfully',
          toolCalls: [
            {
              name: 'create_trip',
              result: {
                tripId: 'TRIP123',
                deepLink: 'https://avinode.com/trip/TRIP123',
                departureAirport: 'KTEB',
                arrivalAirport: 'KPBI',
                departureDate: '2025-01-15',
                passengers: 4,
                status: 'created',
              },
            },
          ],
        },
        metadata: { executionTime: 200 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.trip_data).toBeDefined()
      expect(response.trip_data?.tripId).toBe('TRIP123')
      expect(response.trip_data?.deepLink).toBe('https://avinode.com/trip/TRIP123')
      expect(response.trip_data?.departureAirport).toBe('KTEB')
      expect(response.trip_data?.passengers).toBe(4)
    })

    it('should extract RFQ data from get_rfq tool call', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'RFQ retrieved',
          toolCalls: [
            {
              name: 'get_rfq',
              result: {
                rfqId: 'RFQ123',
                tripId: 'TRIP456',
                status: 'pending',
                quotes: [
                  {
                    quoteId: 'Q1',
                    operatorName: 'Jet Airways',
                    aircraftType: 'Citation X',
                    price: 25000,
                    currency: 'USD',
                  },
                ],
              },
            },
          ],
        },
        metadata: { executionTime: 100 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.rfq_data).toBeDefined()
      expect(response.rfq_data?.rfqId).toBe('RFQ123')
      expect(response.rfq_data?.tripId).toBe('TRIP456')
      expect(response.rfq_data?.quotes).toHaveLength(1)
    })

    it('should extract RFP data from metadata', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'RFP data extracted',
          extractedData: {
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            passengers: 6,
          },
        },
        metadata: { executionTime: 75 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.rfp_data).toBeDefined()
      expect(response.rfp_data?.departureAirport).toBe('KJFK')
      expect(response.rfp_data?.arrivalAirport).toBe('KLAX')
      expect(response.rfp_data?.passengers).toBe(6)
    })

    it('should include error information when present', () => {
      const result: AgentResult = {
        success: false,
        data: {
          response: '',
        },
        error: new Error('Agent execution failed'),
        metadata: { executionTime: 10 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe('AGENT_ERROR')
      expect(response.error?.message).toBe('Agent execution failed')
      expect(response.error?.recoverable).toBe(true)
    })

    it('should include tool calls in response', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Tools executed',
          toolCalls: [
            {
              name: 'search_airports',
              result: { icao: 'KTEB', name: 'Teterboro' },
            },
            {
              name: 'create_trip',
              result: { tripId: 'T1' },
            },
          ],
        },
        metadata: { executionTime: 300 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.tool_calls).toHaveLength(2)
      expect(response.tool_calls?.[0].name).toBe('search_airports')
      expect(response.tool_calls?.[1].name).toBe('create_trip')
    })

    it('should mark tool call as error when error exists', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Partial success',
          toolCalls: [
            {
              name: 'failing_tool',
              result: null,
              error: 'Tool execution failed',
            },
          ],
        },
        metadata: { executionTime: 50 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.tool_calls?.[0].status).toBe('error')
      expect(response.tool_calls?.[0].error).toBe('Tool execution failed')
    })

    it('should handle response from data when main response is empty', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Response from data',
        },
        metadata: { executionTime: 25 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.content).toBe('Response from data')
    })

    it('should default conversation state when not provided', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Simple response',
        },
        metadata: { executionTime: 30 },
      }

      const response = convertAgentResultToStreamResponse(result)

      expect(response.agent?.conversationState.phase).toBe('gathering_info')
      expect(response.agent?.conversationState.extractedData).toEqual({})
      expect(response.agent?.conversationState.pendingQuestions).toEqual([])
    })
  })

  describe('createAgentSSEStream', () => {
    it('should create a readable stream', () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Stream response',
        },
        metadata: { executionTime: 100 },
      }

      const stream = createAgentSSEStream(result)

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should produce valid SSE format', async () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Hello world',
        },
        metadata: { executionTime: 50 },
      }

      const stream = createAgentSSEStream(result)
      const reader = stream.getReader()
      const { value } = await reader.read()

      const text = new TextDecoder().decode(value)

      expect(text).toMatch(/^data: /)
      expect(text).toMatch(/\n\n$/)
    })

    it('should include response data in SSE', async () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Test content',
        },
        metadata: { executionTime: 75 },
      }

      const stream = createAgentSSEStream(result)
      const reader = stream.getReader()
      const { value } = await reader.read()

      const text = new TextDecoder().decode(value)
      const jsonStr = text.replace('data: ', '').replace(/\n\n$/, '')
      const data = JSON.parse(jsonStr)

      expect(data.content).toBe('Test content')
      expect(data.done).toBe(true)
    })

    it('should set mock_mode in SSE stream', async () => {
      const result: AgentResult = {
        success: true,
        data: {
          response: 'Mock response',
        },
        metadata: { executionTime: 25 },
      }

      const stream = createAgentSSEStream(result, true)
      const reader = stream.getReader()
      const { value } = await reader.read()

      const text = new TextDecoder().decode(value)
      const jsonStr = text.replace('data: ', '').replace(/\n\n$/, '')
      const data = JSON.parse(jsonStr)

      expect(data.mock_mode).toBe(true)
    })
  })

  describe('SSE_HEADERS', () => {
    it('should have correct Content-Type', () => {
      expect(SSE_HEADERS['Content-Type']).toBe('text/event-stream')
    })

    it('should have Cache-Control set to no-cache', () => {
      expect(SSE_HEADERS['Cache-Control']).toBe('no-cache, no-transform')
    })

    it('should have Connection keep-alive', () => {
      expect(SSE_HEADERS.Connection).toBe('keep-alive')
    })

    it('should disable nginx buffering', () => {
      expect(SSE_HEADERS['X-Accel-Buffering']).toBe('no')
    })
  })
})
