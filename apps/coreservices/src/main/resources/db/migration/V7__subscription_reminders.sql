-- ADR-004 §5.3 (phase 4, optional): renewal reminder bookkeeping. No code writes to it yet;
-- it exists so the reminder job (ADR-002 UC-13 step 3) can be added without a schema change.

CREATE TABLE subscription_reminders (
    subscription_id  uuid        NOT NULL REFERENCES subscriptions (id) ON DELETE RESTRICT,
    kind             varchar(8)  NOT NULL,
    end_date         timestamptz NOT NULL,
    sent_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscription_reminders_kind_check CHECK (kind IN ('D7', 'D1')),
    PRIMARY KEY (subscription_id, kind, end_date)
);
