<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR. Principle II is redefined in a backward-incompatible
  way — the previous "no backend, ever" rule is replaced with a narrower
  "one free-tier backend, auth required, RLS mandatory, offline-first"
  rule. That is a principle redefinition, which our versioning policy
  classifies as MAJOR.

Modified principles:
  - II. Local-Only, Zero-Cost Data → II. Local-First with Free-Tier Cloud Sync
    (meaning changed; cost constraint preserved)

Unchanged principles:
  - I. Mobile-First, Always
  - III. Clean, Delightful UI (NON-NEGOTIABLE)
  - IV. Forest Rewards Feel Magical, Not Gimmicky
  - V. Simplicity & Performance

Added sections: none (rules for auth / RLS / service_role are folded into
  Principle II and Additional Constraints).

Removed sections: none.

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — generic Constitution Check
    section; no structural edit required. New plans MUST evaluate the
    revised Principle II.
  - ✅ .specify/templates/spec-template.md — no coupled fields.
  - ✅ .specify/templates/tasks-template.md — no coupled fields.
  - ⚠ specs/001-forest-tasks-tracker/plan.md — its Constitution Check
    table references Principle II's old wording. Leave as-is for the
    historical record of the v1 scope; the new 002-cloud-sync feature
    will carry the v2.0.0 gate.
  - ⚠ specs/001-forest-tasks-tracker/spec.md — the local-only promise
    in its Assumptions and Success Criteria still holds for the v1
    MVP. Cloud sync is a separate, opt-in feature delivered under a
    new feature branch.
  - ⚠ README.md — add a "Sync is optional" note when the sync feature
    ships; not required for this amendment.

Follow-up TODOs: none.
-->

# Forest Tasks Tracker Constitution

## Core Principles

### I. Mobile-First, Always

Every screen, interaction, and layout MUST be designed and verified for a
narrow mobile viewport (≤ 390 px wide) before any larger breakpoint is
considered. Touch targets MUST be at least 44×44 px. Tap-to-reach
interactions MUST be thumb-reachable in one hand. Desktop layouts are an
enhancement, never the baseline.

**Rationale**: The primary use case is a user pulling out their phone to
capture or complete a task. Designing mobile-first prevents hover-
dependent patterns and cramped touch targets from sneaking in via "we'll
fix it on mobile later."

### II. Local-First with Free-Tier Cloud Sync

The app MUST work fully offline with `localStorage` as the authoritative
local cache. Optional cloud sync is allowed through **exactly one**
free-tier backend (currently Supabase). Specifically:

- **Offline-first, always**: Every user action (create / edit / complete
  / delete) MUST succeed against the local cache without a network
  round-trip. The network is a background concern, never a blocker.
- **Free tier only**: Running cost for a single personal user MUST stay
  at $0/month. If the backend's free tier ever becomes insufficient,
  that requires a constitutional amendment — not an invoice.
- **Sync is opt-in per user but gated by auth**: A user MAY choose to
  stay purely local. If they enable sync, authentication is mandatory.
  Authentication MUST use a provider-based OAuth flow; email/password
  flows are prohibited to avoid credential custody. The v2 default
  provider is Google OAuth.
- **Row Level Security (RLS) is mandatory**: Every table in the cloud
  database that holds user data MUST have RLS enabled with policies
  that constrain reads and writes to `auth.uid() = user_id`. No
  anonymous access to user data, ever.
- **No `service_role` in the client**: The `service_role` key (or any
  equivalent admin key) MUST NEVER ship in the browser bundle, live in
  a client-side `.env` that is committed, or appear in client-side
  logs. The publishable / anon key is the only credential permitted
  in the client.
- **Conflict resolution is deterministic and simple**: When the same
  record is edited on two devices while offline, the resolution rule
  MUST be last-write-wins by a monotonic per-record `updatedAt`
  timestamp, recorded server-side on write. Complex merge strategies
  are out of scope.
- **Local export/import remains a first-class feature**: Even with
  sync enabled, users MUST be able to export and import a JSON
  snapshot — it is the escape hatch if the backend ever goes away.

**Rationale**: The product promise is a personal, free, private
tracker. A single free-tier backend lets us offer real cross-device
sync without breaking the "zero-cost, zero-lock-in" promise. Requiring
auth + RLS + offline-first keeps the privacy and reliability story
honest; forbidding `service_role` in the client closes the most
common "free app leaked everyone's data" failure mode.

### III. Clean, Delightful UI (NON-NEGOTIABLE)

The interface MUST feel calm, uncluttered, and joyful. This means:
generous whitespace, a restrained palette, consistent type scale,
motion that serves feedback (not decoration), and zero dark patterns
(no streak guilt, no nagging modals, no engagement bait). Every new UI
element MUST justify its visual weight. If it doesn't earn its pixels,
it gets cut.

**Rationale**: A task tracker lives or dies on daily use. Visual noise
and friction are the #1 reason these apps get abandoned. "Delight" is
a feature-level requirement, not a polish pass.

### IV. Forest Rewards Feel Magical, Not Gimmicky

The forest reward system MUST reinforce progress with a sense of
wonder — plants grow in response to real effort, the forest reflects
the user's actual history, and moments of reward feel earned and
surprising. It MUST NOT use manipulative gamification: no artificial
scarcity, no "you'll lose your tree!" threats, no points for points'
sake, no loot-box RNG, no notifications designed to pull the user
back in. If a forest mechanic could plausibly appear in a casino-
style mobile game, it is rejected.

**Rationale**: The forest is what makes this app different. Done
well, it turns task completion into something the user looks forward
to. Done cynically, it becomes another dopamine-exploit app the user
deletes in a week.

### V. Simplicity & Performance

Start with the smallest implementation that works; resist premature
abstraction. First meaningful paint on a cold cache on a mid-tier
mobile device MUST be under 2 seconds on a typical 4G connection.
Interaction response (tap → visible feedback) MUST be under 100 ms.
Bundle size for the core app MUST stay under 300 KB gzipped until
justified in `Complexity Tracking`. (Budget raised from v1's 250 KB
to accommodate the Supabase JS client; still tight enough to force
discipline.) No framework, library, or feature may be added that
does not demonstrably pull its weight against these budgets.

**Rationale**: A fast, simple codebase is what makes principles
I–IV sustainable. Every dependency is a future constraint on UI
polish, offline behavior, and the feel of the forest.

## Additional Constraints

- **Runtime**: The app MUST run as a static web app deployable to any
  static host (e.g., GitHub Pages, Netlify, Cloudflare Pages) with
  no server-side rendering requirement. The Supabase backend is
  consumed from the browser; no self-hosted server process is
  required.
- **Privacy**: No analytics, tracking pixels, session replay, or
  third-party scripts that transmit user data. Optional self-hosted
  anonymous aggregates (e.g., basic PWA install count) are the only
  exception and MUST be opt-in. Supabase is scoped to per-user task
  data only; no analytics events go through it.
- **Accessibility**: WCAG 2.1 AA MUST be met for color contrast,
  focus order, and keyboard navigation. The forest visuals MUST
  have a reduced-motion alternative.
- **Data portability**: Users MUST be able to export their full
  data set (tasks + forest state) as JSON and re-import it, whether
  they use sync or not. This is the backup story in lieu of a
  backend the user owns.
- **Secrets hygiene**: The only cloud credential that may ship in
  the client is the publishable / anon key. Any admin-scoped key
  (e.g., Supabase `service_role`) is prohibited in client code,
  client `.env` files, and any file tracked by git. `.env.example`
  MUST document this explicitly.
- **Browser support**: Latest two major versions of Safari iOS,
  Chrome Android, and desktop Chrome/Safari/Firefox.

## Development Workflow & Quality Gates

- **Spec-driven**: All non-trivial features follow the Spec Kit
  workflow (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks`
  → `/speckit.implement`). Constitution gates are checked at
  `/speckit.plan` and revalidated after design.
- **Constitution Check**: Each plan MUST include a Constitution
  Check section that explicitly addresses each principle (I–V) with
  a pass statement or a justified entry in `Complexity Tracking`.
- **Mobile verification**: UI-affecting changes MUST be verified on
  a mobile viewport (390×844 or narrower) before being marked
  complete. Screenshots or a short recording are the preferred
  evidence.
- **Performance budget enforcement**: Any PR adding > 25 KB gzipped
  to the core bundle MUST justify the addition against Principle V.
- **Sync-path verification**: Changes that touch the sync engine,
  auth flow, or Supabase policies MUST verify: (a) offline edits
  still succeed, (b) RLS blocks cross-user reads in a manual test,
  (c) no `service_role` key is present in the built bundle
  (`grep -r service_role dist/` MUST return no matches).
- **No silent regressions**: Changes that remove or weaken a
  principle's guarantee (e.g., dropping RLS, introducing a
  credential-custody flow, adding a nag modal) require a
  constitutional amendment, not just a PR approval.

## Governance

This constitution supersedes ad hoc conventions and team
preferences. When guidance here conflicts with another document,
this file wins until it is formally amended.

**Amendment procedure**:
1. Propose the change as an edit to
   `.specify/memory/constitution.md` with a Sync Impact Report
   describing the version bump and affected templates/docs.
2. Walk the dependent artifacts
   (`.specify/templates/plan-template.md`,
   `.specify/templates/spec-template.md`,
   `.specify/templates/tasks-template.md`, README, quickstart) and
   either update them or mark them ⚠ pending in the report.
3. Land the amendment in a single commit referencing the new
   version.

**Versioning policy** (semantic):
- **MAJOR**: Removing a principle, redefining one in a
  backward-incompatible way, or changing governance rules.
- **MINOR**: Adding a new principle or materially expanding an
  existing one.
- **PATCH**: Clarifications, wording, or non-semantic refinements.

**Compliance review**: Any PR touching UI, data persistence, sync,
auth, or the forest system MUST self-certify against Principles
I–IV in its description. The `/speckit.analyze` command SHOULD be
run before `/speckit.implement` on non-trivial features to catch
drift early.

**Version**: 2.0.0 | **Ratified**: 2026-04-17 | **Last Amended**: 2026-04-17
