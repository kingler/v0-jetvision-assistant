# Security Assessment and Scanning

You are conducting a **security assessment** for the Prompt Builder project using the Security agent.

## Parameters:

- **Scan Type** (optional): `dependencies`, `code`, or `full` (default)
- Usage: `/security [scan-type]`

## Actions to Execute:

1. **Activate Security Agent**: Execute `node scripts/multiagent_orchestrator.js coordinate --agent-type="security" --task="security-scan"`
2. **Run Security Assessment Based on Type**:

### Dependency Scanning (`/security dependencies`):

```bash
npm audit
npm audit --audit-level=high
```

- **Focus**: Third-party package vulnerabilities
- **Coverage**: All dependencies in package.json
- **Action**: Identify and report vulnerable packages
- **Remediation**: Automatic fixes where possible

### Code Security Analysis (`/security code`):

```bash
# Static analysis security testing
npx eslint . --config .eslintrc.security.js
# Type safety validation
npx tsc --noEmit --strict
```

- **Focus**: Code vulnerabilities and security patterns
- **Coverage**: Authentication, authorization, data validation
- **Analysis**: OWASP Top 10 compliance
- **Validation**: Input sanitization and output encoding

### Full Security Assessment (`/security` or `/security full`):

```bash
# Complete security audit
npm audit
npx eslint . --config .eslintrc.security.js
npx tsc --noEmit --strict
node scripts/security_assessment.js
```

- **Focus**: Comprehensive security validation
- **Coverage**: Dependencies, code, configuration, deployment
- **Assessment**: Complete threat model evaluation
- **Reporting**: Detailed security posture report

## Security Domains Covered:

### Authentication & Authorization:

- Clerk integration security
- JWT token validation
- Session management
- Role-based access control

### Data Security:

- Input validation and sanitization
- SQL injection prevention (Convex safety)
- XSS protection
- CSRF protection

### Infrastructure Security:

- Environment variable protection
- API key management
- HTTPS enforcement
- Security headers

### Application Security:

- Secure coding practices
- Error handling (no information leakage)
- Logging and monitoring
- Third-party integration security

## Success Indicators:

- ✅ No high or critical vulnerabilities found
- 🔒 Security agent confirms compliance standards
- 📊 Security metrics within acceptable thresholds
- 🛡️ All security controls validated

## If Issues Found:

1. **Critical Vulnerabilities**: Immediate remediation required
2. **High Vulnerabilities**: Fix before next release
3. **Medium Vulnerabilities**: Address in next sprint
4. **Low Vulnerabilities**: Add to backlog

## Remediation Actions:

- **Dependencies**: Update to secure versions
- **Code**: Apply security patches and refactoring
- **Configuration**: Update security settings
- **Documentation**: Update security procedures

## Integration with Development:

- Run `/security dependencies` with every `npm install`
- Run `/security code` before pull request creation
- Run `/security full` before production deployment
- Continuous monitoring in CI/CD pipeline
