Please complete the following tasks in order:

1. **Analyze the current project status:**
   - Run the command/prompt defined in `.claude/commands/analyze_codebase.md`
   - Review the generated `overall_project_status.md` file in the `.context/` directory
   - Use the Linear MCP tool to fetch all issues, subtasks, and progress status updates for the "Jetvision MAS" project in the One Kaleidoscope team workspace https://linear.app/designthru-ai/team/ONEK/all

2. **Update the project schedule:**
   - Open `docs/communication/PROJECT_SCHEDULE.csv` file
   - Update task statuses, completion dates, and milestones based on:
     - Current Linear project data
     - Information from `overall_project_status.md`
     - Actual codebase implementation progress
   - Ensure date formats and status values are current and consistent

3. **Create an updated project communication email:**
   - Use the most recent `docs/communication/PROJECT-UPDATE-*.md` file as the template structure to create a new project update email as a follow up from the previous email update.
   - Create a new file with today's date (format: `PROJECT-UPDATE-[MMMDDYY].md`, e.g., `PROJECT-UPDATE-FEB0926.md`)
   - Update the content to reflect:
     - Latest accomplishments and completed milestones
     - Current work in progress
     - Upcoming priorities and blockers
     - Updated timeline based on the revised PROJECT_SCHEDULE.csv
   - Maintain the same professional tone and formatting as the original template
   - Address the correspondents of the email to the One Kaleidoscope Team members:
     - Adrian Budny @ab, email: ab@cucinalabs.com
     - Kham Lam @kham, email: kham@onekaleidoscope.com
     - Kingler Bercy @kingler, email: kinglerbercy@gmail.com

4. **Send the project update email via Gmail:**
   - Run: `npx tsx scripts/send-project-update-email.ts <mdFile> [subject]`
   - Pass the newly created PROJECT-UPDATE file path as the first argument
   - Optionally pass a custom subject line as the second argument (if omitted, derived from filename)
   - Example: `npx tsx scripts/send-project-update-email.ts docs/communication/PROJECT-UPDATE-FEB0926.md "Jetvision Project Update — Feb 9, 2026"`
   - The script uses OAuth credentials from `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`)
   - Email is sent from `kinglerbercy@gmail.com` to AB (primary) with CC to Kham and Kingler
   - Verify the send succeeds (exit code 0, message ID returned)
   - If the send fails, check that the OAuth credentials in `.env.local` are valid and the refresh token hasn't expired

## Email Send Script

Located at `scripts/send-project-update-email.ts`. This script:
- Accepts the markdown file path and optional subject as CLI arguments
- Converts markdown to HTML email format
- Sends via Gmail API using OAuth2 credentials from `.env.local`
- Sends to AB as primary recipient with CC to Kham and Kingler

### Required `.env.local` variables for email sending:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

### Usage:
```bash
# With auto-derived subject (from filename)
npx tsx scripts/send-project-update-email.ts docs/communication/PROJECT-UPDATE-FEB0926.md

# With custom subject
npx tsx scripts/send-project-update-email.ts docs/communication/PROJECT-UPDATE-FEB0926.md "Jetvision Project Update — Feb 9, 2026 (UAT Request)"

# Help
npx tsx scripts/send-project-update-email.ts --help
```

### Customizing for each update:
1. Pass the new PROJECT-UPDATE file path as the first argument
2. Pass a custom subject as the second argument (or let it auto-derive from filename)
3. Edit `recipients` array in the script if team members change
