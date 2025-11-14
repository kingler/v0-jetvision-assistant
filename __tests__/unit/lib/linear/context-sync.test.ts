/**
 * Tests for Linear Context Sync
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  parseContextDirectory,
  syncContextToLinear,
  generateSyncReport,
  type ContextTaskStatus,
  type SyncResult,
} from '@/lib/linear/context-sync';

// Mock fs module
vi.mock('fs/promises');

describe('parseContextDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract task identifiers from markdown files', async () => {
    // Mock file system
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'status.md', isFile: () => true, isDirectory: () => false } as any,
    ]);

    vi.mocked(fs.readFile).mockResolvedValue(`
# Project Status

## ONEK-93: Message Component System ✅
**Status**: Complete
**Completion**: 100%

## ONEK-92: Unified Chat Interface 🟡
**Status**: In Progress
**Completion**: 45%
    `);

    const tasks = await parseContextDirectory('./.context');

    expect(tasks.length).toBeGreaterThan(0);
    
    const onek93 = tasks.find(t => t.identifier === 'ONEK-93');
    expect(onek93).toBeDefined();
    expect(onek93?.status).toBe('complete');
    expect(onek93?.completionPercentage).toBe(100);

    const onek92 = tasks.find(t => t.identifier === 'ONEK-92');
    expect(onek92).toBeDefined();
    expect(onek92?.status).toBe('in_progress');
    expect(onek92?.completionPercentage).toBe(45);
  });

  it('should detect blocked status', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'issues.md', isFile: () => true, isDirectory: () => false } as any,
    ]);

    vi.mocked(fs.readFile).mockResolvedValue(`
## ONEK-95: Backend Integration ⛔
**Status**: Blocked - Waiting for MCP servers
    `);

    const tasks = await parseContextDirectory('./.context');

    const onek95 = tasks.find(t => t.identifier === 'ONEK-95');
    expect(onek95).toBeDefined();
    expect(onek95?.status).toBe('blocked');
  });

  it('should detect pending status', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'tasks.md', isFile: () => true, isDirectory: () => false } as any,
    ]);

    vi.mocked(fs.readFile).mockResolvedValue(`
## ONEK-100: UI Migration ❌
**Status**: Not started
    `);

    const tasks = await parseContextDirectory('./.context');

    const onek100 = tasks.find(t => t.identifier === 'ONEK-100');
    expect(onek100).toBeDefined();
    expect(onek100?.status).toBe('pending');
  });

  it('should handle DES- identifiers', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'design.md', isFile: () => true, isDirectory: () => false } as any,
    ]);

    vi.mocked(fs.readFile).mockResolvedValue(`
## DES-111: JetVision Branding ✅
**Status**: Complete
    `);

    const tasks = await parseContextDirectory('./.context');

    const des111 = tasks.find(t => t.identifier === 'DES-111');
    expect(des111).toBeDefined();
    expect(des111?.status).toBe('complete');
  });

  it('should deduplicate tasks', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'file1.md', isFile: () => true, isDirectory: () => false } as any,
      { name: 'file2.md', isFile: () => true, isDirectory: () => false } as any,
    ]);

    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('ONEK-93: Task ✅ Complete')
      .mockResolvedValueOnce('ONEK-93: Task 🟡 In Progress');

    const tasks = await parseContextDirectory('./.context');

    const onek93Tasks = tasks.filter(t => t.identifier === 'ONEK-93');
    expect(onek93Tasks.length).toBe(1);
    // Should keep the complete status
    expect(onek93Tasks[0].status).toBe('complete');
  });
});

describe('generateSyncReport', () => {
  it('should generate a formatted report', () => {
    const result: SyncResult = {
      success: true,
      synced: ['ONEK-93', 'ONEK-89'],
      skipped: ['ONEK-92'],
      failed: ['ONEK-95'],
      errors: [
        { identifier: 'ONEK-95', error: 'Permission denied' },
      ],
      timestamp: new Date('2025-11-14T10:00:00Z'),
    };

    const report = generateSyncReport(result);

    expect(report).toContain('# Linear Context Sync Report');
    expect(report).toContain('**Status**: ✅ Success');
    expect(report).toContain('- **Synced**: 2 issues');
    expect(report).toContain('- **Skipped**: 1 issues');
    expect(report).toContain('- **Failed**: 1 issues');
    expect(report).toContain('✅ ONEK-93');
    expect(report).toContain('✅ ONEK-89');
    expect(report).toContain('⏭️ ONEK-92');
    expect(report).toContain('❌ ONEK-95: Permission denied');
  });

  it('should show failure status when sync fails', () => {
    const result: SyncResult = {
      success: false,
      synced: [],
      skipped: [],
      failed: ['ONEK-93'],
      errors: [
        { identifier: 'ONEK-93', error: 'Network error' },
      ],
      timestamp: new Date(),
    };

    const report = generateSyncReport(result);

    expect(report).toContain('**Status**: ❌ Failed');
  });
});

