# Generate Project Documentation

You are generating **comprehensive documentation** for the Prompt Builder project using agent templates and context.

## Parameters:

- **Section** (optional): Specific documentation section or `all` (default)
- Usage: `/docs [section]`

## Actions to Execute:

1. **Generate Documentation**: Execute based on target section:

### All Documentation (`/docs` or `/docs all`):

```bash
node scripts/generate_docs_from_context.js --comprehensive
```

- Generates complete documentation from all `.context/` templates
- Updates all sections in `docs/` directory
- Ensures consistency across all documentation

### Specific Sections:

- `/docs architecture` → `docs/5_architecture/`
- `/docs design` → `docs/3_design_specifications/`
- `/docs requirements` → `docs/2_product_requirements/`
- `/docs user_stories` → `docs/4_user_stories/`
- `/docs development` → `docs/6_development_specifications/`
- `/docs implementation` → `docs/7_implementation_process/`

2. **Template Processing**: Process templates from `.context/` directory:
   - Agent templates → Development specifications
   - Documentation templates → Design specifications
   - Architecture templates → Architecture docs
   - Bootstrap procedures → Implementation process
   - Project management → Status reports

## Documentation Generation Flow:

```
.context/agents/templates/ → docs/6_development_specifications/
.context/documentation/ → docs/3_design_specifications/
.context/project_management/ → docs/generated_reports/
.context/shared/bootstrap/ → docs/7_implementation_process/
.context/shared/guidelines/ → docs/development_guidelines/
```

## Agent Integration:

- **System Architect Agent**: Ensures architectural consistency
- **Development Agent**: Validates technical accuracy
- **QA Agent**: Reviews documentation quality
- **All Agents**: Contribute domain-specific knowledge

## Success Indicators:

- ✅ Documentation generated successfully
- 📚 All target sections updated
- 🔄 Templates processed correctly
- 📊 Cross-references validated

## Generated Content:

- **Architecture**: System design, technical specifications
- **Design**: UI/UX specifications, design system
- **Requirements**: Business and product requirements
- **User Stories**: Development tasks and acceptance criteria
- **Development**: Agent specifications, coding standards
- **Implementation**: Setup procedures, deployment guides

## Next Steps:

- Review generated documentation for accuracy
- Update `.context/` templates if changes needed
- Commit documentation updates to version control
- Share with stakeholders for feedback
