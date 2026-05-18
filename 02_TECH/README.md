# 02_TECH — Technical Architecture

This folder describes the current code contracts that support the gameplay docs in `01_DESIGN/`.

## Read order

1. [`00_architecture_overview.md`](00_architecture_overview.md) — current packages, runtime split, server tick flow
2. [`01_entity_component_model.md`](01_entity_component_model.md) — replicated schemas and server-only state
3. [`02_ability_dsl.md`](02_ability_dsl.md) — current 52-ability data schema and effect primitives
4. [`03_network_protocol.md`](03_network_protocol.md) — message and state protocol
5. [`04_code_conventions.md`](04_code_conventions.md) — layout, naming, imports, tests
6. [`05_input_contract.md`](05_input_contract.md) — browser focus, pointer lock, wheel, and input regression rules

## Status

These docs are treated as living implementation docs. When code changes the architecture, protocol, or ability schema, update this folder in the same work pass.
