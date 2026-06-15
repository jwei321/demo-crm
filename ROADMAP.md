# Relay — Product Roadmap & Feature Ideas

What's shipped in this redesign, and what to build next to turn the demo into a
sellable product. Roughly ordered by value-to-effort.

## ✅ Shipped in v3 (this release)

- **Full multi-user auth** — sign up, sign in, sign out with httpOnly JWT cookies
  and bcrypt-hashed passwords. No external auth provider required.
- **Per-user data isolation** — every query is scoped to `userId`; contacts,
  companies, and deals are completely private between accounts.
- **Branded login / signup pages** — two-panel layout with brand left rail and
  form panel; "Start with sample data" checkbox on signup.
- **Edge middleware** — protects all app routes; returns 401 on API routes.
- **Rebrand to Relay** — name, logo, indigo-violet design system, dark mode.
- **Pipeline / Kanban** — drag deals between stages, board ⇄ list views, full
  CRUD, automatic `closedAt` handling on win/loss.
- **Redesigned dashboard** — gradient hero, KPI cards with trend chips,
  open-pipeline-by-stage strip, avatar-rich recent lists.
- **Refreshed shell** — new sidebar with real user name/email + logout, sticky top
  bar with breadcrumb, search field, and a live-demo badge.

## 🔜 High-impact, low-effort next steps

1. **Authentication & multi-tenant workspaces** — NextAuth (Google / email).
   Scope every query by `workspaceId`. *Required before real customers.*
2. **Activities & timeline** — log calls, emails, and meetings against a contact
   or deal; show a chronological timeline on detail pages.
3. **Tasks & reminders** — due dates, "my open tasks" on the dashboard, overdue
   highlighting. The natural follow-up engine for a CRM.
4. **Notes** — free-text notes on contacts, companies, and deals.
5. **Detail pages** — `/contacts/[id]`, `/companies/[id]`, `/deals/[id]` with
   related records, activity, and notes in one place.
6. **Global command palette** (⌘K) — jump to any record; wire up the existing
   search field in the top bar.

## 📈 Sales-team value

7. **Weighted pipeline & forecasting** — probability per stage; show
   weighted-value alongside raw value.
8. **Deal rotting / stale alerts** — flag deals untouched for N days.
9. **Custom pipelines & stages** — configurable per team.
10. **Email integration** — Gmail/Outlook sync, send + log from the contact.
11. **CSV import / export** — onboarding and reporting.
12. **Saved views & advanced filters** — e.g. "my deals closing this quarter."

## 🤝 Collaboration & scale

13. **Roles & permissions** — admin / manager / rep.
14. **Assignment & ownership** — owner avatars (already in the UI), round-robin
    lead routing.
15. **Activity feed & @mentions** — team awareness.
16. **Audit log** — who changed what, when.

## 🤖 Differentiators

17. **AI deal summaries & next-best-action** — summarize a deal's history and
    suggest the next step (great fit for the Claude API).
18. **Lead scoring** — rank leads by fit and engagement.
19. **Reporting builder** — drag-and-drop custom charts on top of the existing
    Recharts foundation.
20. **Webhooks & public API** — integrate with the rest of the stack
    (the `/api/*` routes are already a clean starting point).

## 🛠️ Platform / hardening

- Input validation with **Zod** on every API route.
- **Optimistic UI** everywhere (the pipeline already does this) + toasts instead
  of `alert()`/`confirm()`.
- **Pagination / virtualization** for large contact and deal lists.
- **Tests** — Playwright smoke tests for each page; unit tests for `lib/format`.
- **Observability** — error tracking (Sentry) and request logging.
