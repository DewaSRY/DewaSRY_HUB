-- ADR-004 §5.1 identity + §5.2 product credentials.

CREATE TABLE users (
    id               uuid         PRIMARY KEY,
    firebase_uid     varchar(128) NOT NULL,
    email            varchar(320) NOT NULL,
    name             varchar(200) NOT NULL,
    avatar_url       text,
    role             varchar(16)  NOT NULL DEFAULT 'USER',
    last_sign_in_at  timestamptz,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT users_firebase_uid_uq UNIQUE (firebase_uid),
    CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'))
);
CREATE INDEX users_email_lower_idx ON users (lower(email));
CREATE INDEX users_created_at_idx ON users (created_at DESC);

CREATE TABLE user_products (
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    product_id  uuid        NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    joined_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);
CREATE INDEX user_products_product_idx ON user_products (product_id, joined_at);

CREATE TABLE product_credentials (
    id            uuid        PRIMARY KEY,
    product_id    uuid        NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    client_id     varchar(64) NOT NULL,
    secret_hash   text        NOT NULL,
    last_used_at  timestamptz,
    revoked_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_credentials_client_id_uq UNIQUE (client_id)
);
CREATE INDEX product_credentials_active_idx ON product_credentials (product_id) WHERE revoked_at IS NULL;
