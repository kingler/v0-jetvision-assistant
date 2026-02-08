#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import { glob } from 'glob';

// const globPromise = promisify(glob); // glob v10 has promise support built-in or different usage, but let's check widely used versions. 
// actually v10 is `import { glob } from 'glob'` and `await glob(...)`


const program = new Command();
const md = new MarkdownIt();

// RTF Constants
const RTF_HEADER = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\fmodern\\fcharset0 Courier New;}}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24 `;
const RTF_FOOTER = `}`;

interface RtfState {
  rtf: string;
  listDepth: number;
}

function convertToRtf(markdown: string): string {
  const tokens = md.parse(markdown, {});
  let state: RtfState = { rtf: RTF_HEADER, listDepth: 0 };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    switch (token.type) {
      case 'heading_open':
        const level = parseInt(token.tag.substring(1));
        let fontSize = 24; // Default
        switch (level) {
          case 1: fontSize = 48; break; // 24pt
          case 2: fontSize = 40; break; // 20pt
          case 3: fontSize = 32; break; // 16pt
          case 4: fontSize = 28; break; // 14pt
          case 5: fontSize = 28; break; // 14pt
          case 6: fontSize = 28; break; // 14pt
        }
        state.rtf += `\\par\\pard\\sa200\\sl276\\slmult1\\b\\fs${fontSize} `;
        break;
      case 'heading_close':
        state.rtf += `\\par\\pard\\sa200\\sl276\\slmult1\\b0\\fs24 `;
        break;
      case 'paragraph_open':
        if (state.listDepth === 0) {
          state.rtf += `\\par `;
        }
        break;
      case 'paragraph_close':
        state.rtf += `\\par `;
        break;
      case 'bullet_list_open':
      case 'ordered_list_open':
        state.listDepth++;
        break;
      case 'bullet_list_close':
      case 'ordered_list_close':
        state.listDepth--;
        break;
      case 'list_item_open':
        state.rtf += `\\par\\pard\\sa200\\sl276\\slmult1`;
        // Indentation for list items
        for (let j = 0; j < state.listDepth; j++) {
          state.rtf += `\\li${(j + 1) * 720} `;
        }
        state.rtf += `\\fi-360 \\bullet\\tab `;
        break;
      case 'list_item_close':
        state.rtf += ``;
        break;
      case 'inline':
        if (token.children) {
          for (const child of token.children) {
            switch (child.type) {
              case 'text':
                state.rtf += escapeRtf(child.content);
                break;
              case 'strong_open':
                state.rtf += `\\b `;
                break;
              case 'strong_close':
                state.rtf += `\\b0 `;
                break;
              case 'em_open':
                state.rtf += `\\i `;
                break;
              case 'em_close':
                state.rtf += `\\i0 `;
                break;
              case 'code_inline':
                state.rtf += `\\f1 ${escapeRtf(child.content)}\\f0 `;
                break;
              case 'link_open':
                // We'll just render the text for now, maybe with color
                state.rtf += `\\cf2\\ul `;
                break;
              case 'link_close':
                state.rtf += `\\ulnone\\cf0 `;
                break;
              case 'softbreak':
                state.rtf += ` `;
                break;
              case 'hardbreak':
                state.rtf += `\\line `;
                break;
            }
          }
        }
        break;
      case 'fence':
      case 'code_block':
        state.rtf += `\\par\\pard\\sa200\\sl276\\slmult1\\f1\\fs20 ${escapeRtf(token.content).replace(/\n/g, '\\line ')}\\f0\\fs24\\par `;
        break;
    }
  }

  state.rtf += RTF_FOOTER;
  return state.rtf;
}

function escapeRtf(text: string): string {
  return text.replace(/[\\{}]/g, '\\$&')
    .replace(/\n/g, '\\line ')
    // detailed ascii handling can effectively be skipped for basic chars
    // but for unicode, we might need more.
    // simple version:
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
}

async function processFile(filePath: string) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.md' && ext !== '.markdown') {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const rtfContent = convertToRtf(content);
    const outputPath = path.join(path.dirname(filePath), path.basename(filePath, ext) + '.rtf');

    fs.writeFileSync(outputPath, rtfContent);
    console.log(`Converted: ${filePath} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error converting ${filePath}:`, error);
  }
}

program
  .name('md-to-rtf')
  .description('Convert Markdown files to RTF')
  .argument('<path>', 'File or directory path')
  .action(async (inputPath) => {
    try {
      const stats = fs.statSync(inputPath);
      if (stats.isDirectory()) {
        const files = await glob(`${inputPath}/**/*.{md,markdown}`);
        if (files.length === 0) {
          console.log("No markdown files found in directory.");
          return;
        }
        console.log(`Found ${files.length} markdown files. Converting...`);
        for (const file of files) {
          await processFile(file);
        }
      } else if (stats.isFile()) {
        await processFile(inputPath);
      } else {
        console.error('Invalid path provided.');
        process.exit(1);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error('File or directory not found.');
      } else {
        console.error('An error occurred:', error);
      }
      process.exit(1);
    }
  });

program.parse();
