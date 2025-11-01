/**
 * @file Verification test for ChatKit React package installation
 * @description Ensures @openai/chatkit-react is properly installed with TypeScript types
 *
 * ONEK-84: Install ChatKit Dependencies
 *
 * This test verifies:
 * 1. Package can be imported
 * 2. TypeScript types are available
 * 3. Main exports exist and have correct types
 * 4. Peer dependencies are satisfied
 */

import { describe, it, expect } from 'vitest';

describe('ChatKit Installation Verification (ONEK-84)', () => {
  describe('Package Import', () => {
    it('should be able to import @openai/chatkit-react package', async () => {
      // This will fail if the package is not installed
      const chatkitModule = await import('@openai/chatkit-react');
      expect(chatkitModule).toBeDefined();
    });

    it('should be able to import @openai/chatkit core package', async () => {
      const chatkitCore = await import('@openai/chatkit');
      expect(chatkitCore).toBeDefined();
    });
  });

  describe('Main Exports', () => {
    it('should export ChatKit component', async () => {
      const { ChatKit } = await import('@openai/chatkit-react');
      expect(ChatKit).toBeDefined();
      expect(typeof ChatKit).toBe('function');
    });

    it('should export useChatKit hook', async () => {
      const { useChatKit } = await import('@openai/chatkit-react');
      expect(useChatKit).toBeDefined();
      expect(typeof useChatKit).toBe('function');
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should have TypeScript types available for ChatKit component', async () => {
      // This test verifies TypeScript compilation
      // If types are missing, TypeScript compilation would fail

      type ChatKitImport = typeof import('@openai/chatkit-react');

      // Verify the module type is defined
      const moduleType: ChatKitImport = await import('@openai/chatkit-react');
      expect(moduleType).toBeDefined();
    });

    it('should have TypeScript types for useChatKit hook', async () => {
      const { useChatKit } = await import('@openai/chatkit-react');

      // Type guard to verify it's a function
      const isFunction = (fn: unknown): fn is (...args: any[]) => any => {
        return typeof fn === 'function';
      };

      expect(isFunction(useChatKit)).toBe(true);
    });

    it('should have TypeScript types for ChatKitControl', async () => {
      // This will fail TypeScript compilation if ChatKitControl type is not exported
      type ChatKitControl = import('@openai/chatkit-react').ChatKitControl;

      // Verify the type exists (will fail at compile time if not)
      const controlTypeCheck: ChatKitControl | undefined = undefined;
      expect(controlTypeCheck).toBeUndefined(); // Just verifying type exists
    });
  });

  describe('Package Version', () => {
    it('should have correct package version installed', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require('../../../node_modules/@openai/chatkit-react/package.json');

      expect(packageJson.name).toBe('@openai/chatkit-react');
      expect(packageJson.version).toBe('1.2.0');
    });

    it('should have peer dependency @openai/chatkit installed', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require('../../../node_modules/@openai/chatkit/package.json');

      expect(packageJson.name).toBe('@openai/chatkit');
      expect(packageJson.version).toBe('1.0.1');
    });
  });

  describe('React Compatibility', () => {
    it('should be compatible with React 18', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const reactPackage = require('../../../package.json');
      const reactVersion = reactPackage.dependencies.react;

      // Verify React 18.x is installed
      expect(reactVersion).toMatch(/\^18\./);
    });
  });
});
