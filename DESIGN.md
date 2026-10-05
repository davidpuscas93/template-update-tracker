# Template Update Tracker: Design

## 1. High-Level Architecture

### Overview

Users need to see which of their engagement files have pending template updates. Loading an engagement takes about a minute, and that can't be changed. So the tracker has to know which engagements have pending updates without ever loading one.

Two systems already exist: **the product template database**, shared between all firms and fast to query, and **an engagement system per firm**, which is slow to load from.

We add one backend service, `template-update-tracker`. It keeps its own record of every engagement and the template version it is on, so it never needs to load one. The existing systems keep that record current by sending it events:

- the template database, when a new template version is published;
- the engagement system, when an engagement is created or opened, or an update is accepted or declined.

The UI asks the tracker for pending updates through an API.

The tracker's tables:

```
engagements  engagement_id, firm_id, template_id, current_version, declined_version, declined_at
templates    template_id, latest_version
summaries    template_id, from_version, to_version, summary_text, status, model_id, generated_at
```



### Pending Updates

Updates a user hasn't decided on accumulate into one: the summary covers the whole jump (e.g. v3 -> v5), not one summary per version.

When a user declines an update, the tracker records it: each engagement row also stores the latest version the user declined. **An engagement has a pending update when the latest published version is newer than both its current version and its declined version**:

- v5 is published, the engagement file is on v3, nothing declined -> pending
- the user declines v5; latest is v5 -> not pending
- v6 is published; v6 is newer than both -> pending again

Declining doesn't hide later updates, but accepting v6 would still bring in v5's changes, so the UI shows a note alongside the summary: *Includes changes from v5, which you declined on 12 Oct.*

### Change Summaries

An LLM generates each summary from the JSON diff when a version is published, once per older version still in use, and the result is stored. Templates are shared, so one summary serves every firm on that version; at about one publish a week per template, that is a handful of LLM calls. If generation fails, it is retried the first time a user requests the summary.

### Assumptions

- Accepting moves an engagement to the latest version. Accepting up to an intermediate one (e.g. skipping a version whose standard isn't yet in effect) is out of scope for v1; per-pair summaries and a target version on the accept event would support it.
- Summaries describe changes to the template itself, not how they interact with edits a firm has made to its own engagements.
- The existing systems emit events only after the action is committed, so an engagement's real version only ever increases. This is what makes forward-only updates safe (see section 5).

### Where It Runs


| Piece                 | AWS service                | Why                                                                                                                                                      |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event intake | EventBridge -> SQS | Decouples the producers from the tracker; events wait in the queue if it's down. |
| Tracker logic and API | Lambda, behind API Gateway | Traffic is limited; no reason to keep a server running. |
| The three tables | RDS PostgreSQL | The core query, engagements on a template below a version, is an indexed `WHERE` on (`template_id`, `current_version`). Relational and small. |
| Summary generation | Bedrock | Template content stays inside the AWS account, which matters for a compliance-focused product. |

The tracker is written in TypeScript on Node.js, as plain Lambda handlers sharing one domain module (the pending rule, the coverage check). No web framework: each handler is small, and a framework's startup cost would land on every cold start.




## 2. Implementation Plan



### Phase 1 - Pending List

Event intake, the `engagements` and `templates` tables, and the API; the UI shows a badge on engagements with pending updates. The `engagements` table starts empty and fills two ways: "engagement opened" events (the load cost is already paid when a user opens one) and a one-off backfill for engagements nobody opens. Until an engagement is seen, it shows as "status unknown", never as "up to date".
*Users gain:* an at-a-glance view of what needs attention.

### Phase 2 - Change Summaries

Bedrock generation at publish time, the coverage check with its mechanical-list fallback, content team review (see section 4), summary storage, and on-request fallback.
*Users gain:* they can decide without reading raw template changes.

### Phase 3 - Refinements

The previously-declined note alongside summaries, the "this summary is wrong" action (see section 4), and accepting up to an intermediate version if it's wanted.
*Users gain:* they know when an update includes changes they already rejected, and can flag a wrong summary.

Phases 1 and 2 can be built in parallel: summary generation needs only the template database, plus a small query on `engagements` to choose which version pairs to generate.

## 3. Testing Strategy

Most bugs in such a system live where the pieces meet: event handlers, the DB, the queue. So most tests will be integration tests.

1. **Unit tests: the pure logic**. Two pieces have no I/O: the pending rule (given the latest, current and declined versions, return pending or not) and the summary coverage check (given the diff entries and the LLM's tags, pass or fail; see section 4). Both are tested as tables of cases.
2. **Integration tests: event handling and the API**. The tracker runs against a real Postgres (Testcontainers). Each test sends an event and checks the resulting row and API response. Two cases matter most:
   - the same event delivered twice changes nothing (SQS can deliver duplicates);
   - events arriving out of order never move a version backwards (SQS does not guarantee order; see section 5).
3. **Summaries**. Bedrock is replaced by a fake LLM returning fixed text, so tests are fast, free and repeatable. They check that the right version pairs are generated on publish, and that both fallbacks work: generation on first request, and the mechanical list after the coverage check fails twice. Text quality can't be asserted in a test (see section 4).



## 4. Evaluation & Observability



### Evaluation

A summary can fail by **invention** (describing a change that isn't in the diff) or **omission** (leaving one out). Omission is worse for an auditor: nothing on the UI hints at a change they never saw. Unlike most LLM tasks, this one has ground truth, the diff itself, so evaluation has three layers:

- **Automated check, on every summary**. The LLM tags each sentence with the diff entries it describes; plain code, not another LLM, checks that every entry is covered and every tag is real. On failure it retries once, then falls back to a mechanical list rendered from the diff: less readable, never wrong. This proves every change is mentioned, not that each is described correctly; the next two layers cover that.
- **Content team review**. The team that published the change reviews its summaries afterwards and can reject one (recorded in its `status`), which falls back to the mechanical list. With about one publish a week per template, this is realistic.
- **User feedback**. A "this summary is wrong" action on the UI, tracked per `model_id`, so a model change that makes summaries worse shows up quickly.



### Observability

Errors surface on their own; the bigger risk is data that is silently wrong. Each row below is one way that can happen, and how we'd find out. Metrics and alarms live in CloudWatch.

| What goes wrong | How we find out |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An event fails repeatedly and lands in the dead-letter queue | Alarm when it's not empty. Messages are replayed once the cause is fixed; idempotent handlers make that safe. |
| The tracker falls behind or stops | The age of the oldest message in the queue keeps rising. |
| An event is lost without any error | Drift on open: an "opened" event reports a newer version than stored. The row is corrected and the mismatch counted; the mismatch rate measures the table's accuracy. |
| Summaries get worse, e.g. after a model change | Coverage-check failures, mechanical-list fallbacks, rejections and user flags, per `model_id`. |
| The backfill hasn't finished | Share of engagements still in "status unknown". |

Every event carries a correlation ID, so one action, such as a user's accept, can be traced end to end. Exceptions, with stack traces, go to an error tracker such as Sentry.

## 5. Failure Modes & Tradeoffs



### Failure Modes


| Failure                                                | Effect                                      | Mitigation                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Duplicate event (SQS delivers at least once) | The same change applied twice | Handlers are idempotent upserts; a repeat changes nothing. |
| Events out of order | An old event could move a version backwards | Updates only move forward: `UPDATE ... WHERE current_version < $new`. |
| Bedrock unavailable, or a diff too large for one call | No summary | Large diffs are split by template section. If Bedrock is down, generation is retried on first request, with the mechanical list shown meanwhile. |
| Backfill competes with users for the engagement system | Slower opens for real users | Backfill is rate-limited and runs off-hours. |
| Many Lambdas each open a Postgres connection | Connection limit exhausted | RDS Proxy pools connections. Not expected at this traffic, but cheap insurance. |
| One tracker database holds every firm's data | A query leaks another firm's engagements | Every query is scoped by `firm_id`; the tracker stores only IDs and version numbers, never engagement content. |

### Tradeoffs

- **A separate record instead of reading engagements**. The tracker's copy can lag or briefly be wrong, which drift detection measures; the alternative is a one-minute load per engagement.
- **Summaries generated at publish, not on demand**. Some may be generated for engagements nobody opens, but users never wait, and at one publish a week the cost is negligible.
- **LLM summaries over a plain list of changes**. Readable for non-technical users, at the risk of errors, which the coverage check, review and mechanical-list fallback contain.
- **Latest-only accept**. Simpler model and UI; intermediate versions are deferred (see Assumptions).