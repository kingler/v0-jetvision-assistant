#!/usr/bin/env npx tsx
/**
 * Send a PROJECT-UPDATE markdown file as an HTML email to the team.
 *
 * Usage:
 *   npx tsx scripts/send-project-update-email.ts <mdFile> [subject]
 *
 * Examples:
 *   npx tsx scripts/send-project-update-email.ts docs/communication/PROJECT-UPDATE-FEB0926.md
 *   npx tsx scripts/send-project-update-email.ts docs/communication/PROJECT-UPDATE-FEB0926.md "Jetvision Update — Feb 9"
 *
 * If <mdFile> is omitted the script prints usage and exits.
 * If [subject] is omitted a default is derived from the filename.
 *
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env.local
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in .env.local');
  process.exit(1);
}

// --- CLI argument parsing ---------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: npx tsx scripts/send-project-update-email.ts <mdFile> [subject]');
  console.log('');
  console.log('  <mdFile>   Path to the PROJECT-UPDATE markdown file (relative or absolute)');
  console.log('  [subject]  Email subject line (optional — derived from filename if omitted)');
  process.exit(0);
}

const mdPath = resolve(args[0]);
if (!existsSync(mdPath)) {
  console.error(`File not found: ${mdPath}`);
  process.exit(1);
}

const markdownContent = readFileSync(mdPath, 'utf-8');

// Derive a default subject from the filename, e.g.
// PROJECT-UPDATE-FEB0926.md → "Jetvision Project Update — FEB0926"
function deriveSubject(filePath: string): string {
  const name = basename(filePath, '.md'); // PROJECT-UPDATE-FEB0926
  const datePart = name.replace(/^PROJECT-UPDATE-/i, ''); // FEB0926
  return `Jetvision Project Update - ${datePart}`;
}

const subject = args[1] || deriveSubject(mdPath);

// --- Markdown → HTML --------------------------------------------------------

function markdownToHtml(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>\n');

  // Handle tables (simple conversion)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // Skip separator rows
    const cellHtml = cells.map(c => `<td style="padding:4px 8px;border:1px solid #ddd">${c.trim()}</td>`).join('');
    return `<tr>${cellHtml}</tr>`;
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      <p>${html}</p>
    </div>
  `;
}

const htmlBody = markdownToHtml(markdownContent);

// --- Recipients -------------------------------------------------------------

const recipients = [
  { name: 'Adrian Budny', email: 'ab@cucinalabs.com' },
  { name: 'Kham Lam', email: 'kham@onekaleidoscope.com' },
  { name: 'Kingler Bercy', email: 'kinglerbercy@gmail.com' },
];

// --- Send -------------------------------------------------------------------

async function sendEmail(to: string, toName: string) {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const message = [
    `From: Kingler Bercy <kinglerbercy@gmail.com>`,
    `To: ${toName} <${to}>`,
    `Cc: ${recipients.map(r => `${r.name} <${r.email}>`).join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  return response.data;
}

async function main() {
  console.log(`Sending project update email to team...`);
  console.log(`  File:    ${mdPath}`);
  console.log(`  Subject: ${subject}\n`);

  const primaryRecipient = recipients[0];

  try {
    const result = await sendEmail(primaryRecipient.email, primaryRecipient.name);
    console.log(`Email sent successfully!`);
    console.log(`  To: ${primaryRecipient.email}`);
    console.log(`  Cc: ${recipients.slice(1).map(r => r.email).join(', ')}`);
    console.log(`  Message ID: ${result.id}`);
    console.log(`  Thread ID: ${result.threadId}`);
  } catch (error) {
    console.error('Failed to send email:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
