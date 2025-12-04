# Implementation Log Template

Use this template every time you implement features or make changes. It keeps vision aligned, and makes audits and onboarding trivial.

## Summary
- Title:
- Date:
- Author:
- Scope: (feature, fix, refactor, docs)

## Motivation (Vision Alignment)
- What player problem or pillar does this address?
- Which vision section is impacted? (loop, combat/physics, UX/HUD, modes)

## Changes
- Code paths:
- Systems touched: (Movement, Combat, Casting, Projectile, Resource, Managers)
- Data changed: (e.g., `src/data/SkillData.js`)
- Assets/VFX/HUD updates:

## Behavioral Effects
- Player-facing behavior:
- Edge cases:
- Performance considerations:

## Tests & Verification
- Manual test steps:
- Expected results:
- Regressions checked:

## Documentation
- Updated files: (`README.md`, `DOCUMENTATION_INDEX_CURRENT.md`, others)
- New docs:
- Links:

## Rollback Plan
- How to revert:
- Config flags:

---

Checklist
- [ ] Code compiles
- [ ] Tests/manual steps pass
- [ ] Docs updated
- [ ] Index linked
- [ ] Changelog/QoL noted