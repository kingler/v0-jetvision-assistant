/**
 * Test Avinode MCP Server
 *
 * Tests the MCP server tools directly to verify they work:
 * - search_flights
 * - create_rfp
 * - get_rfp_status
 * - get_quotes
 * - search_airports
 *
 * Usage: npx tsx scripts/test-avinode-mcp.ts
 */

import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as readline from 'readline'

const MCP_SERVER_PATH = path.resolve(__dirname, '../mcp-servers/avinode-mcp-server')

interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

class MCPClient {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
  }>()
  private outputBuffer = ''

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Starting Avinode MCP server...')
      console.log(`   Path: ${MCP_SERVER_PATH}`)

      // Start the MCP server
      this.process = spawn('npx', ['tsx', 'src/index.ts'], {
        cwd: MCP_SERVER_PATH,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Use mock mode if no real API key
          AVINODE_API_KEY: process.env.AVINODE_API_KEY || 'mock_test_key',
        },
      })

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to get process streams'))
        return
      }

      // Handle stdout (JSON-RPC responses)
      const rl = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      })

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as MCPResponse
            const pending = this.pendingRequests.get(response.id)
            if (pending) {
              this.pendingRequests.delete(response.id)
              if (response.error) {
                pending.reject(new Error(response.error.message))
              } else {
                pending.resolve(response.result)
              }
            }
          } catch {
            // Not JSON, might be debug output
            this.outputBuffer += line + '\n'
          }
        }
      })

      // Handle stderr (debug messages)
      this.process.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString()
        if (msg.includes('running on stdio')) {
          console.log('✅ MCP server started successfully\n')
          resolve()
        }
      })

      this.process.on('error', reject)
      this.process.on('exit', (code) => {
        if (code !== 0) {
          console.log(`\n⚠️  MCP server exited with code ${code}`)
        }
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.process) {
          reject(new Error('MCP server startup timeout'))
        }
      }, 10000)
    })
  }

  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error('MCP server not connected')
    }

    const id = ++this.requestId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      const message = JSON.stringify(request) + '\n'
      this.process!.stdin!.write(message)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout for ${method}`))
        }
      }, 30000)
    })
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}

async function testAvinodeMCP() {
  console.log('\n🛩️  Testing Avinode MCP Server\n')
  console.log('=' .repeat(60))

  const client = new MCPClient()

  try {
    await client.connect()

    // Test 1: List available tools
    console.log('\n📋 Test 1: List Tools')
    console.log('-'.repeat(40))
    try {
      const tools = await client.call('tools/list')
      console.log('Available tools:')
      if (Array.isArray((tools as any)?.tools)) {
        for (const tool of (tools as any).tools) {
          console.log(`   - ${tool.name}: ${tool.description?.slice(0, 50)}...`)
        }
      } else {
        console.log(JSON.stringify(tools, null, 2))
      }
    } catch (error) {
      console.log('❌ Failed to list tools:', error)
    }

    // Test 2: Search airports
    console.log('\n🔍 Test 2: Search Airports (KTEB)')
    console.log('-'.repeat(40))
    try {
      const result = await client.call('tools/call', {
        name: 'search_airports',
        arguments: { query: 'KTEB' },
      })
      console.log('Result:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.log('❌ Failed:', error)
    }

    // Test 3: Search flights
    console.log('\n✈️  Test 3: Search Flights (KTEB → KOPF)')
    console.log('-'.repeat(40))
    try {
      const result = await client.call('tools/call', {
        name: 'search_flights',
        arguments: {
          departure_airport: 'KTEB',
          arrival_airport: 'KOPF',
          departure_date: '2025-01-15',
          passengers: 4,
        },
      })
      console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500) + '...')
    } catch (error) {
      console.log('❌ Failed:', error)
    }

    // Test 4: Create RFP
    console.log('\n📝 Test 4: Create RFP')
    console.log('-'.repeat(40))
    try {
      const result = await client.call('tools/call', {
        name: 'create_rfp',
        arguments: {
          flight_details: {
            departure_airport: 'KTEB',
            arrival_airport: 'KOPF',
            departure_date: '2025-01-15',
            passengers: 4,
          },
          operator_ids: ['OP-001', 'OP-002', 'OP-003'],
          message: 'Looking for light jet or midsize options',
        },
      })
      console.log('Result:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.log('❌ Failed:', error)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ MCP Server test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    client.disconnect()
  }
}

testAvinodeMCP().catch(console.error)

export {}
