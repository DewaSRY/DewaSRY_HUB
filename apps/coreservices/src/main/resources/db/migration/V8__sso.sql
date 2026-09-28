-- Hub SSO (ADR-001 §5.7): registered redirect URIs per product and one-time authorization codes.
-- Not in ADR-004 yet (ADR-001 §9 lists it as a follow-up); documented in apps/coreservices/README.md.

-- Exact-match redirect URIs (no wildcards). HTTPS only, except http://localhost in development.
CREATE TABLE product_redirect_uris (
    id          uuid        PRIMARY KEY,
    product_id  uuid        NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    uri         text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_redirect_uris_uq UNIQUE (product_id, uri),
    CONSTRAINT product_redirect_uris_length CHECK (char_length(uri) <= 2000)
);

-- One-time authorization codes: random, single use, 60 s, stored only as a SHA-256 hash, tied to
-- the client, redirect URI, PKCE challenge, and user.
CREATE TABLE sso_codes (
    id              uuid         PRIMARY KEY,
    code_hash       char(64)     NOT NULL,
    user_id         uuid         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    product_id      uuid         NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    client_id       varchar(64)  NOT NULL,
    redirect_uri    text         NOT NULL,
    code_challenge  varchar(128) NOT NULL,
    expires_at      timestamptz  NOT NULL,
    used_at         timestamptz,
    cancelled_at    timestamptz,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT sso_codes_code_hash_uq UNIQUE (code_hash)
);
CREATE INDEX sso_codes_user_product_idx ON sso_codes (user_id, product_id) WHERE used_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX sso_codes_expires_idx ON sso_codes (expires_at);
