# DESIGN — 商途 Merchant Road

## Fantasy pitch (1 page)

You are a junior caravan clerk on the **Southern Trade Spine** — a fictional chain of river-port and hill towns. Coin is **文**. Reputation is thin. Your cart is small. The road is long.

Every trip you choose: which city, which goods, whether to haggle hard or walk away. NPC merchants remember nothing forever (v0.1), but each has a temper: greedy, fair, or impatient. Markets breathe — the same silk is cheap where it is woven and dear where it is rare.

**Homage, not clone.** We keep the *emotional* loop of childhood merchant games: the thrill of a good spread, the dread of a bad road, the pride of a heavier purse. We do **not** reuse official names, maps, logos, quests, or art from 巨商 Online or any other commercial title. Cities, goods, and lore below are original.

**Long-term north star:** multiplayer trade (real counterparties). **MVP truth:** strong NPC merchants + a clear win target so the loop is fun alone first.

---

## Core loop (v0.1)

1. **Look** at city prices (buy / sell) and your cart space  
2. **Bargain** with the local factor for a chosen good  
3. **Buy or sell** if the deal closes  
4. **Travel** a route (time + gold or stamina; chance of a road event)  
5. **Repeat** until net worth ≥ target, or sandbox forever  

Secondary loop: watch the **economy log** — what you paid, what you earned, what the road took.

---

## Cities (≥3)

| ID | Name (ZH) | EN | Personality | Cheap goods | Dear goods |
|----|-----------|----|-------------|-------------|------------|
| `hekou` | 河口鎮 | River Mouth | Busy port | 鹽、米、茶 | 瓷器、香料 |
| `qingshan` | 青山驛 | Green Hill | Hill crafts | 瓷器、布 | 鹽、鐵器 |
| `nanpu` | 南浦港 | South Cove | Overseas taste | 香料、茶 | 米、布、鐵器 |

Routes (bidirectional): 河口 ↔ 青山 · 青山 ↔ 南浦 · 河口 ↔ 南浦 (longer, costlier).

---

## Goods (≥6)

| ID | Name | Base value | Notes |
|----|------|------------|-------|
| `salt` | 鹽 | low | Staple; heavy relative value |
| `rice` | 米 | low | Staple |
| `cloth` | 布 | mid | Always moves |
| `tea` | 茶 | mid | Port likes export |
| `porcelain` | 瓷器 | high | Fragile prestige |
| `spice` | 香料 | high | Rare inland |
| `iron` | 鐵器 | mid-high | Hill demand |

Each city has a **supply/demand multiplier** table → buy price ≈ base × buyMult; sell ≈ base × sellMult. Cart has **weight/slots**; player starts with cash + empty slots.

---

## NPC bargain rules (v0.1)

- Player picks a good and **Buy** or **Sell**, then proposes a price (or uses ± buttons).  
- NPC has a **hidden fair band** around list price (± temper).  
- Outcomes: **Accept** / **Counter** (one counter offer) / **Walk away** (deal fails; small patience loss).  
- Impatient NPCs end faster; fair NPCs give one soft counter.  
- No complex reputation graph yet — temper is per-city archetype.

This is enough to feel like “做生意”, not a shop UI click.

---

## Homage vs original

| Homage (keep the feeling) | Original (ours) |
|---------------------------|-----------------|
| Travel between markets | Fictional Southern Trade Spine |
| Price spreads by city | Our goods + multipliers |
| Haggling | Our temper / counter rules |
| Road risk | Our light random events |
| Grow a merchant empire | Our win target + later systems |
| — | Never official map/quest/art/trademark |

Combat, mercenaries, siege = **Phase 2+** (see MVP-SCOPE / ROADMAP).
