import { describe, it, expect } from 'vitest';

describe('ProposalDocument branding', () => {
  it('should export ProposalDocument component', async () => {
    const { ProposalDocument } = await import('@/lib/pdf/proposal-template');
    expect(ProposalDocument).toBeDefined();
    expect(typeof ProposalDocument).toBe('function');
  });

  it('should export BRAND_COLORS constant', async () => {
    const { BRAND_COLORS } = await import('@/lib/pdf/proposal-template');
    expect(BRAND_COLORS).toBeDefined();
    expect(BRAND_COLORS.headerBg).toBe('#0a1628');
    expect(BRAND_COLORS.footerBg).toBe('#0a1628');
    expect(BRAND_COLORS.accent).toBe('#00a8e8');
    expect(BRAND_COLORS.headerText).toBe('#ffffff');
    expect(BRAND_COLORS.footerText).toBe('#94a3b8');
    expect(BRAND_COLORS.gold).toBe('#d4af37');
  });
});
