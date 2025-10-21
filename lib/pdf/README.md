# PDF Generation

This directory contains utilities for generating professional PDF proposals.

## Files

- `generator.ts` - Main PDF generation logic
- `templates/` - PDF templates and styling
- `types.ts` - TypeScript types for PDF data structures

## Features

- Professional proposal formatting
- Multi-aircraft comparison tables
- Flight details and pricing
- Company branding
- Client information

## Usage

```typescript
import { generateProposalPDF } from '@/lib/pdf/generator'

const pdfBuffer = await generateProposalPDF({
  requestId: '123',
  proposals: [...],
  clientInfo: {...}
})
```

## Dependencies

- `jsPDF` or `puppeteer` for PDF generation
- Templates use company branding assets
