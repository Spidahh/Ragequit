# RAGEQUIT — Design Documentation

Single source of truth for the game's design. Files are living contracts and should track the current implementation.

## How to read

- **Full mental model**: follow `MANIFEST.yaml → read_order`
- **Quick lookup**: use `MANIFEST.yaml → query_hints` for minimal context per question
- **By section**: see `MANIFEST.yaml → sections`
- **Locked decisions at a glance**: `MANIFEST.yaml → locked_decisions`

## Naming convention

Files are prefixed with a section number:

| Prefix | Section                                 |
| ------ | --------------------------------------- |
| `00_`  | Core (vision, pillars, player journey)  |
| `01_`  | Combat (stats, controls, fundamentals)  |
| `02_`  | Weapons (sword, bow, staff)             |
| `03_`  | Mastery system                          |
| `04_`  | Transmutation                           |
| `05_`  | Abilities (philosophy + per-type lists) |
| `06_`  | Build & loadout                         |
| `07_`  | Game modes                              |
| `08_`  | Progression                             |
| `09_`  | Visual / art direction                  |
| `10_`  | Tech (stack, netcode, assets)           |
| `99_`  | Meta (resolved ambiguities)             |

## File format

Every `.md` file starts with YAML frontmatter:

```yaml
---
id: <stable-id>
title: <human-readable-title>
section: <section-key>
tags: [tag1, tag2]
provides: [concept_a, concept_b]
deps: [other_file.md]
status: final
---
```

Most files carry `status: final` from the original design freeze, but current implementation notes may supersede early-phase wording. Numbers are committed against the TTK 20-30 s design window and must stay internally self-consistent.

## Scope

Each file is self-contained and under ~200 lines for fast context loading. Cross-references use relative filenames.
