-- ADR-004 §5.2 products and plans.

CREATE TABLE products (
    id           uuid         PRIMARY KEY,
    code         varchar(64)  NOT NULL,
    name         varchar(120) NOT NULL,
    description  text,
    website_url  text,
    active       boolean      NOT NULL DEFAULT true,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT products_code_uq UNIQUE (code),
    CONSTRAINT products_code_format CHECK (code ~ '^[a-z0-9-]+$')
);

CREATE TABLE plans (
    id              uuid         PRIMARY KEY,
    product_id      uuid         NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    code            varchar(64)  NOT NULL,
    name            varchar(120) NOT NULL,
    price_amount    bigint       NOT NULL,
    currency        char(3)      NOT NULL DEFAULT 'IDR',
    billing_period  varchar(16),
    features        jsonb        NOT NULL DEFAULT '{}',
    is_public       boolean      NOT NULL DEFAULT true,
    active          boolean      NOT NULL DEFAULT true,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT plans_code_uq UNIQUE (code),
    CONSTRAINT plans_code_format CHECK (code ~ '^[a-z0-9-]+$'),
    CONSTRAINT plans_price_check CHECK (price_amount >= 0),
    CONSTRAINT plans_currency_check CHECK (currency = 'IDR'),
    CONSTRAINT plans_billing_period_check CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
    CONSTRAINT plans_features_is_object CHECK (jsonb_typeof(features) = 'object'),
    CONSTRAINT plans_free_has_no_period CHECK ((price_amount = 0) = (billing_period IS NULL)),
    CONSTRAINT plans_id_product_uq UNIQUE (id, product_id)
);
CREATE UNIQUE INDEX plans_one_free_per_product ON plans (product_id) WHERE price_amount = 0 AND active;
CREATE INDEX plans_public_active_idx ON plans (product_id) WHERE active AND is_public;
