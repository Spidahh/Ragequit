# Class System

Four classes. Same total slot count (8). Different slot distribution, different resources. No class is objectively stronger — each dominates its optimal range and situation.

## Class overview

| Class   | Identity                  | Optimal range | Resource emphasis       |
| ------- | ------------------------- | ------------- | ----------------------- |
| Tank    | Wall that fights back     | <2m melee     | HP + Stamina            |
| Arciere | Death you can't reach     | 8-40m         | Mobility + ranged play  |
| Mago    | Elemental chaos conductor | 5-25m         | Mana + spell sequencing |
| Ibrido  | Unpredictable adapter     | Any           | Balanced adaptation     |

## Slot distribution — 8 total per class

| Classe  | Melee | Bow | Magic Base | Magic Adv | Utility | Weapon M1 access       |
| ------- | ----- | --- | ---------- | --------- | ------- | ---------------------- |
| Tank    | 3     | 2   | 0          | 0         | 3       | Sword + Bow (no Staff) |
| Arciere | 0     | 3   | 3          | 0         | 2       | Bow + Staff            |
| Mago    | 0     | 0   | 3          | 3         | 2       | Staff only             |
| Ibrido  | 1     | 1   | 2          | 2         | 2       | Sword + Bow + Staff    |

## Resource pools per class

| Classe  | HP  | Mana | Stamina |
| ------- | --- | ---- | ------- |
| Tank    | 250 | 50   | 150     |
| Arciere | 175 | 80   | 110     |
| Mago    | 150 | 160  | 80      |
| Ibrido  | 200 | 100  | 100     |

Resource pools are the confirmed starting design. The target sustain model has no fixed resource transfers: Recovery lives in legal utility choices and magic abilities that pay their own slot/cost/counterplay budget. See `04_resource_sustain_study.md`.

## Self-healing per class

There is no baseline transfer strip and no free background heal. Every class needs legal Recovery options in its utility pool, and first-session builds include one Recovery pick.

| Class   | Starter Recovery | Recovery identity                                                                   |
| ------- | ---------------- | ----------------------------------------------------------------------------------- |
| Tank    | Brace Recovery   | Stamina recovery action; provides baseline heal and stamina restore                 |
| Arciere | Hunter's Flow    | Moving recovery with lateral push; provides baseline heal while moving              |
| Mago    | Arcane Rebind    | Mana-cast recovery; provides baseline heal with a visible cast time                 |
| Ibrido  | Adaptive Mend    | Fast lower-peak heal; provides quick healing balance                                 |

Dark lifesteal and Nature healing remain magic sustain lanes only when a legal class spends those magic slots. They count against the same TTK sustain budget as Recovery utilities.

## Balance zones

Each class is strong in their zone. Getting OUT of your optimal zone is a skill test:

- **Tank vs Mage**: Tank must close distance through roots/knockup. Mage must maintain range. If Mage lets Tank in to <2m, windup spells gain +0.4s cast time — only Ray/Instant work reliably at that range.
- **Tank vs Arciere**: Arciere kites with range. Tank must read Arciere movement to cut off angles.
- **Mago vs Arciere**: Both ranged. Mago has higher burst via combos. Arciere has more consistent damage and better sustained mobility.
- **Ibrido vs any**: No class advantage. Wins by reading and adapting the matchup mid-fight.

## Proximity Casting

REMOVED. Proximity casting penalty is excluded from the game permanently. No windup penalty at close range for any class or ability. See 99_resolved_ambiguities.md.
