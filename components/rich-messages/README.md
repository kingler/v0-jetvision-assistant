# Rich Message Renderer

Comprehensive message rendering system for the Jetvision AI Assistant chat interface, providing a unified way to display all message types with rich formatting, threading, and performance optimization.

## Components

### MessageBubble

Wrapper component for individual chat messages with role-based styling, timestamps, and threading support.

**Features:**
- User/Agent/System message styling
- Timestamp display
- Message status indicators (sending, sent, delivered, failed)
- Reply threading support
- Loading and error states
- Avatar support
- Retry functionality for failed messages
- Accessibility (ARIA labels, keyboard navigation)

**Usage:**
```tsx
import { MessageBubble } from '@/components/rich-messages';

<MessageBubble
  id="msg-1"
  role="agent"
  timestamp={new Date()}
  components={[
    { type: 'text', content: 'Hello! How can I help you?' }
  ]}
  showTimestamp
  onReplyClick={(id) => console.log('Reply to:', id)}
/>
```

**Props:**
- `id` (string): Unique message identifier
- `role` ('user' | 'agent' | 'system'): Message role
- `timestamp` (Date): Message timestamp
- `components` (MessageComponent[]): Array of message components to render
- `author?` (string): Author name
- `avatar?` (string): Avatar URL
- `replyTo?` (ReplyInfo): Reply thread information
- `status?` ('sending' | 'sent' | 'delivered' | 'failed'): Message status
- `isLoading?` (boolean): Show loading skeleton
- `error?` (string): Error message
- `showTimestamp?` (boolean): Show timestamp (default: false)
- `onAction?` (function): Action handler for message components
- `onReplyClick?` (function): Reply button click handler
- `onRetry?` (function): Retry failed message handler

---

### MessageList

Virtualized message list with auto-scroll, date separators, and infinite scroll support.

**Features:**
- Auto-virtualization for large lists (>50 messages)
- Smart auto-scroll (only when at bottom)
- Date separators between days
- Message grouping (consecutive messages from same author)
- Infinite scroll (load older/newer messages)
- Scroll-to-bottom button
- Empty state support
- Loading indicators
- Accessibility (ARIA live regions)

**Usage:**
```tsx
import { MessageList } from '@/components/rich-messages';

<MessageList
  messages={messages}
  autoScroll
  showDateSeparators
  onLoadOlder={loadMore}
  onReplyClick={handleReply}
/>
```

**Props:**
- `messages` (Message[]): Array of messages to display
- `enableVirtualization?` (boolean): Force virtualization (auto-enabled for >50 messages)
- `autoScroll?` (boolean): Auto-scroll to bottom (default: true)
- `showDateSeparators?` (boolean): Show date separators (default: true)
- `groupMessages?` (boolean): Group consecutive messages (default: true)
- `isLoadingOlder?` (boolean): Show loading indicator for older messages
- `isLoadingNewer?` (boolean): Show loading indicator for newer messages
- `emptyState?` (ReactNode): Custom empty state component
- `onLoadOlder?` (function): Load older messages handler
- `onLoadNewer?` (function): Load newer messages handler
- `onAction?` (function): Message action handler
- `onReplyClick?` (function): Reply handler

---

### RichMarkdown

Enhanced markdown renderer with GitHub Flavored Markdown support, syntax highlighting, and XSS protection.

**Features:**
- GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks, footnotes)
- Syntax highlighting for code blocks (100+ languages)
- XSS protection with HTML sanitization
- External links open in new tab
- Lazy-loading images
- Custom component overrides
- Theme support (light/dark)
- Click handlers for links and images
- Fully accessible

**Usage:**
```tsx
import { RichMarkdown } from '@/components/rich-messages';

<RichMarkdown
  content="# Hello World\n\nThis is **markdown** with `code`"
  theme="dark"
  onLinkClick={(url) => console.log('Link clicked:', url)}
/>
```

**Props:**
- `content` (string | null): Markdown content to render
- `className?` (string): Additional CSS classes
- `theme?` ('light' | 'dark'): Theme (default: 'light')
- `allowHTML?` (boolean): Allow raw HTML (default: false, sanitized)
- `components?` (Partial<Components>): Custom component overrides
- `onLinkClick?` (function): Link click handler
- `onImageClick?` (function): Image click handler

**Supported Markdown:**
- Headings (h1-h6)
- Bold, italic, strikethrough
- Lists (ordered, unordered, task lists)
- Links (auto-linked URLs)
- Images (lazy-loaded)
- Code blocks (syntax highlighted)
- Inline code
- Blockquotes
- Tables
- Horizontal rules
- Footnotes

---

## Message Components

All message component types from ONEK-93 are supported:

- **TextComponent**: Plain or markdown text
- **QuoteCardComponent**: Single flight quote display
- **QuoteComparisonComponent**: Multiple quote comparison
- **WorkflowStatusComponent**: Workflow progress indicator
- **ProposalPreviewComponent**: Proposal summary
- **ActionButtonsComponent**: Inline quick reply buttons
- **FormFieldComponent**: Inline form inputs
- **FileAttachmentComponent**: File display and download
- **ProgressIndicatorComponent**: Loading/progress states

See `components/message-components/types.ts` for full type definitions.

---

## Integration Example

```tsx
import { MessageList, Message } from '@/components/rich-messages';
import { useRFPFlow } from '@/hooks/use-rfp-flow';

function ChatInterface() {
  const { state, sendMessage } = useRFPFlow();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleAction = (action: string, data: unknown) => {
    if (action === 'button_action') {
      sendMessage(data.value as string);
    }
  };

  return (
    <MessageList
      messages={messages}
      autoScroll
      showDateSeparators
      onAction={handleAction}
      onReplyClick={(id) => console.log('Reply to:', id)}
    />
  );
}
```

---

## Performance Optimization

### Virtualization
- Automatically enabled for lists with >50 messages
- Only renders visible messages
- Smooth scrolling with momentum
- Reduces DOM nodes for better performance

### Memoization
- All components use `React.memo`
- Message components only re-render when props change
- Optimized for frequent message additions

### Best Practices
1. Use stable keys for messages (use message ID)
2. Avoid inline functions in render (use `useCallback`)
3. Keep message components small and focused
4. Use virtualization for lists >50 messages

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Semantic HTML elements (`<article>`, `<time>`, etc.)
- ARIA labels and live regions
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus management

---

## Dependencies

- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `rehype-highlight` - Syntax highlighting
- `rehype-sanitize` - XSS protection
- `react-virtuoso` - List virtualization
- `date-fns` - Date formatting
- `lucide-react` - Icons

---

## Related Components

- `components/message-components/` - Individual message component types
- `components/rfp-flow-card.tsx` - RFP progress card
- `hooks/use-rfp-flow.ts` - RFP conversation hook

---

## Testing

Comprehensive test suite with 84 test cases:
- `__tests__/unit/components/message-bubble.test.tsx` (31 tests)
- `__tests__/unit/components/message-list.test.tsx` (22 tests)
- `__tests__/unit/components/rich-markdown.test.tsx` (31 tests)

Run tests:
```bash
npm run test:unit -- message-bubble
npm run test:unit -- message-list
npm run test:unit -- rich-markdown
```

---

## Type Safety

All components are fully typed with TypeScript strict mode:

```typescript
import type { Message, MessageComponent } from '@/components/rich-messages';

const message: Message = {
  id: 'msg-1',
  role: 'agent',
  timestamp: new Date(),
  components: [
    { type: 'text', content: 'Hello!' }
  ]
};
```

---

## Related Stories

- ONEK-93: Message Component System
- ONEK-95: Conversational RFP Flow
- ONEK-96: Rich Message Renderer (this implementation)
