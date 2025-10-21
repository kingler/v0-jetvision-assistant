# Error Monitoring Agent

**Agent Type**: Monitoring / Recovery
**Model**: GPT-5
**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

The Error Monitoring Agent provides intelligent error detection, logging, and recovery. It integrates with Sentry for error tracking and uses GPT-5 to suggest recovery strategies.

### Responsibilities

- **Error Detection**: Monitor for errors across all agents
- **Intelligent Logging**: Categorize and prioritize errors
- **Recovery Strategies**: Suggest and implement recovery actions
- **Alert Management**: Notify developers of critical errors
- **Pattern Analysis**: Identify recurring issues

---

## 🛠️ Implementation

### Error Handler

```typescript
async handleError(
  error: Error,
  context: ErrorContext
): Promise<RecoveryStrategy> {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: {
      agent: context.agentName,
      requestId: context.requestId,
    },
    extra: context.metadata,
  })

  // Analyze error with GPT-5
  const strategy = await this.agent.run({
    context: { error, context },
    prompt: `Analyze this error and suggest recovery strategy:
    
Error: ${error.message}
Agent: ${context.agentName}
Context: ${JSON.stringify(context)}

Suggest:
1. Is this recoverable?
2. What recovery action to take?
3. Should we retry? How many times?
4. Should we alert developers?`,
  })

  return strategy
}
```

### Recovery Actions

```typescript
async executeRecovery(strategy: RecoveryStrategy) {
  if (strategy.action === 'retry') {
    await this.scheduleRetry(strategy.requestId, strategy.retryDelay)
  } else if (strategy.action === 'fallback') {
    await this.useFallbackMethod(strategy.requestId)
  } else if (strategy.action === 'alert') {
    await this.alertDevelopers(strategy)
  }
}
```

---

## 🎯 Best Practices

1. **Categorize Errors**: Distinguish between transient and permanent errors
2. **Smart Retries**: Exponential backoff, max retry limits
3. **Preserve Context**: Include full error context in logs
4. **Alert Wisely**: Only alert for critical, actionable errors

---

## 📚 Related Documentation

- [Integration Patterns](../../guides/integration-patterns.md)
- [Best Practices](../../guides/best-practices.md)
- [Sentry Setup](../../technology-stack/supporting-services/README.md#sentry)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
