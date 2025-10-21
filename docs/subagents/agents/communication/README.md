# Communication Manager Agent

**Agent Type**: Communication / Content Generation
**Model**: GPT-5
**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

The Communication Manager Agent generates personalized emails for clients using GPT-5. It creates professional, contextual communication including proposal presentations, follow-ups, and status updates via the Gmail MCP server.

### Responsibilities

- **Email Generation**: Create personalized, professional emails
- **Proposal Presentation**: Format quotes into client-friendly proposals
- **Follow-up Management**: Track and send follow-up communications
- **Template Management**: Use and adapt email templates
- **Tone Customization**: Adjust tone based on client relationship

---

## 🛠️ Implementation

### Email Generation

```typescript
async generateProposalEmail(
  client: ClientProfile,
  topQuotes: Quote[],
  analysis: ProposalAnalysis
): Promise<EmailContent> {
  const session = await this.agent.run({
    context: {
      clientName: client.name,
      vipStatus: client.vipStatus,
      topQuotes,
      analysis,
    },
    prompt: `Generate a professional email presenting the top flight options.
    
Include:
1. Personalized greeting
2. Summary of client's request
3. Top 3 recommended options with key details
4. Why each option is recommended
5. Next steps for booking
6. Professional closing

Tone: ${client.vipStatus === 'ultra_vip' ? 'Premium, exclusive' : 'Professional, friendly'}`,
  })

  return session.getContent()
}
```

### Gmail MCP Integration

```typescript
await mcpClient.callTool('gmail', {
  tool: 'send_email',
  arguments: {
    to: client.email,
    subject: `Your Private Jet Options: ${route}`,
    body: emailContent,
    attachments: [proposalPDF],
  },
})
```

---

## 🎯 Best Practices

1. **Personalize**: Use client name, history, and preferences
2. **Be Concise**: Get to the point while being thorough
3. **Professional**: Maintain brand voice and quality
4. **Call to Action**: Clear next steps for client

---

## 📚 Related Documentation

- [Proposal Analysis Agent](../proposal-analysis/README.md)
- [Gmail MCP Server](../../technology-stack/supporting-services/README.md#gmail)
- [OpenAI Agents SDK](../../technology-stack/openai-agents/README.md)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
