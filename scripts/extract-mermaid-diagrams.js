#!/usr/bin/env node

/**
 * Mermaid Diagram Extractor
 * 
 * Extracts Mermaid diagrams from markdown files and converts them to PNG.
 * 
 * Usage:
 *   npm run extract-diagrams docs/architecture/MULTI_AGENT_SYSTEM.md
 *   node scripts/extract-mermaid-diagrams.js docs/architecture/MULTI_AGENT_SYSTEM.md
 * 
 * Dependencies:
 *   npm install -D @mermaid-js/mermaid-cli
 * 
 * Output:
 *   PNG files saved to docs/architecture/ with naming convention:
 *   uml-{diagram-name}.png or uml-{diagram-name}-{n}.png for duplicates
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

/**
 * Extract diagram name from Mermaid code
 * Looks for:
 * 1. Comments at the start: %% diagram-name %%
 * 2. Title directive: title My Diagram
 * 3. Subgraph names
 * 4. Diagram type as fallback
 */
function extractDiagramName(mermaidCode, index) {
  // Check for comment label: %% name %%
  const commentMatch = mermaidCode.match(/^\s*%%\s*(.+?)\s*%%/m);
  if (commentMatch) {
    return slugify(commentMatch[1]);
  }

  // Check for title directive
  const titleMatch = mermaidCode.match(/title\s+(.+)/i);
  if (titleMatch) {
    return slugify(titleMatch[1]);
  }

  // Detect diagram type and extract meaningful name
  const diagramType = detectDiagramType(mermaidCode);
  
  // For flowcharts, try to get first subgraph name
  if (diagramType === 'flowchart') {
    const subgraphMatch = mermaidCode.match(/subgraph\s+(\w+)\["?([^"\]]+)"?\]/);
    if (subgraphMatch) {
      return slugify(subgraphMatch[2] || subgraphMatch[1]);
    }
  }

  // For sequence diagrams, try to get participants
  if (diagramType === 'sequence') {
    const participants = mermaidCode.match(/participant\s+(\w+)/g);
    if (participants && participants.length >= 2) {
      return `${diagramType}-diagram`;
    }
  }

  // For state diagrams
  if (diagramType === 'state') {
    return 'workflow-state-machine';
  }

  // Fallback: use diagram type with index
  return `${diagramType}-diagram-${index + 1}`;
}

/**
 * Detect the type of Mermaid diagram
 */
function detectDiagramType(mermaidCode) {
  const firstLine = mermaidCode.trim().split('\n')[0].toLowerCase();
  
  if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
    return 'flowchart';
  }
  if (firstLine.includes('sequencediagram') || firstLine.includes('sequence')) {
    return 'sequence';
  }
  if (firstLine.includes('statediagram') || firstLine.includes('state')) {
    return 'state';
  }
  if (firstLine.includes('classDiagram') || firstLine.includes('class')) {
    return 'class';
  }
  if (firstLine.includes('erdiagram') || firstLine.includes('er')) {
    return 'er';
  }
  if (firstLine.includes('gantt')) {
    return 'gantt';
  }
  if (firstLine.includes('pie')) {
    return 'pie';
  }
  if (firstLine.includes('journey')) {
    return 'journey';
  }
  
  return 'diagram';
}

/**
 * Convert string to URL-safe slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Extract all Mermaid code blocks from markdown content
 */
function extractMermaidBlocks(markdownContent) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = mermaidRegex.exec(markdownContent)) !== null) {
    blocks.push({
      code: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

/**
 * Generate unique filename, handling duplicates
 */
function generateUniqueFilename(baseName, outputDir, existingNames) {
  let finalName = baseName;
  let counter = 1;

  while (existingNames.has(finalName)) {
    finalName = `${baseName}-${counter}`;
    counter++;
  }

  existingNames.add(finalName);
  return `uml-${finalName}.png`;
}

/**
 * Convert Mermaid code to PNG using mermaid-cli
 */
function convertToPng(mermaidCode, outputPath) {
  const tempMmdFile = join(dirname(outputPath), `.temp-${Date.now()}.mmd`);
  
  try {
    // Write Mermaid code to temp file
    writeFileSync(tempMmdFile, mermaidCode, 'utf8');

    // Find mmdc (mermaid-cli) executable
    const mmdcPath = join(PROJECT_ROOT, 'node_modules', '.bin', 'mmdc');
    
    // Run mermaid-cli
    const command = `"${mmdcPath}" -i "${tempMmdFile}" -o "${outputPath}" -b transparent -t neutral`;
    
    execSync(command, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000, // 60 second timeout
    });

    return true;
  } catch (error) {
    console.error(`  ❌ Failed to convert diagram: ${error.message}`);
    return false;
  } finally {
    // Clean up temp file
    if (existsSync(tempMmdFile)) {
      unlinkSync(tempMmdFile);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npm run extract-diagrams <markdown-file>

Example:
  npm run extract-diagrams docs/architecture/MULTI_AGENT_SYSTEM.md

This script extracts Mermaid diagrams from markdown files and converts them to PNG.
Output files are saved to the same directory as the input file.
`);
    process.exit(0);
  }

  const inputPath = args[0];
  
  // Resolve the full path
  let fullPath;
  if (inputPath.startsWith('/')) {
    fullPath = inputPath;
  } else {
    fullPath = join(PROJECT_ROOT, inputPath);
  }

  // Verify file exists
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  // Read markdown content
  console.log(`📄 Reading: ${inputPath}`);
  const markdownContent = readFileSync(fullPath, 'utf8');

  // Extract Mermaid blocks
  const mermaidBlocks = extractMermaidBlocks(markdownContent);

  if (mermaidBlocks.length === 0) {
    console.log('ℹ️  No Mermaid diagrams found in the file.');
    process.exit(0);
  }

  console.log(`📊 Found ${mermaidBlocks.length} Mermaid diagram(s)\n`);

  // Prepare output directory
  const outputDir = dirname(fullPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Track used names for uniqueness
  const usedNames = new Set();
  const createdFiles = [];

  // Process each Mermaid block
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i];
    const diagramName = extractDiagramName(block.code, i);
    const filename = generateUniqueFilename(diagramName, outputDir, usedNames);
    const outputPath = join(outputDir, filename);

    console.log(`[${i + 1}/${mermaidBlocks.length}] Converting: ${filename}`);
    console.log(`    Type: ${detectDiagramType(block.code)}`);

    const success = convertToPng(block.code, outputPath);
    
    if (success) {
      createdFiles.push(filename);
      console.log(`    ✅ Created: ${filename}`);
    }
    
    console.log('');
  }

  // Summary
  console.log('─'.repeat(50));
  if (createdFiles.length > 0) {
    console.log(`\n✅ Created ${createdFiles.length} PNG file(s) in ${outputDir}:`);
    createdFiles.forEach(f => console.log(`   • ${f}`));
  } else {
    console.log('\n⚠️  No PNG files were created. Check for errors above.');
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
