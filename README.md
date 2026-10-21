# 商途 Merchant Road

**Original homage** to the *feeling* of classic Silk Road merchant sims — **not** a clone of 巨商 Online or any official IP.

Working title: **商途** · EN: *Merchant Road* · **v0.2**

Offline merchant loop (travel → bargain → buy/sell → grow net worth) + **road bandit combat-lite**. Phone-friendly web build; Capacitor shell for a real app later.

---

## Play on phone (live)

**https://dancingturtle14.github.io/merchant-road/**

(GitHub Pages · may take 1–2 minutes after a push)

Or locally:

```bash
cd prototype && python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

**Goal:** net worth ≥ **5,000 文** (cash + cargo at local sell prices).

---

## What’s new in v0.2

- **Graphics:** rich isometric city pads (buildings, flags, boat, trees, roads), bobbing cart token, stylized NPC portrait in bargain modal, thicker paper UI  
- **Feature:** 綠林響馬 — fight / pay toll / flee (HP + dice) on ~32% of trips  
- **Roadmap in-game:** 傭兵 / 投城 / 完整戰鬥 shown as「即將推出」stubs  
- **App shell:** `app/` Capacitor project wrapping the same `www` assets (build APK on your machine later — see `app/README.md`)

---

## Layout

| Path | Purpose |
|------|---------|
| `prototype/` | Playable web game (source of truth for UI) |
| `app/` | Capacitor shell · copy from prototype → build native later |
| `DESIGN.md` | Fantasy, loop, cities, goods, bargain |
| `MVP-SCOPE.md` | In / out |
| `ROADMAP.md` | Phases + honest effort |
| `ART-DIRECTION.md` | 2.5D direction |

---

## Hard rules

- Original names, maps, fiction — no ripped sprites / official art / trademarks  
- No reverse engineering or private-server dumps  
- No App Store / Play submit, no spending without ask  

**Honest note:** full feature parity with childhood MMO memories = **multi-year**. We ship vertical slices.

Made for David · Asia/Hong_Kong · 2026-10-21
