-- Multilingual articles: title, excerpt, body and SEO fields move to one row per language.
-- Slug, cover, category, tags, status and the optimistic-lock version stay on `articles`
-- (shared by every language). Existing articles become Indonesian ('id') translations.

CREATE TABLE article_translations (
    id                   uuid         PRIMARY KEY,
    article_id           uuid         NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    locale               varchar(10)  NOT NULL,
    title                varchar(200) NOT NULL,
    excerpt              varchar(500),
    body                 jsonb        NOT NULL DEFAULT '{"type":"doc","content":[]}',
    body_schema_version  smallint     NOT NULL DEFAULT 1,
    body_text            text         NOT NULL DEFAULT '',
    word_count           int          NOT NULL DEFAULT 0,
    meta_title           varchar(200),
    meta_description     varchar(320),
    created_at           timestamptz  NOT NULL DEFAULT now(),
    updated_at           timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT article_translations_article_locale_uq UNIQUE (article_id, locale),
    CONSTRAINT article_translations_locale_format CHECK (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})?$'),
    CONSTRAINT article_translations_body_is_object CHECK (jsonb_typeof(body) = 'object'),
    CONSTRAINT article_translations_word_count_check CHECK (word_count >= 0)
);
CREATE INDEX article_translations_locale_idx ON article_translations (locale);

INSERT INTO article_translations (id, article_id, locale, title, excerpt, body, body_schema_version, body_text,
                                  word_count, meta_title, meta_description, created_at, updated_at)
SELECT gen_random_uuid(), id, 'id', title, excerpt, body, body_schema_version, body_text,
       word_count, meta_title, meta_description, created_at, updated_at
FROM articles;

-- The excerpt now lives per language; "every translation has an excerpt" is checked on publish.
ALTER TABLE articles DROP CONSTRAINT articles_publish_complete;
ALTER TABLE articles ADD CONSTRAINT articles_publish_complete CHECK (
    status <> 'PUBLISHED' OR (category_id IS NOT NULL AND published_at IS NOT NULL)
);
ALTER TABLE articles DROP CONSTRAINT articles_body_is_object;
ALTER TABLE articles DROP CONSTRAINT articles_word_count_check;
ALTER TABLE articles
    DROP COLUMN title,
    DROP COLUMN excerpt,
    DROP COLUMN body,
    DROP COLUMN body_schema_version,
    DROP COLUMN body_text,
    DROP COLUMN word_count,
    DROP COLUMN meta_title,
    DROP COLUMN meta_description;

ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;
