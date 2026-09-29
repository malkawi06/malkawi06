---
name: awesome-design
description: Library of real-world design systems (DESIGN.md files for Stripe, Linear, Vercel, Apple, Notion, Airbnb and 70+ others) covering colors, typography, spacing and components. Use when the user wants a site to look like a known brand/product, needs a proven design-system reference, or asks for design inspiration.
---

# Awesome Design — real design systems & references

Source: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT).

Each file in `references/` is a `DESIGN.md` describing one real product's visual language:
color tokens, type scale, spacing, radii, shadows, component patterns and tone.

## How to use

1. Pick the reference(s) that fit the brief — by brand the user names, or by vibe
   (e.g. dev tools → `linear.app`, `vercel`, `raycast`, `warp`; fintech → `stripe`, `revolut`, `wise`;
   consumer → `airbnb`, `spotify`, `nike`; editorial → `wired`, `theverge`; luxury → `ferrari`, `bugatti`).
2. Read only the chosen file(s) from `references/<name>.md` — don't load them all.
3. Translate its tokens into the project's CSS variables / Tailwind config, then build components with them.
4. Borrow the *system* (scale, rhythm, restraint), not trademarked assets — no logos, brand art or copied copy.

Available references: run `ls .claude/skills/awesome-design/references`.
