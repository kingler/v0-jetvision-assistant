# Linear Context Sync Integration

**Automated synchronization between `.context/` directory and Linear project management**

---

## Overview

The Linear Context Sync system automatically keeps Linear issue tracking in sync with actual development progress tracked in the `.context/` directory. This ensures that Linear always reflects the true state of the codebase.

### Key Features

- ✅ **Automatic Status Detection** - Parses `.context/` files to extract task status
- ✅ **Bidirectional Alignment** - Updates Linear to match local development state
- ✅ **Intelligent Parsing** - Recognizes ONEK-XX and DES-XX identifiers
- ✅ **Status Mapping** - Maps local status indicators to Linear states
- ✅ **Audit Trail** - Adds timestamped comments to Linear issues
- ✅ **Dry Run Mode** - Preview changes before syncing
- ✅ **Comprehensive Reporting** - Detailed sync reports saved to `.context/`

---

## How It Works

### 1. Status Detection

The system scans all markdown files in `.context/` and extracts:

- **Task Identifiers**: ONEK-93, DES-111, etc.
- **Status Indicators**: ✅ (complete), 🟡 (in progress), ❌ (pending), ⛔ (blocked)
- **Completion Percentages**: 75%, 100%, etc.
- **Context**: Surrounding text for accurate status determination

### 2. Status Mapping

Local status indicators are mapped to Linear states:

| Local Status | Emoji | Linear State |
|--------------|-------|--------------|
| Complete | ✅ | Done |
| In Progress | 🟡 | In Progress |
| Pending | ❌ | Todo |
| Blocked | ⛔ | Blocked |

### 3. Sync Process

For each task found in `.context/`:

1. Query Linear to find the matching issue
2. Compare local status with Linear status
3. If different, update Linear to match local state
4. Add a timestamped comment with sync metadata
5. Log the result (synced, skipped, or failed)

### 4. Reporting

After sync completes, a detailed report is generated showing:

- Issues successfully synced
- Issues skipped (already in sync)
- Issues that failed (with error details)
- Timestamp and summary statistics

---

## Usage

### Integrated with Codebase Analysis

The Linear sync runs automatically when you execute the `analyze_codebase` command:

```bash
# Analyze codebase and sync to Linear
@.claude/commands/analyze_codebase.md
```

This will:
1. Analyze the codebase
2. Update `.context/` files
3. Automatically sync status to Linear
4. Generate a sync report

### Manual Sync

You can also run the sync manually:

```bash
# Sync to Linear (default: ONEK team)
npm run sync:linear

# Preview changes without syncing
npm run sync:linear:dry-run

# Sync to different team
npm run sync:linear -- --team DES

# Verbose output
npm run sync:linear -- --verbose
```

### CLI Options

```
--dry-run, -d          Preview changes without syncing to Linear
--team, -t <TEAM>      Linear team key (default: ONEK)
--context-path, -c     Path to .context directory (default: ./.context)
--verbose, -v          Enable verbose logging
--help, -h             Show help message
```

---

## Example Workflow

### Scenario: Complete a Feature

1. **Work on feature** and update `.context/status/current-project-status.md`:
   ```markdown
   ### ONEK-93: Message Component System
   **Status**: ✅ Complete
   **Completion**: 100%
   ```

2. **Run codebase analysis**:
   ```bash
   @.claude/commands/analyze_codebase.md
   ```

3. **Automatic sync occurs**:
   - Detects ONEK-93 is marked complete
   - Queries Linear for ONEK-93
   - Updates Linear state to "Done"
   - Adds comment: "🔄 Status synced from codebase analysis"

4. **Review sync report** in `.context/linear-sync-report.md`:
   ```markdown
   ## Synced Issues
   - ✅ ONEK-93
   ```

---

## Status Detection Examples

### Example 1: Complete Task

```markdown
### ONEK-93: Message Component System ✅
**Status**: Complete
**Completion**: 100%
```

**Detected**: `status: 'complete'`, `completionPercentage: 100`

### Example 2: In Progress Task

```markdown
### ONEK-92: Unified Chat Interface 🟡
**Status**: In Progress
**Completion**: 45%
```

**Detected**: `status: 'in_progress'`, `completionPercentage: 45`

### Example 3: Blocked Task

```markdown
### ONEK-95: Backend Integration ⛔
**Status**: Blocked - Waiting for MCP servers
```

**Detected**: `status: 'blocked'`

---

## Configuration

### Environment Variables

No additional environment variables required. The system uses the existing Linear tool available in the environment.

### Team Configuration

Default team is `ONEK`. To sync to a different team:

```bash
npm run sync:linear -- --team DES
```

---

## Sync Report Format

Reports are saved to `.context/linear-sync-report.md`:

```markdown
# Linear Context Sync Report
**Timestamp**: 2025-11-14T10:30:00.000Z
**Status**: ✅ Success

## Summary
- **Synced**: 5 issues
- **Skipped**: 12 issues
- **Failed**: 0 issues

## Synced Issues
- ✅ ONEK-93
- ✅ ONEK-89
- ✅ ONEK-78
- ✅ ONEK-71
- ✅ ONEK-76

## Skipped Issues
- ⏭️ ONEK-92 (already in correct state)
- ⏭️ DES-111 (already in correct state)
```

---

## Troubleshooting

### Issue Not Found in Linear

**Problem**: Sync skips an issue with message "Issue ONEK-XX not found"

**Solution**: Verify the issue exists in Linear and the identifier is correct

### Permission Errors

**Problem**: Sync fails with permission error

**Solution**: Ensure you have write access to the Linear team

### Dry Run Shows No Changes

**Problem**: Dry run shows all issues skipped

**Solution**: This means Linear is already in sync with `.context/` - no action needed!

---

## Best Practices

1. **Run sync after major updates** - After completing features or milestones
2. **Use dry run first** - Preview changes before syncing: `npm run sync:linear:dry-run`
3. **Review sync reports** - Check `.context/linear-sync-report.md` for issues
4. **Keep .context/ updated** - Accurate local status ensures accurate Linear sync
5. **Use consistent status indicators** - Stick to ✅, 🟡, ❌, ⛔ for reliable detection

---

## Integration Points

### 1. Codebase Analysis Command

File: `.claude/commands/analyze_codebase.md`

The sync runs automatically after updating `.context/` files.

### 2. Linear Library

Files:
- `lib/linear/context-sync.ts` - Core sync logic
- `lib/linear/linear-tool.ts` - Linear API wrapper
- `lib/linear/index.ts` - Barrel exports

### 3. CLI Script

File: `scripts/sync-context-to-linear.ts`

Standalone script for manual syncing.

---

## Future Enhancements

- [ ] Bi-directional sync (Linear → `.context/`)
- [ ] Webhook integration for real-time updates
- [ ] Support for custom status mappings
- [ ] Sync issue descriptions and metadata
- [ ] Integration with GitHub Actions
- [ ] Support for multiple Linear teams simultaneously

---

## Related Documentation

- [Linear Integration Library](../lib/linear/README.md)
- [.context/ Directory Guide](../.context/README.md)
- [Analyze Codebase Command](../.claude/commands/analyze_codebase.md)

---

**Maintainers**: Development Team + Claude Code
**Last Updated**: 2025-11-14

