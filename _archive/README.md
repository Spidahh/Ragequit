# Archive / Legacy Files

This folder (`_archive/`) contains historical or superseded code and scripts from earlier development cycles. Files here **are not referenced by the current runtime** and are preserved for transparency and reference only.

## Contents

- **`server_legacy.js`** — Old server implementation replaced by `server/server.js`. Kept for reference.
- **`create_assets.cjs`** — Asset generation script no longer in active use.
- **`create_new_skills.cjs`** — Skill generation script superseded by manual edits to `src/data/SkillData.js`.

## Usage

Do not import or reference these files in current code. If you need legacy patterns for testing, copy selectively into a test harness rather than reintroducing archived imports.

## Cleanup Policy

- Files in `_archive/` can be safely removed if disk space or clutter is a concern.
- No runtime or build system depends on these files.
