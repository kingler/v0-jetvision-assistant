#!/usr/bin/env npx tsx
/**
 * Google OAuth Refresh Token Generator
 *
 * This script helps you get a refresh token for Gmail API access.
 *
 * Usage:
 *   npx tsx scripts/get-google-refresh-token.ts
 *
 * Prerequisites:
 *   1. Create OAuth credentials at https://console.cloud.google.com/apis/credentials
 *   2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *   3. Add http://localhost:3333/callback as authorized redirect URI
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { appendFileSync, readFileSync } from 'fs';
import open from 'open';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';

// Scopes needed for Gmail, Google Drive, and Google Slides
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/presentations',
];

async function main() {
  console.log('\n🔐 Google OAuth Refresh Token Generator\n');

  // Validate credentials
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing credentials in .env.local:');
    if (!CLIENT_ID) console.error('   - GOOGLE_CLIENT_ID');
    if (!CLIENT_SECRET) console.error('   - GOOGLE_CLIENT_SECRET');
    console.error('\nGet these from: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  console.log('✅ Found OAuth credentials');
  console.log(`   Client ID: ${CLIENT_ID.substring(0, 20)}...`);

  // Create OAuth client
  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    prompt: 'consent', // Force consent to get refresh token
    scope: SCOPES,
  });

  console.log('\n📋 Setup Instructions:');
  console.log('   1. Go to Google Cloud Console → APIs & Services → Credentials');
  console.log('   2. Edit your OAuth 2.0 Client');
  console.log('   3. Add this Authorized redirect URI:');
  console.log(`      ${REDIRECT_URI}`);
  console.log('   4. Save and wait a few minutes for changes to propagate\n');

  // Create local server to handle callback
  const server = createServer(async (req, res) => {
    const urlParts = parse(req.url || '', true);

    if (urlParts.pathname === '/callback') {
      const code = urlParts.query.code as string;
      const error = urlParts.query.error as string;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>❌ Authorization Failed</h1>
              <p>Error: ${error}</p>
              <p>Please try again.</p>
            </body>
          </html>
        `);
        console.error('\n❌ Authorization failed:', error);
        server.close();
        process.exit(1);
      }

      if (code) {
        try {
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `);

          console.log('\n✅ Authorization successful!\n');

          if (tokens.refresh_token) {
            console.log('🔑 Refresh Token:');
            console.log(`   ${tokens.refresh_token}\n`);

            // Update .env.local
            const envPath = resolve(__dirname, '../.env.local');
            const envContent = readFileSync(envPath, 'utf-8');

            if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
              // Replace existing placeholder
              const updatedContent = envContent.replace(
                /GOOGLE_REFRESH_TOKEN=.*/,
                `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
              );
              require('fs').writeFileSync(envPath, updatedContent);
              console.log('✅ Updated GOOGLE_REFRESH_TOKEN in .env.local');
            } else {
              // Append new line
              appendFileSync(envPath, `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
              console.log('✅ Added GOOGLE_REFRESH_TOKEN to .env.local');
            }

            // Also save the user email if we can get it
            if (tokens.access_token) {
              try {
                oauth2Client.setCredentials(tokens);
                const gmail = await import('googleapis').then(m => m.google.gmail({ version: 'v1', auth: oauth2Client }));
                const profile = await gmail.users.getProfile({ userId: 'me' });
                const email = profile.data.emailAddress;

                if (email) {
                  const currentEnv = readFileSync(envPath, 'utf-8');
                  if (!currentEnv.includes('GMAIL_USER_EMAIL=') || currentEnv.includes('GMAIL_USER_EMAIL=your')) {
                    if (currentEnv.includes('GMAIL_USER_EMAIL=')) {
                      const updated = currentEnv.replace(/GMAIL_USER_EMAIL=.*/, `GMAIL_USER_EMAIL=${email}`);
                      require('fs').writeFileSync(envPath, updated);
                    } else {
                      appendFileSync(envPath, `GMAIL_USER_EMAIL=${email}\n`);
                    }
                    console.log(`✅ Set GMAIL_USER_EMAIL=${email}`);
                  }
                }
              } catch {
                // Ignore profile fetch errors
              }
            }

            console.log('\n🎉 Gmail integration is now configured!');
            console.log('   Restart your dev server to apply changes.\n');
          } else {
            console.log('⚠️  No refresh token received.');
            console.log('   This can happen if you already authorized this app.');
            console.log('   To force a new refresh token:');
            console.log('   1. Go to https://myaccount.google.com/permissions');
            console.log('   2. Remove access for this app');
            console.log('   3. Run this script again\n');
          }

          server.close();
          process.exit(0);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>❌ Token Exchange Failed</h1>
                <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
              </body>
            </html>
          `);
          console.error('\n❌ Token exchange failed:', err);
          server.close();
          process.exit(1);
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(3333, async () => {
    console.log('🌐 Starting local server on http://localhost:3333');
    console.log('\n📱 Opening browser for authorization...\n');

    try {
      await open(authUrl);
    } catch {
      console.log('Could not open browser automatically.');
      console.log('Please open this URL manually:\n');
      console.log(authUrl);
    }

    console.log('Waiting for authorization...');
  });

  // Timeout after 5 minutes
  setTimeout(() => {
    console.error('\n❌ Timeout: No authorization received after 5 minutes');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
