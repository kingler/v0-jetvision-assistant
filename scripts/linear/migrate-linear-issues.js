#!/usr/bin/env node
/**
 * Linear Issue Migration Script
 * Migrates issues from Jetvision Assistant v1 to Jetvision MAS project
 */

const ISSUES_TO_MIGRATE = [
  { id: "DES-130", title: "Settings View Redesign & Enhancement", priority: 3, status: "Backlog" },
  { id: "DES-128", title: "SubAgent:Coder — Fix 77 TypeScript Compilation Errors (Production Blocker)", priority: 1, status: "Done" },
  { id: "DES-127", title: "SubAgent:Tester — Comprehensive QA Testing & Runtime Verification", priority: 1, status: "Done" },
  { id: "DES-119", title: "SubAgent:Coder — ErrorMonitorAgent Implementation (Complete 6-Agent System)", priority: 1, status: "Done" },
  { id: "DES-117", title: "SubAgent:Coder — Email Template Editor & Preview (TASK-030)", priority: 2, status: "Backlog" },
  { id: "DES-116", title: "SubAgent:Tester — Accessibility (a11y) Implementation & Testing (TASK-029)", priority: 1, status: "Backlog" },
  { id: "DES-115", title: "SubAgent:Designer — Mobile Responsive Design (TASK-028)", priority: 2, status: "Backlog" },
  { id: "DES-114", title: "SubAgent:Coder — Authentication UI Components (TASK-027)", priority: 1, status: "Backlog" },
  { id: "DES-113", title: "SubAgent:Coder — Quote Comparison & Selection Interface (TASK-026)", priority: 1, status: "Backlog" },
  { id: "DES-112", title: "SubAgent:Coder — RFP Submission Form & Wizard (TASK-025)", priority: 1, status: "Done" },
  { id: "DES-111", title: "SubAgent:Designer — UI Component Library Setup (TASK-024)", priority: 1, status: "In Progress" },
  { id: "DES-110", title: "SubAgent:Coder — ChatKit Frontend Integration (TASK-023)", priority: 2, status: "In Progress" },
  { id: "DES-109", title: "SubAgent:Reviewer — Final QA & Production Deployment (TASK-037)", priority: 1, status: "Backlog" },
  { id: "DES-108", title: "SubAgent:Planner — API Documentation & User Guide (TASK-036)", priority: 2, status: "Backlog" },
  { id: "DES-107", title: "SubAgent:Ops — Production Environment Setup (TASK-035)", priority: 1, status: "Backlog" },
  { id: "DES-106", title: "SubAgent:Ops — Staging Environment Deployment (TASK-034)", priority: 2, status: "Backlog" },
  { id: "DES-105", title: "SubAgent:Ops — CI/CD Pipeline Configuration (TASK-033)", priority: 2, status: "Backlog" },
  { id: "DES-104", title: "SubAgent:Ops — Sentry Integration & Monitoring (TASK-032)", priority: 2, status: "Backlog" },
  { id: "DES-103", title: "SubAgent:Reviewer — Security Audit & Vulnerability Fixes (TASK-030)", priority: 1, status: "Backlog" },
  { id: "DES-102", title: "SubAgent:Tester — E2E Tests for Critical Workflows (TASK-028)", priority: 2, status: "Backlog" },
  { id: "DES-101", title: "SubAgent:Tester — Integration Tests for API Routes (TASK-027)", priority: 2, status: "Backlog" },
  { id: "DES-100", title: "SubAgent:Tester — Unit Tests for Agents (TASK-026)", priority: 2, status: "Backlog" },
  { id: "DES-99", title: "SubAgent:Coder — Supabase Realtime Integration (TASK-022)", priority: 2, status: "Backlog" },
  { id: "DES-98", title: "SubAgent:Coder — API Client & Data Fetching Layer (TASK-021)", priority: 2, status: "Backlog" },
  { id: "DES-97", title: "SubAgent:Coder — Dashboard Pages Implementation (TASK-020)", priority: 2, status: "Done" },
  { id: "DES-96", title: "SubAgent:Coder — PDF Generation Service (TASK-019)", priority: 2, status: "Backlog" },
  { id: "DES-95", title: "SubAgent:Coder — Complete API Routes Layer (TASK-018)", priority: 2, status: "In Progress" },
  { id: "DES-94", title: "SubAgent:Coder — Error Monitor Agent (TASK-017)", priority: 2, status: "Backlog" },
  { id: "DES-93", title: "SubAgent:Coder — Communication Manager Agent (TASK-016)", priority: 2, status: "Backlog" },
  { id: "DES-92", title: "SubAgent:Coder — Proposal Analysis Agent (TASK-015)", priority: 1, status: "Backlog" },
  { id: "DES-91", title: "SubAgent:Coder — Flight Search Agent (TASK-014)", priority: 1, status: "Backlog" },
  { id: "DES-90", title: "SubAgent:Coder — Client Data Manager Agent (TASK-013)", priority: 2, status: "Backlog" },
  { id: "DES-89", title: "SubAgent:Coder — Agent Tools & Helper Functions (TASK-012)", priority: 2, status: "Backlog" },
  { id: "DES-88", title: "SubAgent:Coder — RFP Orchestrator Agent Implementation (TASK-011)", priority: 1, status: "Backlog" },
  { id: "DES-87", title: "SubAgent:Coder — Google Sheets MCP Server Implementation (TASK-010)", priority: 2, status: "Backlog" },
  { id: "DES-86", title: "SubAgent:Coder — Gmail MCP Server Implementation (TASK-009)", priority: 2, status: "Backlog" },
  { id: "DES-85", title: "SubAgent:Coder — Avinode MCP Server Implementation (TASK-008)", priority: 1, status: "Done" },
  { id: "DES-84", title: "SubAgent:Coder — MCP Base Server Infrastructure (TASK-007)", priority: 1, status: "Done" },
  { id: "DES-83", title: "SubAgent:Coder — First API Route Implementation (TASK-006)", priority: 2, status: "Backlog" },
  { id: "DES-82", title: "SubAgent:Coder — Supabase Client Implementation (TASK-005)", priority: 2, status: "Backlog" },
  { id: "DES-81", title: "SubAgent:Ops — Redis Setup & BullMQ Configuration (TASK-004)", priority: 2, status: "Backlog" },
  { id: "DES-80", title: "SubAgent:Planner — Week 2-3 MCP & Agent Planning (Phase 2-3)", priority: 2, status: "Done" },
  { id: "DES-79", title: "SubAgent:Coder — Supabase Database Schema & RLS Policies (TASK-002)", priority: 0, status: "Done" },
  { id: "DES-78", title: "SubAgent:Coder — Clerk Authentication Integration (TASK-001)", priority: 1, status: "Done" },
  { id: "DES-77", title: "SubAgent:Ops — Environment Configuration & Infrastructure Setup (TASK-003)", priority: 1, status: "Done" },
  { id: "DES-76", title: "SubAgent:Tester — Setup Testing Infrastructure & Framework Configuration", priority: 2, status: "Done" },
  { id: "DES-75", title: "SubAgent:Reviewer — Establish Code Review Standards & PR Templates", priority: 2, status: "Done" },
  { id: "DES-74", title: "SubAgent:Planner — Week 1 Foundation Planning & Task Decomposition", priority: 1, status: "Done" },
  { id: "DES-73", title: "SubAgent:Coder — Fix TypeScript Compilation & Vitest Dependency Blockers (TASK-000)", priority: 1, status: "Done" }
];

const TARGET_TEAM_ID = "d79d93c9-3cb4-4859-bd94-6f001183b431"; // One Kaleidoscope
const TARGET_PROJECT_ID = "f9b76257-a731-4679-bf78-aa3172bfe7d2"; // Jetvision MAS

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║        Linear Issue Migration Script                         ║');
console.log('║        Jetvision Assistant v1 → Jetvision MAS                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log(`📋 Total issues to migrate: ${ISSUES_TO_MIGRATE.length}`);
console.log(`🎯 Target Team: One Kaleidoscope (${TARGET_TEAM_ID})`);
console.log(`📁 Target Project: Jetvision MAS (${TARGET_PROJECT_ID})`);
console.log('\n⚠️  Note: This script provides the issue list for manual migration via Linear MCP.');
console.log('         Use Claude Code with Linear MCP to create these issues.\n');

// Group issues by status
const byStatus = ISSUES_TO_MIGRATE.reduce((acc, issue) => {
  acc[issue.status] = (acc[issue.status] || 0) + 1;
  return acc;
}, {});

console.log('📊 Issues by Status:');
Object.entries(byStatus).forEach(([status, count]) => {
  console.log(`   ${status}: ${count}`);
});

// Group by priority
const byPriority = ISSUES_TO_MIGRATE.reduce((acc, issue) => {
  const priority = issue.priority === 0 ? 'None' : issue.priority === 1 ? 'Urgent' : issue.priority === 2 ? 'High' : 'Medium';
  acc[priority] = (acc[priority] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Issues by Priority:');
Object.entries(byPriority).forEach(([priority, count]) => {
  console.log(`   ${priority}: ${count}`);
});

console.log('\n✅ Script completed. Ready for migration via Linear MCP tools.\n');