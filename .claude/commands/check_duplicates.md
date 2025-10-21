# Check for Code Duplication and Conflicts

You are **scanning for code duplication** and preventing conflicts between multiple agents working on the same codebase.

## Parameters:

- **Scope** (optional): `files`, `functions`, `components`, or `all` (default)
- **Threshold** (optional): Similarity threshold percentage (default: 80%)
- Usage: `/check_duplicates [scope] [threshold]`

## Actions to Execute:

1. **File-Level Duplication Scan**:

   ```bash
   # Scan for duplicate files
   node scripts/code_analyzer.js scan-duplicates --type=files --threshold=${threshold}
   ```

   - Detects identical or near-identical files
   - Identifies similar component structures
   - Flags potential merge conflicts

2. **Function-Level Analysis**:

   ```bash
   # Scan for duplicate functions and logic
   node scripts/code_analyzer.js scan-duplicates --type=functions --threshold=${threshold}
   ```

   - Identifies duplicate function implementations
   - Detects similar business logic patterns
   - Flags copy-paste code blocks

3. **Component Duplication Check**:

   ```bash
   # Scan React components for duplication
   node scripts/code_analyzer.js scan-duplicates --type=components --threshold=${threshold}
   ```

   - Identifies similar React components
   - Detects duplicate UI patterns
   - Flags overlapping component responsibilities

4. **Agent Coordination Check**:

   ```bash
   # Check agent work assignments and conflicts
   node scripts/multiagent_orchestrator.js check-conflicts
   ```

   - Verifies no two agents are working on the same file
   - Checks for overlapping feature assignments
   - Identifies potential merge conflicts

5. **Import/Export Analysis**:
   ```bash
   # Analyze module dependencies and circular imports
   node scripts/dependency_analyzer.js check-circular --fix-suggestions
   ```

   - Detects circular dependencies
   - Identifies unused exports
   - Suggests refactoring opportunities

## Duplication Prevention Strategies:

### **1. File Registry System**

- Maintains registry of all files and their responsible agents
- Prevents multiple agents from creating the same file
- Suggests existing files when new ones would duplicate functionality

### **2. Component Library Integration**

- Checks existing component library before creating new components
- Suggests reusing existing components
- Guides agents to extend rather than duplicate

### **3. Function Registry**

- Maintains database of existing utility functions
- Prevents duplicate utility creation
- Promotes code reuse and consistency

### **4. Real-time Conflict Detection**

- Monitors file changes from all agents
- Alerts when similar code is being written simultaneously
- Suggests coordination between agents

## Success Indicators:

- ✅ No duplicate files found (or acceptable duplicates identified)
- ✅ Function similarity below threshold percentage
- ✅ No agent work conflicts detected
- ✅ Circular dependencies resolved
- ✅ Import/export optimization opportunities identified

## Automated Fixes:

When duplicates are found, the system can:

### **Auto-Merge Similar Files**:

```bash
# Merge similar files with conflict resolution
node scripts/code_merger.js merge --files="file1.ts,file2.ts" --strategy=smart-merge
```

### **Extract Common Logic**:

```bash
# Extract duplicate functions to shared utilities
node scripts/refactor_tool.js extract-common --pattern="duplicate-functions"
```

### **Component Consolidation**:

```bash
# Consolidate similar components
node scripts/component_optimizer.js consolidate --similarity=${threshold}
```

## Integration with Development Workflow:

### **Pre-Commit Hook**:

- Automatically runs duplicate check before commits
- Prevents duplicate code from entering the repository
- Suggests refactoring before allowing commit

### **Agent Coordination**:

- Runs before agent task assignment
- Ensures agents don't duplicate work
- Coordinates shared file modifications

### **Code Review Integration**:

- Adds duplication analysis to pull request reviews
- Highlights potential consolidation opportunities
- Suggests shared utilities and components

## Quality Metrics:

- **Code Reuse Ratio**: Percentage of code that reuses existing functionality
- **Duplication Index**: Measure of codebase duplication (target: <5%)
- **Component Efficiency**: Ratio of component usage to component creation
- **Agent Coordination Score**: Measure of successful work distribution

## Agent Notification System:

When conflicts are detected:

1. **Alert Affected Agents**: Notify agents of potential conflicts
2. **Suggest Coordination**: Recommend communication between agents
3. **Propose Solutions**: Suggest merge strategies or work redistribution
4. **Track Resolution**: Monitor how conflicts are resolved

## Advanced Features:

### **Semantic Similarity Detection**:

- Uses AI to detect functionally similar code with different implementations
- Identifies opportunities for abstraction
- Suggests design pattern improvements

### **Dependency Optimization**:

- Analyzes import graphs for optimization opportunities
- Suggests barrel exports for better organization
- Identifies opportunities for code splitting
