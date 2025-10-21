# Scripts

Utility scripts for development, deployment, and maintenance.

## Available Scripts

### Development
- `setup-dev.sh` - Initial development environment setup
- `seed-database.sh` - Seed database with test data
- `reset-database.sh` - Reset database to clean state

### Database
- `migrate-up.sh` - Run database migrations
- `migrate-down.sh` - Rollback migrations
- `backup-database.sh` - Create database backup

### Deployment
- `deploy-staging.sh` - Deploy to staging environment
- `deploy-production.sh` - Deploy to production
- `rollback.sh` - Rollback to previous deployment

### Maintenance
- `check-health.sh` - Check system health
- `clean-logs.sh` - Clean up old logs
- `analyze-performance.sh` - Performance analysis

## Usage

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

Run a script:
```bash
./scripts/setup-dev.sh
```

## CI/CD Integration

These scripts are used in GitHub Actions workflows for automated testing and deployment.
