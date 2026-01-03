/**
 * Test stripMarkdown function
 * Run: npx tsx scripts/test-strip-markdown.ts
 */

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Test with sample GPT response (similar to what we saw in screenshot)
const sampleMarkdown = `Got it — NYC to Miami this Friday for 4 passengers. I can line up the best available aircraft and pricing, but I need a few quick details to quote accurately:

1) **Date & timing:** Which **Friday** (date), and your preferred **departure time window**?
2) **Airports:**
   - **NYC:** **Teterboro (TEB)**, **White Plains (HPN)**, **JFK**, **LGA**, or **Newark (EWR)**?
   - Miami: **MIA**, **Opa-locka (OPF)**, or **Fort Lauderdale (FXE)**?
3) **Trip type:** **One-way or round-trip?** If round-trip, when are you coming back?
4) **Bags:** How many bags (and any oversized items like golf clubs)?
5) **Pets/catering/preferences:** Any pets, special catering, or cabin preferences?

**What I'll do next:** once you confirm the above, I'll source real-time availability from vetted operators and come back with **2–3 best options** (typically **light jet** and **midsize jet**) including **all-in pricing**, aircraft type, estimated flight time, and cabin details.`

console.log('='.repeat(60))
console.log('ORIGINAL MARKDOWN')
console.log('='.repeat(60))
console.log(sampleMarkdown)

console.log('\n')
console.log('='.repeat(60))
console.log('STRIPPED TO PLAIN TEXT')
console.log('='.repeat(60))

const plainText = stripMarkdown(sampleMarkdown)
console.log(plainText)

console.log('\n')
console.log('='.repeat(60))
console.log('VERIFICATION')
console.log('='.repeat(60))
console.log(`Contains ** markers: ${plainText.includes('**') ? 'YES (FAIL)' : 'NO (PASS)'}`)
console.log(`Contains ## headers: ${/^#{1,6}\s/m.test(plainText) ? 'YES (FAIL)' : 'NO (PASS)'}`)
console.log(`Contains \`\`\` code: ${plainText.includes('```') ? 'YES (FAIL)' : 'NO (PASS)'}`)
console.log(`Length: ${sampleMarkdown.length} → ${plainText.length} chars`)
