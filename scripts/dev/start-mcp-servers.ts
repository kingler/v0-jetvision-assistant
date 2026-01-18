#!/usr/bin/env tsx
/**
 * MCP Servers Development Startup Script
 * Starts all MCP servers for local development
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface ServerConfig {
  name: string;
  path: string;
  entryPoint: string;
}

const ROOT_DIR = path.resolve(__dirname, '../..');

const MCP_SERVERS: ServerConfig[] = [
  {
    name: 'avinode',
    path: 'mcp-servers/avinode-mcp-server',
    entryPoint: 'src/index.ts',
  },
  {
    name: 'gmail',
    path: 'mcp-servers/gmail-mcp-server',
    entryPoint: 'src/index.ts',
  },
  {
    name: 'google-sheets',
    path: 'mcp-servers/google-sheets-mcp-server',
    entryPoint: 'src/index.ts',
  },
  {
    name: 'supabase',
    path: 'mcp-servers/supabase-mcp-server',
    entryPoint: 'src/index.ts',
  },
];

const processes: Map<string, ChildProcess> = new Map();

function log(server: string, message: string, isError = false): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [mcp:${server}]`;
  if (isError) {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

async function startServer(config: ServerConfig): Promise<void> {
  const entryFile = path.join(config.path, config.entryPoint);

  log(config.name, `Starting server...`);

  const child = spawn('npx', ['tsx', entryFile], {
    cwd: ROOT_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  processes.set(config.name, child);

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        log(config.name, line);
      }
    });
  });

  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        log(config.name, line, true);
      }
    });
  });

  child.on('error', (error) => {
    log(config.name, `Error: ${error.message}`, true);
  });

  child.on('exit', (code, signal) => {
    if (code !== null) {
      log(config.name, `Exited with code ${code}`);
    } else if (signal) {
      log(config.name, `Killed with signal ${signal}`);
    }
    processes.delete(config.name);
  });

  // Wait a bit to see if server starts successfully
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (child.exitCode === null) {
    log(config.name, `Server started (PID: ${child.pid})`);
  }
}

async function shutdownAll(): Promise<void> {
  console.log('\n[mcp] Shutting down all MCP servers...');

  const shutdownPromises = Array.from(processes.entries()).map(
    ([name, proc]) => {
      return new Promise<void>((resolve) => {
        if (proc.exitCode !== null) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          log(name, 'Force killing...', true);
          proc.kill('SIGKILL');
          resolve();
        }, 5000);

        proc.once('exit', () => {
          clearTimeout(timeout);
          log(name, 'Stopped');
          resolve();
        });

        proc.kill('SIGTERM');
      });
    }
  );

  await Promise.all(shutdownPromises);
  console.log('[mcp] All servers stopped');
}

async function main(): Promise<void> {
  console.log('[mcp] Starting MCP servers for development...\n');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await shutdownAll();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownAll();
    process.exit(0);
  });

  // Start all servers
  for (const config of MCP_SERVERS) {
    try {
      await startServer(config);
    } catch (error) {
      log(
        config.name,
        `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  console.log('\n[mcp] All MCP servers started. Press Ctrl+C to stop.\n');

  // Keep process running
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[mcp] Fatal error:', error);
  process.exit(1);
});
