# Code Commenting Standards & Checklist

## A Reference Guide for Engineering Teams

---

## The Golden Rule

> **Code tells you _what_ it does. A good comment tells you _why_.**
> If you feel compelled to write a comment explaining _what_ a line does, that's a signal to rename a variable, extract a function, or simplify the logic — not to add a comment. Comments are a supplement to clear code, never a substitute for it.

This principle underlies every major style guide in the industry — Robert C. Martin's _Clean Code_, the Google Style Guides, PEP 8/257, and the TSDoc/JSDoc specs all converge on it, even though their syntax differs.

---

## 1. Why Comments Matter (and Why Bad Ones Are Worse Than None)

Comments exist to reduce the time it takes a future engineer (including future-you) to safely change code. They contribute directly to **maintainability**, one of the core software quality characteristics in ISO/IEC 25010.

But a stale or misleading comment is worse than no comment — it actively lies to the reader with the authority of documentation. This guide optimizes for comments that are **necessary, accurate, and durable**, not maximal in volume.

---

## 2. Comment Taxonomy

| Type                                                    | Purpose                                                          | Lifespan                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| **File/module header**                                  | Orients a reader to a file's responsibility                      | Long-lived                                |
| **Public API doc comment** (JSDoc/TSDoc/Javadoc/XMLDoc) | Contract for consumers of a function/class/module                | Long-lived, versioned with the API        |
| **"Why" comment**                                       | Explains a non-obvious decision, constraint, or trade-off        | Long-lived                                |
| **Warning comment**                                     | Flags a fragile or non-obvious dependency ("don't reorder this") | Long-lived                                |
| **TODO / FIXME / HACK**                                 | Marks known, tracked, temporary debt                             | Short-lived, must reference a ticket      |
| **Commented-out code**                                  | —                                                                | **Banned.** Git history is the changelog. |

---

## 3. Language & Ecosystem Standards

### TypeScript / JavaScript — TSDoc / JSDoc

Use `/** ... */` doc comments on every exported function, class, type, and React component. Microsoft's [TSDoc spec](https://tsdoc.org) is the modern standard for TypeScript specifically because it's tool-agnostic (works with TypeDoc, API Extractor, and editor tooltips); plain [JSDoc](https://jsdoc.app) is the JS equivalent.

**Key nuance in TypeScript:** the type system already documents parameter and return _types_ — don't duplicate them in prose. Use the doc comment to explain _behavior_, _edge cases_, and _why_, not restate `@param {string} name`.

```typescript
/**
 * Verifies the authenticated user is an active member of the organization
 * in the route params, using a live DB check rather than the JWT alone.
 *
 * We re-check on every request because org membership can be revoked
 * mid-session, and an Auth0 access token stays valid until it expires
 * naturally — trusting the token alone would let a removed user act on
 * stale permissions for up to the token's TTL.
 *
 * @throws {ForbiddenError} if the membership row is missing or inactive
 */
async function verifyOrgMembership(req: AuthenticatedRequest, orgId: string): Promise<boolean> {
  // ...
}
```

```tsx
/**
 * Multi-step onboarding wizard.
 *
 * Step state is kept in local component state rather than global context
 * on purpose — this flow gets abandoned and restarted often, and syncing
 * partial signup data to global state previously caused stale-state bugs.
 */
export function GetStarted() {
  /* ... */
}
```

**Inline comment — bad vs. good:**

```typescript
// Bad: restates the code
// increment retry count by 1
retryCount++

// Good: explains a non-obvious external constraint
// Auth0's Management API caps us at 2 req/sec; back off after 3
// failures instead of failing the whole onboarding flow outright.
retryCount++
```

### Java — Javadoc

Follow Oracle's Javadoc conventions: a summary sentence, then `@param`, `@return`, `@throws` for every public method.

```java
/**
 * Opens a connection to the Access database backing this application.
 *
 * The file path is resolved at runtime rather than hardcoded, since
 * the .accdb file lives in a different location on each deployment
 * machine — a hardcoded path was the root cause of prior connection
 * failures in the field.
 *
 * @param dbPath absolute path to the .accdb file
 * @return an open JDBC Connection; caller is responsible for closing it
 * @throws SQLException if the file is missing or locked by another process
 */
public Connection connect(String dbPath) throws SQLException { /* ... */ }
```

### Python — PEP 257 / PEP 8

Triple-quoted docstrings for every public module, class, and function (PEP 257); block comments above the code they describe, inline comments sparingly and separated by two spaces (PEP 8).

### C# — XML Doc Comments

`///` comments with `<summary>`, `<param>`, `<returns>` tags, consumed by IntelliSense and DocFX.

### SQL / Database (Row-Level Security policies especially)

RLS policies and non-obvious query logic are some of the highest-value places to comment — a wrong assumption here is a security bug, not a readability nit.

```sql
-- WHY: org_id comes from the JWT claim, not the row's own column,
-- because on INSERT the row doesn't exist yet for the check to read from.
create policy "org_members_insert" on org_members
  for insert
  with check (org_id = auth.org_id());
```

### Infrastructure as Code (Terraform, Dockerfiles, CI YAML)

Comment _deviations from default_ and _non-obvious operational reasoning_ — not every line.

```hcl
# Pinned to n2-standard-4 instead of the default e2 family: RLS query
# load spikes need guaranteed CPU, not burstable performance.
machine_type = "n2-standard-4"
```

---

## 4. TODO / FIXME Format Standard

Untracked TODOs rot. Require an owner and a ticket reference:

```typescript
// TODO(ezekiel): Remove this shim once Auth0 SDK v5 migration ships — JIRA-482
```

| Tag     | Meaning                                                      |
| ------- | ------------------------------------------------------------ |
| `TODO`  | Planned work, not a defect                                   |
| `FIXME` | Known defect, not yet fixed                                  |
| `HACK`  | Deliberate workaround; explain the constraint that forced it |
| `NOTE`  | Non-obvious context worth flagging, no action required       |

---

## 5. Anti-Patterns to Reject in Review

- **Redundant comments** — `// set x to 5` above `x = 5`
- **Commented-out code** — delete it; it's in git history if anyone needs it back
- **Stale comments** — a comment contradicted by the code beside it is actively harmful
- **Changelog-in-code comments** — `// changed by John on 3/2` belongs in `git blame`, not the file
- **Apology/blame comments** — `// sorry, hacky fix` explains nothing useful; explain the constraint instead
- **Orphaned TODOs** — no owner, no ticket, dated 2019
- **Comment-per-line noise** — over-commenting buries the comments that actually matter

---

## 6. Comments in Code Review vs. Comments in Code

These are different artifacts with different lifespans. PR review comments are ephemeral conversation; source comments are permanent documentation. The [Conventional Comments](https://conventionalcomments.org) standard is a widely adopted convention for _labeling review feedback_ so intent is unambiguous:

`praise:` `nitpick:` `suggestion:` `issue:` `question:` `thought:` `chore:`

e.g. `nitpick: minor naming — consider orgId over id here` vs. `issue: this bypasses the RLS check on line 42`.

---

## 7. Tooling & Enforcement

- **eslint-plugin-jsdoc** — ESLint's own `require-jsdoc`/`valid-jsdoc` rules were deprecated and removed as of ESLint v9; the community-maintained `eslint-plugin-jsdoc` is the current standard for enforcing JSDoc/TSDoc presence and shape.
- **TypeDoc / API Extractor** — generate published docs straight from TSDoc comments; a good forcing function for keeping them accurate.
- **Javadoc / Doxygen** — same role for Java/C++.
- **SonarQube/SonarLint** — flags TODO density, comment-to-code ratio, and duplicated commented-out blocks.
- **CI gate** — fail the build if an exported/public symbol is missing a doc comment.

---

## 8. Beyond Inline Comments: The Documentation Ecosystem

Inline comments are the smallest unit of a larger documentation layer. Don't try to make a code comment carry weight that belongs elsewhere:

- **README** — setup, environment variables, architecture overview
- **Architecture Decision Records (ADRs)** — Michael Nygard's lightweight template, one file per significant, costly-to-reverse decision (e.g., a schema pivot or an auth provider choice) — the _why_ behind a decision outlives any single comment
- **CHANGELOG.md** — "Keep a Changelog" format for user-facing history
- **OpenAPI/Swagger** — generated API contract docs, ideally sourced from the same doc comments as the code

---

## 9. The Checklist

### A. Before you write a comment

- [ ] Could a better variable/function name make this comment unnecessary?
- [ ] Could extracting this into a well-named function replace the comment?
- [ ] Is this genuinely non-obvious to a competent teammate — not just to me right now?

### B. Comment content

- [ ] Explains **why**, not what
- [ ] Doesn't restate what the code already says
- [ ] No commented-out code
- [ ] No stale claims contradicted by the code next to it
- [ ] TODO/FIXME/HACK tags include an owner and a ticket reference

### C. Public API / function-level (JSDoc, TSDoc, Javadoc, XML doc)

- [ ] Every exported function, class, interface, and component has a doc comment
- [ ] Summary line describes purpose, not just repeats the name
- [ ] Non-obvious parameters and edge cases are called out (types themselves aren't re-explained in TS)
- [ ] `@returns` / `@throws` documented where behavior isn't obvious
- [ ] `@deprecated` / `@example` used where relevant

### D. Pull request review

- [ ] No leftover debug comments
- [ ] Comments touched by this diff still match the new code
- [ ] New non-obvious logic (algorithms, regex, business rules) has a "why" comment
- [ ] Security-sensitive code — auth checks, RLS policies, permission logic — has explicit reasoning, not just a description
- [ ] No comment simply restates self-explanatory code

### E. Project / DevOps level

- [ ] README covers setup, env vars, and architecture at a glance
- [ ] CI/CD YAML comments explain non-obvious steps or secret usage
- [ ] Dockerfile comments explain non-default base image or build-stage choices
- [ ] IaC (Terraform, etc.) comments explain deviations from defaults
- [ ] An ADR exists for decisions that would be expensive to reverse

---

## 10. Quick Reference

| Situation                  | Do this                                  |
| -------------------------- | ---------------------------------------- |
| Obvious code               | No comment                               |
| Non-obvious _why_          | Short comment above the line             |
| Public function/class      | Full doc comment (TSDoc/JSDoc/Javadoc)   |
| Temporary workaround       | `HACK` comment explaining the constraint |
| Known future work          | `TODO(owner): description — TICKET-ID`   |
| Old logic no longer needed | Delete it — don't comment it out         |
| Big architectural decision | Write an ADR, not a giant code comment   |

---

_References: Robert C. Martin,_ Clean Code _(Ch. 4); Google Style Guides; PEP 8 / PEP 257; TSDoc spec (tsdoc.org); JSDoc spec (jsdoc.app); Oracle Javadoc conventions; Conventional Comments (conventionalcomments.org); ISO/IEC 25010; Keep a Changelog; Michael Nygard's ADR template._
