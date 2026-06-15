# Relay — Brand & Design System

> **Relay** · *Relationships in motion*

Relay is named for the idea that great sales is a series of clean hand-offs —
lead to qualified, qualified to proposal, proposal to won — momentum passed
forward without anything getting dropped. The logo is a forward chevron flowing
out of two horizontal "track" lines: a baton being passed.

## Positioning

- **One-liner:** The CRM that keeps your deals moving.
- **Audience:** Small-to-mid sales teams who find legacy CRMs bloated and slow.
- **Promise:** Everything you need to move a deal forward, nothing you don't —
  on a workspace that's genuinely fast and pleasant to look at.

## Logo

A rounded-square app mark with the brand gradient and a white chevron-flow glyph
(`src/components/Logo.tsx`). Pair with the wordmark **Relay** set in Inter Bold.

## Color

The system is built on an indigo-violet primary with a teal accent for positive,
"in-motion" signals (won deals, growth, live status).

| Token        | Hex       | Use                                  |
| ------------ | --------- | ------------------------------------ |
| `brand-500`  | `#6d5efc` | Primary brand / charts               |
| `brand-600`  | `#5a45f0` | Primary buttons, active nav          |
| `brand-50`   | `#f1f0ff` | Active nav background, icon chips     |
| `accent-500` | `#10b986` | Positive / won / live indicators     |
| `accent-50`  | `#ecfdf7` | "Live demo" badge background          |
| Slate 50–900 | —         | Surfaces, borders, and text          |

Gradients (`tailwind.config.ts`): `bg-brand-gradient` (indigo → violet → teal)
for the logo and avatars; `bg-brand-radial` for the dashboard hero.

Stage colors are semantic and consistent everywhere (cards, pills, charts):
Prospecting → slate, Qualification → sky, Proposal → indigo, Negotiation →
amber, Closed Won → emerald, Closed Lost → rose.

## Typography

- **Family:** Inter (400/500/600/700/800), loaded via Google Fonts.
- **Headings:** semibold/bold, tight tracking.
- **Numbers:** `tabular-nums` for all currency and metrics so columns align.

## UI principles

1. **Soft, layered surfaces.** `rounded-2xl` cards, hairline rings, subtle
   `shadow-card`, and a gentle `shadow-lift` on hover.
2. **Calm by default, color with meaning.** Neutral slate canvas; brand and
   semantic color reserved for actions, status, and emphasis.
3. **Motion implies progress.** Drag-to-advance on the pipeline, a pulsing live
   badge, and a quiet fade-in on navigation.
4. **Consistent primitives.** `.card`, `.btn-*`, `.input`, `.pill`, `.avatar`,
   and the `<Icon>` set keep every screen coherent.
5. **Dark mode is first-class**, not an afterthought — every token has a dark
   counterpart.

## Reusable components

`Logo`, `Sidebar`, `TopBar`, `StatCard` (icon + trend), `Modal`, `PageHeader`,
`Icon`. Helpers in `lib/format.ts`: `initials`, `avatarColor`, `stageLabel`,
`stageColor`, `stageAccent`, `formatCurrency`, `formatCompactCurrency`,
`formatRelative`.
