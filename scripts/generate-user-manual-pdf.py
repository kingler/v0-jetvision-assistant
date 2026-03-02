#!/usr/bin/env python3
"""
Generate the Jetvision AI Assistant User Manual as a branded PDF.

Usage:
    python scripts/generate-user-manual-pdf.py
    python scripts/generate-user-manual-pdf.py --output docs/communication/JETVISION-USER-MANUAL.pdf
    python scripts/generate-user-manual-pdf.py --skip-screenshots

Requires:
    pip install reportlab Pillow
"""

import argparse
import os
import sys
from datetime import date
from pathlib import Path

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Image,
        Table, TableStyle, PageBreak, KeepTogether,
        HRFlowable, ListFlowable, ListItem,
    )
    from reportlab.platypus.tableofcontents import TableOfContents
except ImportError:
    print("Missing required packages. Install with:")
    print("  pip install reportlab Pillow")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Brand colors
# ---------------------------------------------------------------------------
SLATE_900 = HexColor('#0F172A')
SLATE_700 = HexColor('#334155')
SLATE_600 = HexColor('#475569')
SLATE_400 = HexColor('#94A3B8')
SLATE_200 = HexColor('#E2E8F0')
SLATE_100 = HexColor('#F1F5F9')
SLATE_50 = HexColor('#F8FAFC')
BLUE_500 = HexColor('#3B82F6')
EMERALD_500 = HexColor('#10B981')
AMBER_500 = HexColor('#F59E0B')
BODY_COLOR = HexColor('#1E293B')

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = PROJECT_ROOT / 'docs' / 'manual-screenshots'
DEFAULT_OUTPUT = PROJECT_ROOT / 'docs' / 'communication' / 'JETVISION-USER-MANUAL.pdf'

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------

def build_styles():
    """Create custom paragraph styles for the manual."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontSize=32,
        textColor=SLATE_900,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Title'],
        fontSize=18,
        textColor=SLATE_700,
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName='Helvetica',
    ))
    styles.add(ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontSize=12,
        textColor=SLATE_600,
        alignment=TA_CENTER,
        spaceAfter=4,
        fontName='Helvetica',
    ))
    styles.add(ParagraphStyle(
        'ManualH1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=SLATE_900,
        fontName='Helvetica-Bold',
        spaceBefore=28,
        spaceAfter=12,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'ManualH2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=SLATE_700,
        fontName='Helvetica-Bold',
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'ManualH3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=SLATE_700,
        fontName='Helvetica-Bold',
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'ManualBody',
        parent=styles['Normal'],
        fontSize=11,
        leading=15.4,
        textColor=BODY_COLOR,
        fontName='Helvetica',
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        'ManualCode',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Courier',
        backColor=SLATE_100,
        borderColor=SLATE_200,
        borderWidth=1,
        borderPadding=8,
        spaceBefore=6,
        spaceAfter=6,
        leading=12,
        textColor=BODY_COLOR,
    ))
    styles.add(ParagraphStyle(
        'ManualNote',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Oblique',
        textColor=SLATE_600,
        leftIndent=18,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        'Caption',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Oblique',
        textColor=SLATE_400,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        'TOCEntry',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica',
        textColor=BLUE_500,
        spaceBefore=4,
        spaceAfter=4,
        leftIndent=12,
    ))
    styles.add(ParagraphStyle(
        'FooterLeft',
        parent=styles['Normal'],
        fontSize=8,
        textColor=SLATE_400,
        fontName='Helvetica',
    ))
    styles.add(ParagraphStyle(
        'FooterRight',
        parent=styles['Normal'],
        fontSize=8,
        textColor=SLATE_400,
        fontName='Helvetica',
        alignment=TA_RIGHT,
    ))

    return styles


# ---------------------------------------------------------------------------
# Header / Footer
# ---------------------------------------------------------------------------

def header_footer(canvas, doc):
    """Draw header and footer on every page (except cover)."""
    canvas.saveState()
    page_num = doc.page

    if page_num > 1:
        # Header
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(SLATE_400)
        canvas.drawRightString(
            letter[0] - 72, letter[1] - 50,
            'Jetvision AI Assistant — User Manual'
        )
        canvas.setStrokeColor(SLATE_200)
        canvas.setLineWidth(0.5)
        canvas.line(72, letter[1] - 55, letter[0] - 72, letter[1] - 55)

        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(SLATE_400)
        canvas.drawString(72, 40, 'Confidential — One Kaleidoscope')
        canvas.drawRightString(letter[0] - 72, 40, f'Page {page_num}')
        canvas.setStrokeColor(SLATE_200)
        canvas.setLineWidth(0.5)
        canvas.line(72, 52, letter[0] - 72, 52)

    canvas.restoreState()


# ---------------------------------------------------------------------------
# Helper: tables
# ---------------------------------------------------------------------------

TABLE_STYLE = TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), SLATE_900),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('TEXTCOLOR', (0, 1), (-1, -1), BODY_COLOR),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, SLATE_50]),
    ('GRID', (0, 0), (-1, -1), 0.5, SLATE_200),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
])


def make_table(headers, rows, col_widths=None):
    """Build a styled Table flowable."""
    data = [headers] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TABLE_STYLE)
    return t


# ---------------------------------------------------------------------------
# Helper: screenshots
# ---------------------------------------------------------------------------

def maybe_screenshot(story, styles, rel_path, caption, skip_screenshots):
    """Add a screenshot image if the file exists, else a placeholder note."""
    if skip_screenshots:
        story.append(Paragraph(f'<i>[Screenshot: {caption}]</i>', styles['ManualNote']))
        return

    full_path = PROJECT_ROOT / rel_path
    if full_path.exists():
        # Scale to max 6.5" width, maintain aspect ratio
        try:
            from PIL import Image as PILImage
            with PILImage.open(full_path) as img:
                w, h = img.size
            max_w = 6.5 * inch
            scale = min(max_w / w, 1.0)
            img_w = w * scale
            img_h = h * scale
            # Cap height at 4.5"
            if img_h > 4.5 * inch:
                img_h = 4.5 * inch
                img_w = img_h * (w / h)
        except Exception:
            img_w = 6.5 * inch
            img_h = 4.0 * inch

        img_flowable = Image(str(full_path), width=img_w, height=img_h)
        story.append(img_flowable)
        story.append(Paragraph(caption, styles['Caption']))
    else:
        story.append(Paragraph(
            f'<i>[Screenshot not captured yet: {rel_path}]</i>',
            styles['ManualNote'],
        ))


# ---------------------------------------------------------------------------
# Content sections
# ---------------------------------------------------------------------------

def add_cover_page(story, styles):
    """Section 0: Cover page."""
    story.append(Spacer(1, 2.0 * inch))
    story.append(Paragraph('Jetvision AI Assistant', styles['CoverTitle']))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph('User Manual &amp; Account Setup Guide', styles['CoverSubtitle']))
    story.append(Spacer(1, 0.4 * inch))

    # Blue accent bar
    story.append(HRFlowable(
        width='60%', thickness=3, color=BLUE_500,
        spaceBefore=10, spaceAfter=20,
    ))

    story.append(Paragraph(f'Version 1.0', styles['CoverMeta']))
    story.append(Paragraph(f'Last Updated: {date.today().strftime("%B %d, %Y")}', styles['CoverMeta']))
    story.append(Paragraph('Prepared by: One Kaleidoscope Development Team', styles['CoverMeta']))
    story.append(Spacer(1, 0.8 * inch))
    story.append(Paragraph('CONFIDENTIAL', styles['CoverMeta']))
    story.append(PageBreak())


def add_toc(story, styles):
    """Section: Table of Contents."""
    story.append(Paragraph('Table of Contents', styles['ManualH1']))
    story.append(Spacer(1, 0.1 * inch))

    toc_items = [
        ('1', 'Application Overview'),
        ('2', 'Account Setup Requirements'),
        ('3', 'Supabase (Database)'),
        ('4', 'Clerk (Authentication)'),
        ('5', 'LLM API Keys'),
        ('6', 'Google Cloud Workspace API'),
        ('7', 'Vercel (Hosting)'),
        ('8', 'Environment Variables Reference'),
        ('9', 'Application States Reference'),
        ('10', 'Troubleshooting'),
    ]
    for num, title in toc_items:
        story.append(Paragraph(f'{num}. {title}', styles['TOCEntry']))

    story.append(PageBreak())


def add_section_1(story, styles, skip_screenshots):
    """Section 1: Application Overview."""
    story.append(Paragraph('1. Application Overview', styles['ManualH1']))
    story.append(Paragraph(
        'Jetvision is an AI-powered charter flight management platform that automates '
        'the RFP-to-close lifecycle for ISO agents (Independent Sales Organizations) '
        'in the private aviation industry.',
        styles['ManualBody'],
    ))

    story.append(Paragraph('Core Capabilities', styles['ManualH2']))
    capabilities = [
        'Natural language flight request processing',
        'Avinode Marketplace integration (deep links, RFQ, quotes)',
        'Automated proposal and contract generation (PDF + email)',
        'Payment tracking and deal lifecycle management',
        'Multi-city, round-trip, and one-way trip support',
    ]
    items = [ListItem(Paragraph(c, styles['ManualBody'])) for c in capabilities]
    story.append(ListFlowable(items, bulletType='bullet', start='bulletchar'))
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph('Technology Stack', styles['ManualH2']))
    stack_data = [
        ['Frontend', 'Next.js 14, React, TypeScript, Tailwind CSS'],
        ['Backend', 'Next.js API Routes, OpenAI Agent SDK'],
        ['Database', 'Supabase (PostgreSQL + Storage)'],
        ['Authentication', 'Clerk'],
        ['AI / LLM', 'OpenAI GPT-4, Anthropic Claude, Google Gemini'],
        ['Email', 'Gmail API (OAuth2)'],
        ['File Storage', 'Google Drive API, Supabase Storage'],
        ['Hosting', 'Vercel'],
        ['Aviation API', 'Avinode Marketplace API'],
    ]
    story.append(make_table(['Layer', 'Technology'], stack_data, col_widths=[1.5 * inch, 5.0 * inch]))
    story.append(Spacer(1, 0.15 * inch))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/auth/03-home-authenticated.png',
                     'Figure 1: Jetvision main interface after sign-in', skip_screenshots)
    story.append(PageBreak())


def add_section_2(story, styles):
    """Section 2: Account Setup Requirements."""
    story.append(Paragraph('2. Account Setup Requirements', styles['ManualH1']))
    story.append(Paragraph(
        'The following accounts are required to run Jetvision in production. '
        'Complete them in the order listed to avoid dependency issues.',
        styles['ManualBody'],
    ))

    story.append(Paragraph('Accounts Checklist', styles['ManualH2']))
    accts = [
        ['1', 'Supabase', 'Database, storage, real-time', 'Yes'],
        ['2', 'Clerk', 'User authentication (Google OAuth, email)', 'Yes'],
        ['3', 'OpenAI', 'Primary LLM (GPT-4 Turbo)', 'Yes'],
        ['4', 'Anthropic', 'Secondary LLM (Claude)', 'Optional'],
        ['5', 'Google AI', 'Tertiary LLM (Gemini)', 'Optional'],
        ['6', 'Google Cloud', 'Gmail API + Drive API + Slides API', 'Yes'],
        ['7', 'Vercel', 'Production hosting', 'Yes'],
        ['8', 'Avinode', 'Aviation marketplace API', 'Yes (provided)'],
    ]
    story.append(make_table(['#', 'Account', 'Purpose', 'Required'], accts,
                            col_widths=[0.4 * inch, 1.2 * inch, 3.2 * inch, 1.2 * inch]))

    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph('Setup Order', styles['ManualH2']))
    order = [
        'Supabase (database must exist before app starts)',
        'Clerk (auth must be configured for sign-in)',
        'Google Cloud (Gmail + Drive for email and file ops)',
        'LLM API keys (at minimum OpenAI)',
        'Vercel (deploy after all env vars are ready)',
    ]
    for i, step in enumerate(order, 1):
        story.append(Paragraph(f'{i}. {step}', styles['ManualBody']))
    story.append(PageBreak())


def add_section_3(story, styles, skip_screenshots):
    """Section 3: Supabase."""
    story.append(Paragraph('3. Supabase (Database)', styles['ManualH1']))
    story.append(Paragraph('What It Provides', styles['ManualH2']))
    provides = [
        'PostgreSQL database for all CRM data (clients, requests, quotes, proposals, contracts)',
        'Row Level Security (RLS) for data isolation',
        'Supabase Storage for PDF files (proposals, contracts)',
        'Real-time subscriptions for webhook events',
    ]
    items = [ListItem(Paragraph(p, styles['ManualBody'])) for p in provides]
    story.append(ListFlowable(items, bulletType='bullet', start='bulletchar'))

    story.append(Paragraph('Setup Instructions', styles['ManualH2']))

    # Step 1
    story.append(Paragraph('Step 1: Create a Supabase Project', styles['ManualH3']))
    steps = [
        'Go to <b>https://supabase.com</b> and sign up / log in',
        'Click <b>"New Project"</b>',
        'Select your organization (or create one)',
        'Enter project details: Name: <b>jetvision-production</b>, generate a strong database password, select region closest to your users',
        'Click <b>"Create new project"</b> and wait ~2 minutes for provisioning',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/01-supabase-dashboard.png',
                     'Figure 2: Supabase Dashboard — New Project form', skip_screenshots)

    # Step 2
    story.append(Paragraph('Step 2: Get API Keys', styles['ManualH3']))
    steps = [
        'Go to <b>Settings &gt; API</b> in the Supabase dashboard',
        'Copy these values:',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))
    keys = [
        ['Project URL', 'https://<project-id>.supabase.co'],
        ['anon (public) key', 'Used in frontend code'],
        ['service_role key', 'Used in backend/server code (KEEP SECRET)'],
    ]
    story.append(make_table(['Key', 'Description'], keys, col_widths=[2.0 * inch, 4.0 * inch]))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/02-supabase-api-keys.png',
                     'Figure 3: Supabase Settings > API page showing URL and keys', skip_screenshots)

    # Step 3
    story.append(Paragraph('Step 3: Run Database Migrations', styles['ManualH3']))
    story.append(Paragraph('Install Supabase CLI, link to your project, and push migrations:', styles['ManualBody']))
    story.append(Paragraph(
        'npm install -g supabase<br/>'
        'supabase link --project-ref &lt;project-id&gt;<br/>'
        'supabase db push',
        styles['ManualCode'],
    ))
    story.append(Paragraph(
        'Migrations are located in <b>supabase/migrations/</b> and numbered sequentially (001 through 040+).',
        styles['ManualBody'],
    ))

    # Step 4
    story.append(Paragraph('Step 4: Create Storage Buckets', styles['ManualH3']))
    steps = [
        'Go to <b>Storage</b> in Supabase dashboard',
        'Create buckets: <b>proposals</b> (public read) and <b>contracts</b> (public read)',
        'Set bucket policies to allow authenticated uploads',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 5
    story.append(Paragraph('Step 5: Enable Row Level Security', styles['ManualH3']))
    story.append(Paragraph(
        'RLS is already configured in migrations. Verify in <b>Table Editor &gt; any table &gt; RLS tab</b>.',
        styles['ManualBody'],
    ))

    # Env vars
    story.append(Paragraph('Environment Variables', styles['ManualH3']))
    story.append(Paragraph(
        'NEXT_PUBLIC_SUPABASE_URL=https://&lt;project-id&gt;.supabase.co<br/>'
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...<br/>'
        'SUPABASE_SERVICE_ROLE_KEY=eyJ...',
        styles['ManualCode'],
    ))
    story.append(PageBreak())


def add_section_4(story, styles, skip_screenshots):
    """Section 4: Clerk (Authentication)."""
    story.append(Paragraph('4. Clerk (Authentication)', styles['ManualH1']))
    story.append(Paragraph('What It Provides', styles['ManualH2']))
    provides = [
        'Google OAuth sign-in for ISO agents',
        'Session management and JWT tokens',
        'User metadata and profile management',
        'Webhook events for user lifecycle',
    ]
    items = [ListItem(Paragraph(p, styles['ManualBody'])) for p in provides]
    story.append(ListFlowable(items, bulletType='bullet', start='bulletchar'))

    story.append(Paragraph('Setup Instructions', styles['ManualH2']))

    # Step 1
    story.append(Paragraph('Step 1: Create a Clerk Application', styles['ManualH3']))
    steps = [
        'Go to <b>https://clerk.com</b> and sign up / log in',
        'Click <b>"Add Application"</b>',
        'Name: <b>Jetvision</b>',
        'Enable sign-in methods: <b>Google</b> (primary) and <b>Email</b> (fallback)',
        'Click <b>"Create Application"</b>',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/03-clerk-dashboard.png',
                     'Figure 4: Clerk Dashboard — Create Application', skip_screenshots)

    # Step 2
    story.append(Paragraph('Step 2: Configure Google OAuth in Clerk', styles['ManualH3']))
    steps = [
        'Go to <b>User &amp; Authentication &gt; Social Connections &gt; Google</b>',
        'Enter your Google OAuth Client ID and Client Secret (from Section 6)',
        'Set authorized redirect URI to: <b>https://&lt;your-clerk-domain&gt;/v1/oauth_callback</b>',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 3
    story.append(Paragraph('Step 3: Get API Keys', styles['ManualH3']))
    steps = [
        'Go to <b>Developers &gt; API Keys</b>',
        'Copy <b>Publishable Key</b> (pk_test_... or pk_live_...) and <b>Secret Key</b> (sk_test_... or sk_live_...)',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/04-clerk-api-keys.png',
                     'Figure 5: Clerk Developers > API Keys', skip_screenshots)

    # Step 4
    story.append(Paragraph('Step 4: Configure Webhook (Optional)', styles['ManualH3']))
    steps = [
        'Go to <b>Webhooks</b> in Clerk dashboard',
        'Add endpoint: <b>https://&lt;your-domain&gt;/api/webhooks/clerk</b>',
        'Select events: user.created, user.updated, session.created',
        'Copy the signing secret',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 5
    story.append(Paragraph('Step 5: Set Up Test User', styles['ManualH3']))
    story.append(Paragraph(
        'For E2E testing, create a test user in <b>Users</b> with known credentials. '
        'Store as E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local.',
        styles['ManualBody'],
    ))

    # Env vars
    story.append(Paragraph('Environment Variables', styles['ManualH3']))
    story.append(Paragraph(
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...<br/>'
        'CLERK_SECRET_KEY=sk_test_...<br/>'
        'CLERK_WEBHOOK_SECRET=whsec_... (optional)<br/>'
        'E2E_CLERK_USER_USERNAME=test@example.com (for testing)<br/>'
        'E2E_CLERK_USER_PASSWORD=... (for testing)',
        styles['ManualCode'],
    ))
    story.append(PageBreak())


def add_section_5(story, styles, skip_screenshots):
    """Section 5: LLM API Keys."""
    story.append(Paragraph('5. LLM API Keys', styles['ManualH1']))

    # 5a: OpenAI
    story.append(Paragraph('5a. OpenAI (Required — Primary LLM)', styles['ManualH2']))
    story.append(Paragraph(
        'GPT-4 Turbo powers natural language processing, flight request parsing, '
        'proposal generation, and conversational AI.',
        styles['ManualBody'],
    ))
    story.append(Paragraph('Setup:', styles['ManualH3']))
    steps = [
        'Go to <b>https://platform.openai.com</b> and sign up / log in',
        'Navigate to <b>API Keys</b> (platform.openai.com/api-keys)',
        'Click <b>"Create new secret key"</b>, name it <b>jetvision-production</b>',
        'Copy the key immediately (shown only once)',
        'Go to <b>Settings &gt; Organization</b> and copy the Organization ID',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/05-openai-keys.png',
                     'Figure 6: OpenAI Platform > API Keys', skip_screenshots)

    story.append(Paragraph('Billing:', styles['ManualH3']))
    story.append(Paragraph(
        'Go to <b>Settings &gt; Billing</b>, add a payment method, and set usage limits '
        '(recommended: $100/month for production). Enable auto-recharge if desired.',
        styles['ManualBody'],
    ))

    models = [
        ['gpt-4-turbo-preview', 'Primary agent reasoning', '128K tokens'],
        ['gpt-4o', 'Fast responses', '128K tokens'],
        ['gpt-3.5-turbo', 'Fallback / cost optimization', '16K tokens'],
    ]
    story.append(make_table(['Model', 'Purpose', 'Context'], models,
                            col_widths=[2.0 * inch, 2.5 * inch, 1.5 * inch]))

    story.append(Paragraph(
        'OPENAI_API_KEY=sk-...<br/>OPENAI_ORGANIZATION_ID=org-...',
        styles['ManualCode'],
    ))
    story.append(Spacer(1, 0.15 * inch))

    # 5b: Anthropic
    story.append(Paragraph('5b. Anthropic (Optional — Secondary LLM)', styles['ManualH2']))
    story.append(Paragraph(
        'Claude models provide alternative reasoning, code generation, and fallback.',
        styles['ManualBody'],
    ))
    steps = [
        'Go to <b>https://console.anthropic.com</b> and sign up / log in',
        'Navigate to <b>API Keys</b>',
        'Click <b>"Create Key"</b>, name it <b>jetvision-production</b>',
        'Copy the key',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/06-anthropic-console.png',
                     'Figure 7: Anthropic Console > API Keys', skip_screenshots)

    models = [
        ['claude-sonnet-4-6', 'Fast reasoning'],
        ['claude-opus-4-6', 'Complex analysis'],
    ]
    story.append(make_table(['Model', 'Purpose'], models, col_widths=[2.5 * inch, 3.5 * inch]))
    story.append(Paragraph('ANTHROPIC_API_KEY=sk-ant-...', styles['ManualCode']))
    story.append(Spacer(1, 0.15 * inch))

    # 5c: Gemini
    story.append(Paragraph('5c. Google AI / Gemini (Optional — Tertiary LLM)', styles['ManualH2']))
    story.append(Paragraph(
        'Gemini models for multimodal tasks and fallback.',
        styles['ManualBody'],
    ))
    steps = [
        'Go to <b>https://aistudio.google.com</b> and sign in',
        'Click <b>"Get API Key"</b> in the left sidebar',
        'Click <b>"Create API key in new project"</b> (or select existing project)',
        'Copy the generated key',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/07-google-ai-studio.png',
                     'Figure 8: Google AI Studio > API Keys', skip_screenshots)

    models = [
        ['gemini-1.5-pro', 'Multimodal reasoning'],
        ['gemini-1.5-flash', 'Fast responses'],
    ]
    story.append(make_table(['Model', 'Purpose'], models, col_widths=[2.5 * inch, 3.5 * inch]))
    story.append(Paragraph('GOOGLE_AI_API_KEY=AIza...', styles['ManualCode']))
    story.append(PageBreak())


def add_section_6(story, styles, skip_screenshots):
    """Section 6: Google Cloud Workspace API."""
    story.append(Paragraph('6. Google Cloud Workspace API', styles['ManualH1']))
    story.append(Paragraph('What It Provides', styles['ManualH2']))
    provides = [
        '<b>Gmail API:</b> Sending proposal emails, contract emails, project update emails',
        '<b>Drive API:</b> Storing demo videos, generating Google Slides, sharing files',
        '<b>Slides API:</b> Creating demo presentations',
    ]
    items = [ListItem(Paragraph(p, styles['ManualBody'])) for p in provides]
    story.append(ListFlowable(items, bulletType='bullet', start='bulletchar'))

    story.append(Paragraph('Setup Instructions', styles['ManualH2']))

    # Step 1
    story.append(Paragraph('Step 1: Create a Google Cloud Project', styles['ManualH3']))
    steps = [
        'Go to <b>https://console.cloud.google.com</b>',
        'Click the project dropdown (top bar) &gt; <b>"New Project"</b>',
        'Name: <b>jetvision-production</b>',
        'Click <b>"Create"</b> and select the new project',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/08-gcloud-console.png',
                     'Figure 9: Google Cloud Console — APIs & Services', skip_screenshots)

    # Step 2
    story.append(Paragraph('Step 2: Enable APIs', styles['ManualH3']))
    story.append(Paragraph(
        'Go to <b>APIs &amp; Services &gt; Library</b> and enable each:',
        styles['ManualBody'],
    ))
    apis = [
        ['Gmail API', 'Sending emails'],
        ['Google Drive API', 'File storage and sharing'],
        ['Google Slides API', 'Presentation generation'],
    ]
    story.append(make_table(['API', 'Purpose'], apis, col_widths=[2.5 * inch, 3.5 * inch]))

    # Step 3
    story.append(Paragraph('Step 3: Create OAuth 2.0 Credentials', styles['ManualH3']))
    steps = [
        'Go to <b>APIs &amp; Services &gt; Credentials</b>',
        'Click <b>"Create Credentials" &gt; "OAuth client ID"</b>',
        'If prompted, configure the <b>OAuth consent screen</b>: User type External, App name "Jetvision", add scopes for gmail.send, drive.file, presentations',
        'Back to Credentials: Application type <b>Web application</b>, name <b>Jetvision OAuth</b>',
        'Authorized redirect URI: <b>http://localhost:3000/api/auth/google/callback</b>',
        'Click <b>"Create"</b> and copy the Client ID and Client Secret',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 4
    story.append(Paragraph('Step 4: Obtain Refresh Token', styles['ManualH3']))
    story.append(Paragraph('Run the Gmail setup script:', styles['ManualBody']))
    story.append(Paragraph('npm run gmail:setup', styles['ManualCode']))
    story.append(Paragraph(
        'If the script doesn\'t exist, use the <b>OAuth Playground</b> '
        '(developers.google.com/oauthplayground):',
        styles['ManualBody'],
    ))
    steps = [
        'Click gear icon &gt; Check "Use your own OAuth credentials"',
        'Enter your Client ID and Client Secret',
        'Select scopes: gmail.send, drive.file, presentations',
        'Click "Authorize APIs" and consent',
        'Click "Exchange authorization code for tokens"',
        'Copy the <b>Refresh Token</b>',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/09-oauth-playground.png',
                     'Figure 10: Google OAuth Playground — Token exchange', skip_screenshots)

    # Step 5
    story.append(Paragraph('Step 5: Set Up Shared Drive Folder', styles['ManualH3']))
    story.append(Paragraph(
        'Create a Google Drive folder <b>"Jetvision Demo Materials"</b>, share with team, '
        'and copy the URL.',
        styles['ManualBody'],
    ))

    story.append(Paragraph('Environment Variables', styles['ManualH3']))
    story.append(Paragraph(
        'GOOGLE_CLIENT_ID=&lt;client-id&gt;.apps.googleusercontent.com<br/>'
        'GOOGLE_CLIENT_SECRET=GOCSPX-...<br/>'
        'GOOGLE_REFRESH_TOKEN=1//...',
        styles['ManualCode'],
    ))
    story.append(PageBreak())


def add_section_7(story, styles, skip_screenshots):
    """Section 7: Vercel (Hosting)."""
    story.append(Paragraph('7. Vercel (Hosting)', styles['ManualH1']))
    story.append(Paragraph('What It Provides', styles['ManualH2']))
    provides = [
        'Production hosting for the Next.js application',
        'Automatic deployments from GitHub',
        'Serverless functions for API routes',
        'Edge caching and CDN',
        'Environment variable management',
    ]
    items = [ListItem(Paragraph(p, styles['ManualBody'])) for p in provides]
    story.append(ListFlowable(items, bulletType='bullet', start='bulletchar'))

    story.append(Paragraph('Setup Instructions', styles['ManualH2']))

    # Step 1
    story.append(Paragraph('Step 1: Create Vercel Account', styles['ManualH3']))
    story.append(Paragraph(
        'Go to <b>https://vercel.com</b> and sign up with GitHub. Authorize Vercel to access your repositories.',
        styles['ManualBody'],
    ))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/10-vercel-dashboard.png',
                     'Figure 11: Vercel Dashboard — Project overview', skip_screenshots)

    # Step 2
    story.append(Paragraph('Step 2: Import Project', styles['ManualH3']))
    steps = [
        'Click <b>"Add New..." &gt; "Project"</b>',
        'Select the <b>v0-jetvision-assistant</b> repository from GitHub',
        'Configure build settings: Framework Preset <b>Next.js</b>, Build Command <b>npm run build</b>, Output Directory <b>.next</b>',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 3
    story.append(Paragraph('Step 3: Configure Environment Variables', styles['ManualH3']))
    story.append(Paragraph(
        'Go to <b>Settings &gt; Environment Variables</b> and add ALL variables from '
        'Section 8. Set each for Production and Preview scopes.',
        styles['ManualBody'],
    ))

    maybe_screenshot(story, styles, 'docs/manual-screenshots/accounts/11-vercel-env-vars.png',
                     'Figure 12: Vercel Settings > Environment Variables', skip_screenshots)

    # Step 4
    story.append(Paragraph('Step 4: Configure Custom Domain (Optional)', styles['ManualH3']))
    steps = [
        'Go to <b>Settings &gt; Domains</b>',
        'Add your custom domain (e.g., app.jetvisiongroup.com)',
        'Add CNAME record: <b>app</b> → <b>cname.vercel-dns.com</b>',
        'Wait for DNS propagation and SSL certificate',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', styles['ManualBody']))

    # Step 5
    story.append(Paragraph('Step 5: Configure Deployment Settings', styles['ManualH3']))
    story.append(Paragraph(
        'In <b>Settings &gt; General</b>: Production Branch <b>main</b>, '
        'Automatic Deployments <b>enabled</b>, Preview Deployments <b>enabled</b>. '
        'In <b>Settings &gt; Functions</b>: Max Duration <b>60 seconds</b> (for LLM API calls).',
        styles['ManualBody'],
    ))
    story.append(PageBreak())


def add_section_8(story, styles):
    """Section 8: Environment Variables Reference."""
    story.append(Paragraph('8. Environment Variables Reference', styles['ManualH1']))
    story.append(Paragraph(
        'Complete list of all environment variables required for production. '
        'Add these to <b>.env.local</b> for local development and to Vercel for production.',
        styles['ManualBody'],
    ))

    env_vars = [
        ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase project URL', 'Yes'],
        ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon (public) key', 'Yes'],
        ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key', 'Yes'],
        ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'Clerk publishable key', 'Yes'],
        ['CLERK_SECRET_KEY', 'Clerk secret key', 'Yes'],
        ['CLERK_WEBHOOK_SECRET', 'Clerk webhook signing secret', 'No'],
        ['OPENAI_API_KEY', 'OpenAI API key', 'Yes'],
        ['OPENAI_ORGANIZATION_ID', 'OpenAI organization ID', 'Yes'],
        ['ANTHROPIC_API_KEY', 'Anthropic API key', 'No'],
        ['GOOGLE_AI_API_KEY', 'Google AI / Gemini API key', 'No'],
        ['GOOGLE_CLIENT_ID', 'Google OAuth client ID', 'Yes'],
        ['GOOGLE_CLIENT_SECRET', 'Google OAuth client secret', 'Yes'],
        ['GOOGLE_REFRESH_TOKEN', 'Google OAuth refresh token', 'Yes'],
        ['AVINODE_API_URL', 'Avinode API base URL', 'Yes'],
        ['AVINODE_API_KEY', 'Avinode bearer token', 'Yes'],
        ['AVINODE_WEBHOOK_SECRET', 'Avinode webhook secret', 'Yes'],
        ['REDIS_HOST', 'Redis host (default: localhost)', 'No'],
        ['REDIS_PORT', 'Redis port (default: 6379)', 'No'],
        ['NEXT_PUBLIC_ENABLE_MCP_UI', 'Enable MCP UI features', 'No'],
    ]
    story.append(make_table(
        ['Variable', 'Description', 'Required'],
        env_vars,
        col_widths=[2.8 * inch, 2.8 * inch, 0.8 * inch],
    ))

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(
        '<b>Important:</b> Never commit .env.local or .env files to version control. '
        'The .gitignore is already configured to exclude them.',
        styles['ManualBody'],
    ))
    story.append(PageBreak())


def add_section_9(story, styles, skip_screenshots):
    """Section 9: Application States Reference."""
    story.append(Paragraph('9. Application States Reference', styles['ManualH1']))
    story.append(Paragraph(
        'This section documents the key UI states of the Jetvision application, '
        'with screenshots for reference.',
        styles['ManualBody'],
    ))

    # Auth states
    story.append(Paragraph('Authentication States', styles['ManualH2']))
    auth_states = [
        ('docs/manual-screenshots/auth/01-sign-in.png', 'Clerk Sign-In Page — Initial sign-in with Google OAuth button'),
        ('docs/manual-screenshots/auth/02-google-consent.png', 'Google OAuth Consent — Account selection screen'),
        ('docs/manual-screenshots/auth/03-home-authenticated.png', 'Authenticated Home — Main chat interface after sign-in'),
    ]
    for path, caption in auth_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    # Chat states
    story.append(Paragraph('Chat Interface States', styles['ManualH2']))
    chat_states = [
        ('docs/manual-screenshots/chat/01-empty-chat.png', 'Empty Chat — New session with conversation starters'),
        ('docs/manual-screenshots/chat/02-flight-request.png', 'Flight Request Input — User typing a flight request'),
        ('docs/manual-screenshots/chat/03-agent-processing.png', 'Agent Processing — Loading/thinking indicator'),
        ('docs/manual-screenshots/chat/04-agent-response.png', 'Agent Response — Text response with tool call results'),
    ]
    for path, caption in chat_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    story.append(PageBreak())

    # Trip states
    story.append(Paragraph('Trip &amp; Flight States', styles['ManualH2']))
    trip_states = [
        ('docs/manual-screenshots/trips/01-one-way-card.png', 'TripRequestCard (One-Way) — Single-leg trip card with deep link'),
        ('docs/manual-screenshots/trips/02-round-trip-card.png', 'TripRequestCard (Round-Trip) — Two-leg trip card'),
        ('docs/manual-screenshots/trips/03-multi-city-card.png', 'TripRequestCard (Multi-City) — 3+ leg trip card'),
        ('docs/manual-screenshots/trips/04-clarification.png', 'Clarification Flow — Agent asking follow-up questions'),
        ('docs/manual-screenshots/trips/05-search-results.png', 'AvinodeSearchCard — Flight search results'),
        ('docs/manual-screenshots/trips/06-deep-link.png', '"Open in Avinode Marketplace" button'),
    ]
    for path, caption in trip_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    story.append(PageBreak())

    # Avinode states
    story.append(Paragraph('Avinode Integration States', styles['ManualH2']))
    avinode_states = [
        ('docs/manual-screenshots/avinode/01-marketplace.png', 'Avinode Marketplace — Deep link opened in new tab'),
        ('docs/manual-screenshots/avinode/02-rfq-flights.png', 'RFQ Flight List — Available operators and flights'),
        ('docs/manual-screenshots/avinode/03-rfq-sent.png', 'RFQ Sent Confirmation'),
        ('docs/manual-screenshots/avinode/04-quote-received.png', 'Quote Received — RFQFlightCard with pricing'),
    ]
    for path, caption in avinode_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    # Deal states
    story.append(Paragraph('Proposal &amp; Contract States', styles['ManualH2']))
    deal_states = [
        ('docs/manual-screenshots/deals/01-customer-dialog.png', 'CustomerSelectionDialog — Customer picker for proposal'),
        ('docs/manual-screenshots/deals/02-proposal-preview.png', 'ProposalPreview — Email preview before sending'),
        ('docs/manual-screenshots/deals/03-proposal-sent.png', 'ProposalSentConfirmation — Confirmation with PDF link'),
        ('docs/manual-screenshots/deals/04-book-flight.png', 'BookFlightModal — Contract generation modal'),
        ('docs/manual-screenshots/deals/05-contract-sent.png', 'ContractSentConfirmation — Contract confirmation card'),
    ]
    for path, caption in deal_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    story.append(PageBreak())

    # Payment/closure states
    story.append(Paragraph('Payment &amp; Closure States', styles['ManualH2']))
    pay_states = [
        ('docs/manual-screenshots/deals/06-payment-confirmed.png', 'PaymentConfirmedCard — Payment recorded card'),
        ('docs/manual-screenshots/deals/07-closed-won.png', 'ClosedWonConfirmation — Deal closed with timeline'),
        ('docs/manual-screenshots/deals/08-archived.png', 'Archived Session — Read-only archived session'),
    ]
    for path, caption in pay_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    # Sidebar states
    story.append(Paragraph('Sidebar States', styles['ManualH2']))
    sidebar_states = [
        ('docs/manual-screenshots/sidebar/01-active.png', 'Sidebar Active Sessions — Active flight requests'),
        ('docs/manual-screenshots/sidebar/02-badges.png', 'Sidebar Flight Badges — Status badges on cards'),
        ('docs/manual-screenshots/sidebar/03-archive.png', 'Sidebar Archive Tab — Archived sessions view'),
    ]
    for path, caption in sidebar_states:
        maybe_screenshot(story, styles, path, caption, skip_screenshots)
        story.append(Spacer(1, 0.1 * inch))

    story.append(PageBreak())


def add_section_10(story, styles):
    """Section 10: Troubleshooting."""
    story.append(Paragraph('10. Troubleshooting', styles['ManualH1']))
    story.append(Paragraph('Common Issues', styles['ManualH2']))

    issues = [
        ['Supabase connection fails', '"Could not connect to database"', 'Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'],
        ['Clerk sign-in fails', 'Redirect loop on sign-in page', 'Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY matches your Clerk app'],
        ['OpenAI API errors', '"Insufficient quota" or 429', 'Check billing at platform.openai.com, add payment method'],
        ['Gmail send fails', '"401 Unauthorized"', 'Refresh token expired — re-run npm run gmail:setup'],
        ['Drive upload fails', '"403 Forbidden"', 'Enable Drive API in Google Cloud Console'],
        ['Vercel deploy fails', 'Build error', 'Check env variables are set in Vercel dashboard'],
        ['Avinode deep link broken', '"Session expired" login page', 'API key rotated (Monday reset) — run /avinode-sandbox-reset'],
        ['Agent not responding', 'Spinner indefinitely', 'Check dev server is running (npm run dev)'],
        ['PDF generation fails', '"Storage bucket not found"', 'Create proposals and contracts buckets in Supabase Storage'],
    ]
    story.append(make_table(
        ['Issue', 'Symptom', 'Solution'],
        issues,
        col_widths=[1.5 * inch, 1.8 * inch, 3.0 * inch],
    ))

    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph('Support Contacts', styles['ManualH2']))
    contacts = [
        ['Adrian Budny', 'ab@cucinalabs.com', 'Project Stakeholder'],
        ['Kham Lam', 'kham@onekaleidoscope.com', 'Team Member'],
        ['Kingler Bercy', 'kinglerbercy@gmail.com', 'Lead Developer'],
    ]
    story.append(make_table(['Name', 'Email', 'Role'], contacts,
                            col_widths=[1.8 * inch, 2.8 * inch, 1.8 * inch]))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Generate Jetvision User Manual PDF')
    parser.add_argument(
        '--output', '-o',
        default=str(DEFAULT_OUTPUT),
        help=f'Output PDF path (default: {DEFAULT_OUTPUT})',
    )
    parser.add_argument(
        '--skip-screenshots',
        action='store_true',
        help='Skip embedding screenshots (text-only, faster)',
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f'Generating Jetvision User Manual PDF...')
    print(f'  Output:      {output_path}')
    print(f'  Screenshots: {"skipped" if args.skip_screenshots else "embedded if found"}')
    print(f'  Screenshots dir: {SCREENSHOTS_DIR}')
    print()

    # Build document
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=60,
        title='Jetvision AI Assistant — User Manual',
        author='One Kaleidoscope Development Team',
        subject='User Manual & Account Setup Guide',
    )

    styles = build_styles()
    story = []

    # Build all sections
    add_cover_page(story, styles)
    add_toc(story, styles)
    add_section_1(story, styles, args.skip_screenshots)
    add_section_2(story, styles)
    add_section_3(story, styles, args.skip_screenshots)
    add_section_4(story, styles, args.skip_screenshots)
    add_section_5(story, styles, args.skip_screenshots)
    add_section_6(story, styles, args.skip_screenshots)
    add_section_7(story, styles, args.skip_screenshots)
    add_section_8(story, styles)
    add_section_9(story, styles, args.skip_screenshots)
    add_section_10(story, styles)

    # Build PDF
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)

    print(f'PDF generated successfully: {output_path}')
    print(f'  File size: {output_path.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
