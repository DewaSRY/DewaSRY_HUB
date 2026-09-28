-- ADR-004 §5.5 content and media tables, with the ADR-009 §9 body format:
-- articles.body is Tiptap/ProseMirror JSON (jsonb) + body_schema_version, and
-- body_html is replaced by body_text + word_count.

CREATE TABLE categories (
    id          uuid         PRIMARY KEY,
    name        varchar(80)  NOT NULL,
    slug        varchar(120) NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT categories_slug_uq UNIQUE (slug),
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);
CREATE UNIQUE INDEX categories_name_lower_uq ON categories (lower(name));

CREATE TABLE tags (
    id          uuid         PRIMARY KEY,
    name        varchar(80)  NOT NULL,
    slug        varchar(120) NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT tags_slug_uq UNIQUE (slug),
    CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);
CREATE UNIQUE INDEX tags_name_lower_uq ON tags (lower(name));

CREATE TABLE images (
    id              uuid         PRIMARY KEY,
    content_hash    char(64)     NOT NULL,
    s3_key_prefix   varchar(200) NOT NULL,
    variant_widths  int[]        NOT NULL DEFAULT '{480,960,1600}',
    width           int          NOT NULL,
    height          int          NOT NULL,
    file_name       varchar(255) NOT NULL,
    size_bytes      bigint       NOT NULL,
    alt             varchar(250) NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT images_content_hash_uq UNIQUE (content_hash)
);
CREATE INDEX images_created_at_idx ON images (created_at DESC);

CREATE TABLE articles (
    id                   uuid         PRIMARY KEY,
    slug                 varchar(120) NOT NULL,
    title                varchar(200) NOT NULL,
    excerpt              varchar(500),
    body                 jsonb        NOT NULL DEFAULT '{"type":"doc","content":[]}',
    body_schema_version  smallint     NOT NULL DEFAULT 1,
    body_text            text         NOT NULL DEFAULT '',
    word_count           int          NOT NULL DEFAULT 0,
    cover_image_id       uuid         REFERENCES images (id) ON DELETE RESTRICT,
    category_id          uuid         REFERENCES categories (id) ON DELETE RESTRICT,
    meta_title           varchar(200),
    meta_description     varchar(320),
    status               varchar(16)  NOT NULL DEFAULT 'DRAFT',
    published_at         timestamptz,
    version              int          NOT NULL DEFAULT 0,
    created_at           timestamptz  NOT NULL DEFAULT now(),
    updated_at           timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT articles_slug_uq UNIQUE (slug),
    CONSTRAINT articles_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT articles_status_check CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT articles_body_is_object CHECK (jsonb_typeof(body) = 'object'),
    CONSTRAINT articles_word_count_check CHECK (word_count >= 0),
    CONSTRAINT articles_publish_complete CHECK (
        status <> 'PUBLISHED'
        OR (excerpt IS NOT NULL AND category_id IS NOT NULL AND published_at IS NOT NULL)
    )
);
CREATE INDEX articles_published_idx ON articles (published_at DESC) WHERE status = 'PUBLISHED';
CREATE INDEX articles_category_published_idx ON articles (category_id, published_at DESC);
CREATE INDEX articles_updated_at_idx ON articles (updated_at DESC);
CREATE INDEX articles_cover_image_idx ON articles (cover_image_id);

CREATE TABLE article_tags (
    article_id  uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    tag_id      uuid NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
CREATE INDEX article_tags_tag_idx ON article_tags (tag_id);

CREATE TABLE article_slug_history (
    old_slug    varchar(120) PRIMARY KEY,
    article_id  uuid         NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX article_slug_history_article_idx ON article_slug_history (article_id);

-- Rebuilt from the `image` nodes in `body` on every save (ADR-009 §4.3).
CREATE TABLE article_body_images (
    article_id  uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    image_id    uuid NOT NULL REFERENCES images (id) ON DELETE RESTRICT,
    PRIMARY KEY (article_id, image_id)
);
CREATE INDEX article_body_images_image_idx ON article_body_images (image_id);
