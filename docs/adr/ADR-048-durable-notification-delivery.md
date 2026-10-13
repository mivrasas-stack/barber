# ADR-048: Durable, Preference-Aware Notification Delivery

## Status

**ACCEPTED & CERTIFIED — Stage 4.3**

## Context

Barber Paradise already has a certified transactional event path:

```text
Business transaction
  -> PostgreSQL domain state + outbox_events (same transaction)
  -> Stage 4.0 durable outbox publisher
  -> Stage 4.1 BullMQ transport in Redis
  -> Stage 4.2 idempotent realtime bridge / WebSocket fanout
```

Stage 4.3 adds durable user-facing notifications without moving correctness into Redis, without calling external providers inside domain transactions, and without coupling business modules to any email/SMS/WhatsApp vendor.

The current repository already emits notification-relevant events including:

- appointment.created
- appointment.{confirmed|checked_in|in_progress|completed|cancelled|no_show}
- order.completed
- order.returned
- payment.intent.created.v1
- payment.succeeded.v1
- payment.failed.v1
- payment.canceled.v1
- payment.expired.v1
- payment.refund.succeeded.v1
- professional.created.v1
- professional.affiliation.requested.v1
- professional.affiliation.activated.v1
- professional.affiliation.suspended.v1
- professional.affiliation.ended.v1
- subscription.invoice.generated.v1
- subscription.invoice.paid.v1
- subscription.plan_change_scheduled.v1
- subscription.plan_changed.v1
- subscription.cancel_scheduled.v1
- subscription.cancelled.v1
- subscription.reactivated.v1
- subscription.resumed.v1
- subscription.suspended.v1
- subscription.trial_expired.v1
- subscription.trial_extended.v1

The existing admin notifications page is presentation-only and must not be treated as evidence of provider delivery.

## Decision

### 1. PostgreSQL remains authoritative

PostgreSQL is the source of truth for:

- notification intent;
- recipient identity;
- template identity/version;
- delivery state;
- user-visible inbox state;
- notification preferences;
- provider acknowledgement metadata;
- retry scheduling;
- terminal failure/dead-letter state;
- suppressions caused by bounce/complaint/opt-out.

Redis and BullMQ remain ephemeral transport/worker infrastructure.

### 2. Notification delivery is derived from committed domain events

Domain use cases MUST NOT call email, SMS, WhatsApp, push, or other providers directly.

The flow is:

```text
Domain mutation + outbox event
        |
        v
PostgreSQL COMMIT
        |
        v
Outbox Publisher
        |
        v
BullMQ
        |
        v
Notification Event Consumer
        |
        +--> policy / recipient resolution
        +--> preferences / mandatory rules
        +--> durable notification_intent
        +--> durable channel delivery rows
        |
        v
Channel Workers
        |
        v
Provider-neutral adapters
```

External I/O happens only after the originating business transaction has committed.

### 3. Idempotency

A notification intent is uniquely identified by a deterministic deduplication key derived from:

```text
eventId + recipientIdentity + notificationPolicy + templateVersion
```

Each channel delivery is uniquely identified by:

```text
notificationIntentId + channel
```

Consumers are safe under at-least-once event delivery. Reprocessing the same event MUST NOT create duplicate inbox items or duplicate external sends.

Provider idempotency keys SHOULD use the durable delivery ID when a provider supports them.

### 4. Durable data model

Stage 4.3B should introduce the following concepts.

#### notification_intents

One logical user-facing notification.

Recommended fields:

- id
- sourceEventId
- sourceEventType
- tenantId
- locationId nullable
- recipientUserId nullable
- recipientKind
- recipientReference
- category
- policyKey
- templateKey
- templateVersion
- locale
- timezone
- payload/json data restricted to template-safe fields
- dedupeKey unique
- mandatory
- status
- createdAt
- updatedAt

The notification payload is not a raw copy of the domain outbox payload. A whitelist mapper must produce a minimal template-safe projection.

#### notification_deliveries

One channel delivery for one intent.

Recommended fields:

- id
- notificationIntentId
- channel: IN_APP | EMAIL | SMS | WHATSAPP
- status: PENDING | PROCESSING | SENT | DELIVERED | FAILED | SUPPRESSED | DEAD_LETTER
- destinationHash
- destinationMasked
- provider
- providerMessageId
- attempts
- maxAttempts
- nextAttemptAt
- lockedAt
- lockedBy
- lockExpiresAt
- sentAt
- deliveredAt
- failedAt
- lastError
- createdAt
- updatedAt

Raw provider credentials are never persisted. Raw destination values should be resolved as late as possible and never logged.

#### notification_inbox_items

Durable in-app state for authenticated users:

- id
- notificationIntentId
- userId
- tenantId
- readAt
- archivedAt
- createdAt

Unique notificationIntentId + userId.

#### notification_preferences

Per-user / per-tenant preferences:

- userId
- tenantId nullable
- category
- emailEnabled
- smsEnabled
- whatsappEnabled
- inAppEnabled
- quietHoursEnabled
- quietHoursStart
- quietHoursEnd
- timezone
- locale
- updatedAt

Preferences may disable optional channels, but cannot suppress legally/security/transactionally mandatory notices defined by policy.

#### notification_suppressions

Durable suppression registry for external destinations:

- channel
- destinationHash
- reason
- source
- createdAt
- expiresAt nullable

Used for hard bounce, provider complaint, explicit channel opt-out, invalid address/number, or abuse protection.

### 5. Policy registry, not ad-hoc conditionals

A central Notification Policy Registry maps supported event types to:

- category;
- recipient resolver;
- template key and version;
- allowed channels;
- mandatory channels;
- quiet-hour bypass;
- deduplication semantics;
- payload sanitizer/mapper.

Unregistered event types are ignored safely and never trigger external messages.

### 6. Initial channel classification

This classification is a policy baseline and may be refined when product requirements are measured.

| Event family | IN_APP | EMAIL | SMS | WHATSAPP | Notes |
| --- | --- | --- | --- | --- | --- |
| appointment.created / confirmed / cancelled | yes | yes | optional | optional | Transactional; cancellation must bypass marketing opt-out |
| appointment.checked_in / in_progress | realtime-first | no | no | no | Avoid external spam |
| appointment.completed | yes | optional | no | no | Receipt/review workflows may be added later |
| appointment.no_show | yes | optional | no | no | Operational/customer record |
| order.completed / returned | yes | yes | optional | no by default | Transactional receipt / return |
| payment.succeeded / failed / refund.succeeded | yes | yes | optional | no by default | Financial transactional notice |
| payment.intent.created / canceled / expired | realtime/in-app depending UX | no by default | no | no | Avoid duplicate payment noise |
| professional affiliation requested / activated / suspended / ended | yes | yes | optional | no | Transactional workspace relationship |
| professional.created | yes | optional welcome email | no | no | Only after recipient resolution is explicit |
| subscription invoice generated / paid | yes | yes | no | no | Billing-owner/admin notice |
| subscription suspended / trial expired / cancelled | yes | yes | optional only if explicitly configured | no | Mandatory account-impact notice |
| subscription plan changes / resume / reactivate / trial extended | yes | yes | no | no | Transactional account lifecycle |
| internal audit/system/provider-webhook records | no | no | no | no | Never customer-facing |

Marketing campaigns are explicitly NOT implemented by Stage 4.3 transactional notification infrastructure.

### 7. Mandatory versus optional delivery

Mandatory policy examples:

- security/account access notices;
- appointment cancellation or material schedule change;
- payment success/failure when money movement is customer-visible;
- refund confirmation;
- subscription suspension/cancellation/billing failure;
- legally required billing notices.

Mandatory does not mean “send every channel”. It means the policy cannot be fully suppressed. The registry chooses a minimum reliable channel, normally IN_APP plus EMAIL when a verified email exists.

Optional examples:

- appointment reminders on SMS/WhatsApp;
- review requests;
- product recommendations;
- marketing/campaign messages.

Optional delivery respects explicit preference and consent.

### 8. Quiet hours and timezone

Quiet hours apply only to deferrable external channels.

Timezone resolution order:

1. explicit user notification preference timezone;
2. appointment/location timezone for appointment notifications;
3. tenant defaultTimezone;
4. UTC only as a safe technical fallback.

During quiet hours:

- IN_APP may be persisted immediately;
- realtime may continue because it is not external contact;
- optional SMS/WhatsApp/email may be scheduled for the next allowed window;
- security, cancellation, payment-impact, and explicitly urgent mandatory notifications may bypass quiet hours by policy.

All scheduling is stored as UTC instants. Quiet-hour evaluation occurs using IANA timezone identifiers.

### 9. Provider-neutral interfaces

Core modules depend on interfaces, not vendors:

```ts
NotificationChannelProvider.send(message, signal)
NotificationTemplateRenderer.render(templateKey, version, locale, data)
NotificationRecipientResolver.resolve(policy, event)
NotificationPreferenceService.evaluate(recipient, category, channel)
```

Provider implementations belong to infrastructure.

No SendGrid, Resend, SES, Twilio, Meta WhatsApp, or other vendor type may leak into domain/application contracts.

### 10. Retry and terminal failure

Notification delivery uses at-least-once processing.

- worker claims a bounded delivery batch;
- provider call happens outside PostgreSQL transaction;
- transient error -> FAILED + bounded exponential backoff with jitter;
- non-retryable invalid destination -> SUPPRESSED or DEAD_LETTER;
- exhausted retries -> DEAD_LETTER;
- stale worker cannot settle a lease owned by another worker;
- provider success followed by worker crash may cause retry, therefore provider idempotency keys are used where available.

Provider retry semantics must not compete with PostgreSQL retry ownership in a way that creates retry storms.

### 11. Provider callbacks

Provider webhook/callback handling is a later part of Stage 4.3C and must be:

- cryptographically verified when supported;
- idempotent on provider event/message identity;
- capable of transitioning SENT -> DELIVERED / FAILED / SUPPRESSED;
- safe against duplicate/out-of-order callbacks;
- incapable of mutating unrelated tenant state.

### 12. PII and secret handling

Never log:

- raw email addresses unless an operationally justified masked representation is needed;
- full phone numbers;
- provider tokens;
- Authorization headers;
- rendered sensitive message bodies;
- outbox payloads wholesale.

Use destination hashes for correlation and masked destinations for support.

Template data must be allowlisted per policy.

### 13. Failure behavior

If Redis/BullMQ is unavailable:

- business transactions continue;
- PostgreSQL outbox remains durable;
- notification latency increases;
- no business state is corrupted.

If an external provider is unavailable:

- the durable delivery row is retried;
- other channels may proceed independently;
- no fallback to a second paid provider occurs unless an explicit policy enables it.

If the notification subsystem is entirely unavailable:

- source business transactions remain valid;
- missed delivery is visible through durable pending/failed/dead-letter state and operational metrics.

### 14. Relationship with realtime

Realtime and Notifications are siblings consuming the same durable event stream.

Realtime is ephemeral/best-effort client state fanout.
Notifications are durable recipient-oriented communications.

Realtime receipt MUST NOT mark a durable notification as externally delivered.

### 15. Non-goals

Stage 4.3 does not introduce:

- marketing automation/campaign builder;
- bulk newsletter sending;
- recommendation engines;
- microservice decomposition;
- Kubernetes;
- CDN/media infrastructure;
- Redis as notification source of truth;
- provider-specific logic in domain modules.

## Implementation sequence

### Stage 4.3B — Durable Notification Core

- schema/migration;
- policy registry;
- event-to-notification mapper;
- recipient resolution;
- preferences;
- inbox;
- idempotent intent creation;
- delivery claiming/leases/retries;
- deterministic tests.

### Stage 4.3C — Channel Workers & Provider Boundary

- EMAIL provider-neutral adapter and deterministic fake;
- SMS provider-neutral adapter and deterministic fake;
- WHATSAPP provider-neutral adapter and deterministic fake;
- provider configuration validation;
- quiet-hours scheduler;
- callback/webhook state transition foundation;
- metrics/logging;
- failure and concurrency tests.

External production vendors may be configured through adapters without changing core contracts.

### Stage 4.3D — API/UI Integration & Certification

- inbox APIs;
- read/archive APIs;
- preference APIs;
- admin operational delivery view;
- replace current mock notifications UI with real state;
- health/metrics integration;
- fresh DB migration certification;
- concurrency, duplicate-event, provider-timeout, cross-tenant, suppression and quiet-hour tests;
- typecheck/lint/test/build;
- freeze documentation.

## Consequences

### Positive

- Notification delivery is durable and auditable.
- Provider outages cannot corrupt bookings/payments/ledger state.
- At-least-once event delivery does not duplicate messages.
- Preferences and mandatory notices have explicit semantics.
- Future provider changes do not affect business modules.
- In-app notification history survives realtime disconnects.

### Negative / trade-offs

- Additional PostgreSQL rows and operational retention are required.
- Provider delivery still cannot guarantee exactly-once semantics end-to-end.
- Contact consent/compliance requires deliberate product policy.
- SMS/WhatsApp create variable external costs and must be rate/budget controlled.

## Certification rule

Stage 4.3 is not FROZEN until fresh-database migrations, concurrency/idempotency tests, provider timeout tests, tenant-isolation tests, suppression/preference tests, and the full existing suite all pass.
