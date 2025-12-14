# Linear Sync - Quick Reference

**One-page guide to Linear Context Sync**

---

## 🚀 Quick Start

### Automatic Sync (Recommended)

```bash
# Run codebase analysis (includes Linear sync)
@.claude/commands/analyze_codebase.md
```

### Manual Sync

```bash
# Sync to Linear
npm run sync:linear

# Preview changes (dry run)
npm run sync:linear:dry-run
```

---

## 📝 Status Indicators

Use these in `.context/` files for automatic detection:

| Emoji | Status | Linear State |
|-------|--------|--------------|
| ✅ | Complete | Done |
| 🟡 | In Progress | In Progress |
| ❌ | Pending | Todo |
| ⛔ | Blocked | Blocked |

---

## 📋 Example Usage

### In .context/ Files

```markdown
## ONEK-93: Message Component System ✅
**Status**: Complete
**Completion**: 100%

## ONEK-92: Unified Chat Interface 🟡
**Status**: In Progress
**Completion**: 45%

## ONEK-95: Backend Integration ⛔
**Status**: Blocked - Waiting for MCP servers
```

### Result

When you run `analyze_codebase` or `npm run sync:linear`:
- ONEK-93 → Linear state: "Done"
- ONEK-92 → Linear state: "In Progress"
- ONEK-95 → Linear state: "Blocked"

Each issue gets a comment:
```
🔄 Status synced from codebase analysis
- Local Status: complete
- Source: .context/status/current-project-status.md
- Completion: 100%
- Synced At: 2025-11-14T10:30:00.000Z
```

---

## 🔧 CLI Commands

```bash
# Basic sync
npm run sync:linear

# Dry run (preview only)
npm run sync:linear:dry-run

# Different team
npm run sync:linear -- --team DES

# Verbose output
npm run sync:linear -- --verbose

# Help
npm run sync:linear -- --help
```

---

## 📊 Sync Report

After each sync, check `.context/linear-sync-report.md`:

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
```

---

## ⚠️ Troubleshooting

### Issue Not Found
**Problem**: "Issue ONEK-XX not found in Linear"
**Solution**: Verify issue exists and identifier is correct

### Permission Error
**Problem**: "Permission denied"
**Solution**: Ensure you have write access to Linear team

### No Changes
**Problem**: All issues skipped
**Solution**: This is normal! Linear is already in sync

---

## 🎯 Best Practices

1. ✅ Use consistent status indicators (✅, 🟡, ❌, ⛔)
2. ✅ Run dry run first: `npm run sync:linear:dry-run`
3. ✅ Review sync reports in `.context/linear-sync-report.md`
4. ✅ Keep `.context/` files updated
5. ✅ Sync after major milestones

---

## 📚 Full Documentation

- [Complete Guide](./LINEAR_CONTEXT_SYNC.md)
- [Linear Library](../lib/linear/README.md)
- [Implementation Details](../.context/documentation/linear-sync-integration.md)

---

**Quick Help**: Run `npm run sync:linear -- --help`

