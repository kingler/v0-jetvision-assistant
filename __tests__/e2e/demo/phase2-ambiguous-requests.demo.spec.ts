import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForAssistantReply,
  waitForComponent,
  captureScreenshot,
  demoPause,
  assertNotVisible,
} from './helpers';

/**
 * Phase 2: Ambiguous Request Scenarios (4-6)
 *
 * Records demo videos of the clarification flow when users
 * submit vague flight requests. Verifies the agent asks
 * clarifying questions and does NOT create a trip prematurely.
 */
test.describe('Phase 2: Ambiguous Requests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await navigateToChat(page);
    await demoPause(page);
  });

  test('Scenario 4: Ambiguous — tomorrow to Canada', async ({ page }) => {
    test.setTimeout(120_000);

    await captureScreenshot(page, '01-chat-ready', 'ambiguous');

    // Send vague request
    await sendChatMessage(
      page,
      'Book a flight for tomorrow for three people from New York to Canada'
    );

    // Wait for agent clarification response
    await waitForAssistantReply(page);
    await demoPause(page);
    await captureScreenshot(page, '02-scenario4-clarification', 'ambiguous');

    // CRITICAL: TripRequestCard must NOT render yet
    await assertNotVisible(page, '[data-testid="trip-request-card"]');

    // Respond to clarification questions
    await sendChatMessage(
      page,
      'Teterboro (KTEB) to Toronto Pearson (CYYZ), departing at 10:00am, one way'
    );

    // Wait for trip creation after clarification
    try {
      await waitForComponent(
        page,
        '[data-testid="trip-request-card"]',
        60_000
      );
      await demoPause(page);
      await captureScreenshot(page, '03-scenario4-resolved', 'ambiguous');
    } catch {
      // Agent may need more rounds of clarification
      await waitForAssistantReply(page);
      await captureScreenshot(page, '03-scenario4-followup', 'ambiguous');
    }
  });

  test('Scenario 5: Ambiguous — Florida to California', async ({ page }) => {
    test.setTimeout(120_000);

    // Send vague request
    await sendChatMessage(
      page,
      'I need a flight from Florida to California tomorrow'
    );

    // Wait for agent clarification
    await waitForAssistantReply(page);
    await demoPause(page);
    await captureScreenshot(page, '04-scenario5-clarification', 'ambiguous');

    // CRITICAL: No premature trip creation
    await assertNotVisible(page, '[data-testid="trip-request-card"]');

    // Respond with specifics
    await sendChatMessage(
      page,
      'Opa-locka (KOPF) to Van Nuys (KVNY), 2 passengers, one way, 2:00pm'
    );

    try {
      await waitForComponent(
        page,
        '[data-testid="trip-request-card"]',
        60_000
      );
      await demoPause(page);
      await captureScreenshot(page, '05-scenario5-resolved', 'ambiguous');
    } catch {
      await waitForAssistantReply(page);
      await captureScreenshot(page, '05-scenario5-followup', 'ambiguous');
    }
  });

  test('Scenario 6: Ambiguous — round trip vague date', async ({ page }) => {
    test.setTimeout(120_000);

    // Send vague request
    await sendChatMessage(
      page,
      'I need a round trip flight from New York to Kansas for 4 passengers in March'
    );

    // Wait for agent clarification
    await waitForAssistantReply(page);
    await demoPause(page);
    await captureScreenshot(page, '06-scenario6-clarification', 'ambiguous');

    // CRITICAL: No premature trip creation
    await assertNotVisible(page, '[data-testid="trip-request-card"]');

    // Respond with specifics
    await sendChatMessage(
      page,
      'Teterboro (KTEB) to Kansas City (KMCI), March 15, 2026 at 9:00am, return March 18 at 3:00pm'
    );

    try {
      await waitForComponent(
        page,
        '[data-testid="trip-request-card"]',
        60_000
      );
      await demoPause(page);
      await captureScreenshot(page, '07-scenario6-resolved', 'ambiguous');
    } catch {
      await waitForAssistantReply(page);
      await captureScreenshot(page, '07-scenario6-followup', 'ambiguous');
    }
  });
});
