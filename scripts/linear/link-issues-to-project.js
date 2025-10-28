#!/usr/bin/env node
/**
 * Linear Issue Project Linking Script
 * Links existing issues to the Prompt-Builder project
 */

import https from 'https';

// Configuration
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || process.env.LINEAR_API_TOKEN;
const JETVISION_MAS_PROJECT_ID = 'f9b76257-a731-4679-bf78-aa3172bfe7d2';

// Issues mapped by original status for proper status updates
const DONE_ISSUES = [
  { id: 'ONEK-6', title: '[Migrated] SubAgent:Coder — ErrorMonitorAgent Implementation', status: 'Done' },
  { id: 'ONEK-12', title: '[Migrated] SubAgent:Coder — RFP Submission Form & Wizard', status: 'Done' },
  { id: 'ONEK-24', title: '[Migrated] SubAgent:Coder — Dashboard Pages Implementation', status: 'Done' },
  { id: 'ONEK-36', title: '[Migrated] SubAgent:Coder — Avinode MCP Server Implementation', status: 'Done' },
  { id: 'ONEK-37', title: '[Migrated] SubAgent:Coder — MCP Base Server Infrastructure', status: 'Done' },
  { id: 'ONEK-41', title: '[Migrated] SubAgent:Planner — Week 2-3 MCP & Agent Planning', status: 'Done' },
  { id: 'ONEK-42', title: '[Migrated] SubAgent:Coder — Supabase Database Schema & RLS Policies', status: 'Done' },
  { id: 'ONEK-43', title: '[Migrated] SubAgent:Coder — Clerk Authentication Integration', status: 'Done' },
  { id: 'ONEK-44', title: '[Migrated] SubAgent:Ops — Environment Configuration & Infrastructure', status: 'Done' },
  { id: 'ONEK-45', title: '[Migrated] SubAgent:Tester — Setup Testing Infrastructure', status: 'Done' },
  { id: 'ONEK-46', title: '[Migrated] SubAgent:Reviewer — Code Review Standards', status: 'Done' },
  { id: 'ONEK-47', title: '[Migrated] SubAgent:Planner — Week 1 Foundation Planning', status: 'Done' },
  { id: 'ONEK-48', title: '[Migrated] SubAgent:Coder — Fix TypeScript Compilation', status: 'Done' }
];

const IN_PROGRESS_ISSUES = [
  { id: 'ONEK-26', title: '[Migrated] SubAgent:Coder — Complete API Routes Layer', status: 'In Progress' }
];

const BACKLOG_ISSUES = [
  { id: 'ONEK-5', title: '[Migrated] Settings View Redesign & Enhancement', status: 'Backlog' },
  { id: 'ONEK-7', title: '[Migrated] SubAgent:Coder — Email Template Editor', status: 'Backlog' },
  { id: 'ONEK-8', title: '[Migrated] SubAgent:Tester — Accessibility Implementation', status: 'Backlog' },
  { id: 'ONEK-9', title: '[Migrated] SubAgent:Designer — Mobile Responsive Design', status: 'Backlog' },
  { id: 'ONEK-10', title: '[Migrated] SubAgent:Coder — Authentication UI Components', status: 'Backlog' },
  { id: 'ONEK-11', title: '[Migrated] SubAgent:Coder — Quote Comparison Interface', status: 'Backlog' },
  { id: 'ONEK-13', title: '[Migrated] SubAgent:Planner — API Documentation', status: 'Backlog' },
  { id: 'ONEK-14', title: '[Migrated] SubAgent:Ops — Production Environment Setup', status: 'Backlog' },
  { id: 'ONEK-15', title: '[Migrated] SubAgent:Ops — Staging Environment', status: 'Backlog' },
  { id: 'ONEK-16', title: '[Migrated] SubAgent:Ops — CI/CD Pipeline', status: 'Backlog' },
  { id: 'ONEK-17', title: '[Migrated] SubAgent:Ops — Sentry Integration', status: 'Backlog' },
  { id: 'ONEK-18', title: '[Migrated] SubAgent:Reviewer — Security Audit', status: 'Backlog' },
  { id: 'ONEK-19', title: '[Migrated] SubAgent:Tester — E2E Tests', status: 'Backlog' },
  { id: 'ONEK-20', title: '[Migrated] SubAgent:Tester — Integration Tests', status: 'Backlog' },
  { id: 'ONEK-21', title: '[Migrated] SubAgent:Tester — Unit Tests for Agents', status: 'Backlog' },
  { id: 'ONEK-22', title: '[Migrated] SubAgent:Coder — Supabase Realtime', status: 'Backlog' },
  { id: 'ONEK-23', title: '[Migrated] SubAgent:Coder — API Client', status: 'Backlog' },
  { id: 'ONEK-25', title: '[Migrated] SubAgent:Coder — PDF Generation Service', status: 'Backlog' },
  { id: 'ONEK-27', title: '[Migrated] SubAgent:Coder — Error Monitor Agent', status: 'Backlog' },
  { id: 'ONEK-28', title: '[Migrated] SubAgent:Coder — Communication Manager Agent', status: 'Backlog' },
  { id: 'ONEK-29', title: '[Migrated] SubAgent:Coder — Proposal Analysis Agent', status: 'Backlog' },
  { id: 'ONEK-30', title: '[Migrated] SubAgent:Coder — Flight Search Agent', status: 'Backlog' },
  { id: 'ONEK-31', title: '[Migrated] SubAgent:Coder — Client Data Manager Agent', status: 'Backlog' },
  { id: 'ONEK-32', title: '[Migrated] SubAgent:Coder — Agent Tools', status: 'Backlog' },
  { id: 'ONEK-33', title: '[Migrated] SubAgent:Coder — RFP Orchestrator Agent', status: 'Backlog' },
  { id: 'ONEK-34', title: '[Migrated] SubAgent:Coder — Google Sheets MCP Server', status: 'Backlog' },
  { id: 'ONEK-35', title: '[Migrated] SubAgent:Coder — Gmail MCP Server', status: 'Backlog' },
  { id: 'ONEK-38', title: '[Migrated] SubAgent:Coder — First API Route', status: 'Backlog' },
  { id: 'ONEK-39', title: '[Migrated] SubAgent:Coder — Supabase Client', status: 'Backlog' },
  { id: 'ONEK-40', title: '[Migrated] SubAgent:Ops — Redis Setup', status: 'Backlog' }
];

const ALL_ISSUES = [...DONE_ISSUES, ...IN_PROGRESS_ISSUES, ...BACKLOG_ISSUES];

// GraphQL mutation to update issue with project
const UPDATE_ISSUE_MUTATION = `
  mutation UpdateIssue($issueId: String!, $projectId: String!) {
    issueUpdate(
      id: $issueId
      input: {
        projectId: $projectId
      }
    ) {
      success
      issue {
        id
        identifier
        title
        project {
          id
          name
        }
      }
    }
  }
`;

// GraphQL query to get issue by identifier
const GET_ISSUE_QUERY = `
  query GetIssue($identifier: String!) {
    issue(id: $identifier) {
      id
      identifier
      title
    }
  }
`;

function makeLinearRequest(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'api.linear.app',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.errors) {
            reject(new Error(JSON.stringify(response.errors)));
          } else {
            resolve(response.data);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function getIssueId(identifier) {
  try {
    const data = await makeLinearRequest(GET_ISSUE_QUERY, { identifier });
    return data.issue ? data.issue.id : null;
  } catch (error) {
    console.error(`❌ Error getting issue ${identifier}:`, error.message);
    return null;
  }
}

async function linkIssueToProject(issueIdentifier, issueId) {
  try {
    console.log(`🔗 Linking ${issueIdentifier} to Prompt-Builder project...`);

    const data = await makeLinearRequest(UPDATE_ISSUE_MUTATION, {
      issueId: issueId,
      projectId: JETVISION_MAS_PROJECT_ID
    });

    if (data.issueUpdate.success) {
      console.log(`✅ Successfully linked ${issueIdentifier} to project`);
      return true;
    } else {
      console.log(`❌ Failed to link ${issueIdentifier}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error linking ${issueIdentifier}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     Linear Issue Project Linking Script                      ║');
  console.log('║     Link Issues to Prompt-Builder Project                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!LINEAR_API_KEY) {
    console.error('❌ LINEAR_API_KEY environment variable not set!');
    console.error('   Please set LINEAR_API_KEY or LINEAR_API_TOKEN in your environment.');
    process.exit(1);
  }

  console.log(`📁 Target Project: Jetvision MAS (${JETVISION_MAS_PROJECT_ID})`);
  console.log(`📋 Total issues to process: ${ALL_ISSUES.length}`);
  console.log(`  ✅ Done: ${DONE_ISSUES.length}`);
  console.log(`  🔄 In Progress: ${IN_PROGRESS_ISSUES.length}`);
  console.log(`  📋 Backlog: ${BACKLOG_ISSUES.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const issue of ALL_ISSUES) {
    console.log(`\n📌 Processing ${issue.id}: ${issue.title}`);
    console.log(`   Status: ${issue.status}`);

    // Get the internal UUID for the issue
    const issueId = await getIssueId(issue.id);

    if (!issueId) {
      console.log(`❌ Could not find issue ${issue.id}`);
      failCount++;
      continue;
    }

    // Link to project
    const success = await linkIssueToProject(issue.id, issueId);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Migration Complete                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Successfully linked: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`\n🔗 View project: https://linear.app/designthru-ai/project/jetvision-mas-dda222c08585\n`);

  console.log('\n⚠️  Next Steps:');
  console.log('1. Update issue statuses in Linear UI:');
  console.log(`   - ${DONE_ISSUES.length} issues to mark as "Done"`);
  console.log(`   - ${IN_PROGRESS_ISSUES.length} issues to mark as "In Progress"`);
  console.log(`   - ${BACKLOG_ISSUES.length} issues already in "Backlog"`);
  console.log('2. Add labels for filtering (Active, Backlog, Completed)');
  console.log('3. Verify all issues show up in the Jetvision MAS project\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
