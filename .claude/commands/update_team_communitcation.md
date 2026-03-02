Please complete the following tasks in order:

**IMPORTANT:** You MUST invoke the `team-communication` skill using the Skill tool BEFORE taking any action. The skill contains the full workflow, email templates, user manual template, account setup guides, team directory, and troubleshooting steps.

```txt
Skill: team-communication
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.

---

## Flags

### Document Type (`--doc`)

| Flag | Document | Description |
|------|----------|-------------|
| `--doc project-update` | Project update email | Weekly/sprint status email with Linear metrics |
| `--doc user-manual` | Jetvision user manual | App guide + account setup for handoff |
| `--doc schedule` | Project schedule | Update PROJECT_SCHEDULE.csv only |
| `--doc demo-slides` | Demo presentation | Google Slides / PPTX from recordings |
| `--doc status-update` | Ad-hoc status update | Short-form update email |
| `--doc uat-request` | UAT request email | Linear issue links + sign-off instructions |
| `--doc handoff` | Full handoff package | Manual + schedule + update + env template |
| `--doc all` | All documents (default) | Generate everything |

### Recipient (`--to`)

| Flag | Recipient(s) | Email |
|------|-------------|-------|
| `--to all` | Everyone (default) | AB (primary) + CC Kham, Kingler |
| `--to ab` | Adrian Budny only | ab@cucinalabs.com |
| `--to kham` | Kham Lam only | kham@onekaleidoscope.com |
| `--to kingler` | Kingler Bercy only | kinglerbercy@gmail.com |
| `--to ab,kham` | Multiple specific | Comma-separated handles |

### Other Flags

| Flag | Description |
|------|-------------|
| `--skip-demos` | Skip demo recording and presentation steps |
| `--skip-email` | Generate documents only, do not send |
| `--skip-screenshots` | Skip capturing app state screenshots for user manual |
| `--phase N` | Demo presentation for specific phase (1-5) |
| `--title "..."` | Custom presentation or document title |
| `--subject "..."` | Custom email subject line |
| `--include-manual` | Attach user manual link in project update email |
| `--issues "ONEK-1,ONEK-2"` | Comma-separated Linear issue IDs for UAT request |
| `--deadline "YYYY-MM-DD"` | UAT completion deadline (default: +3 business days) |

---

## Usage Examples

```bash
# Full workflow — all docs, send to everyone
/update_team_communitcation

# Project update email only, send to AB
/update_team_communitcation --doc project-update --to ab

# Generate user manual (no email)
/update_team_communitcation --doc user-manual --skip-email

# Quick status to one person
/update_team_communitcation --doc status-update --to kham --subject "ONEK-212 update"

# Full handoff package to everyone
/update_team_communitcation --doc handoff --to all

# Demo presentation for Phase 1 only
/update_team_communitcation --doc demo-slides --phase 1 --skip-email

# Project update with user manual link included
/update_team_communitcation --doc project-update --include-manual --to all

# UAT request for specific issues
/update_team_communitcation --doc uat-request --issues "ONEK-360,ONEK-365" --to all

# UAT request with custom deadline
/update_team_communitcation --doc uat-request --issues "ONEK-178" --deadline "2026-03-07" --to ab
```

---

## User Manual — Account Setup Covered

The `--doc user-manual` flag generates a comprehensive Jetvision user manual with step-by-step setup instructions for:

| # | Account | Purpose |
|---|---------|---------|
| 1 | **Supabase** | PostgreSQL database + file storage |
| 2 | **Clerk** | Google OAuth authentication |
| 3 | **OpenAI** | Primary LLM (GPT-4 Turbo) |
| 4 | **Anthropic** | Secondary LLM (Claude) — optional |
| 5 | **Google Gemini** | Tertiary LLM — optional |
| 6 | **Google Cloud** | Gmail API + Drive API + Slides API |
| 7 | **Vercel** | Production hosting + CI/CD |

Includes 39 screenshot locations covering auth states, chat states, trip cards, Avinode integration, proposal/contract lifecycle, and account setup pages.

---

## Related Commands

- `/uat_instructions ONEK-XXX` — Generate UAT instructions for a Linear issue (run before `--doc uat-request`)
- `/demo-record` — Record demo videos (run before `/demo-presentation`)
- `/demo-presentation` — Generate Google Slides from demo recordings
- `/e2e-test` — Full E2E test runbook (13 scenarios)
- `/avinode-sandbox-test` — Interactive browser-driven E2E test
