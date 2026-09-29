-- Article interactions (ADR-010 §6): one vote and one comment per user per article, and the users
-- mentioned in a comment. Interactions belong to the article, not to a translation.

CREATE TABLE article_votes (
    article_id  uuid         NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    user_id     uuid         NOT NULL REFERENCES users (id),
    value       smallint     NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT article_votes_pk PRIMARY KEY (article_id, user_id),
    CONSTRAINT article_votes_value_check CHECK (value IN (1, -1))
);
CREATE INDEX article_votes_user_idx ON article_votes (user_id);

CREATE TABLE article_comments (
    id          uuid         PRIMARY KEY,
    article_id  uuid         NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    user_id     uuid         NOT NULL REFERENCES users (id),
    body        text         NOT NULL,
    status      varchar(16)  NOT NULL DEFAULT 'VISIBLE',
    edited_at   timestamptz,
    version     int          NOT NULL DEFAULT 0,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT article_comments_article_user_uq UNIQUE (article_id, user_id),
    CONSTRAINT article_comments_body_length CHECK (char_length(body) BETWEEN 1 AND 2000),
    CONSTRAINT article_comments_status_check CHECK (status IN ('VISIBLE', 'HIDDEN'))
);
CREATE INDEX article_comments_public_idx ON article_comments (article_id, created_at DESC) WHERE status = 'VISIBLE';
CREATE INDEX article_comments_user_idx ON article_comments (user_id);
CREATE INDEX article_comments_status_idx ON article_comments (status, created_at DESC);

CREATE TABLE comment_mentions (
    comment_id         uuid NOT NULL REFERENCES article_comments (id) ON DELETE CASCADE,
    mentioned_user_id  uuid NOT NULL REFERENCES users (id),
    CONSTRAINT comment_mentions_pk PRIMARY KEY (comment_id, mentioned_user_id)
);
CREATE INDEX comment_mentions_user_idx ON comment_mentions (mentioned_user_id);

ALTER TABLE article_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
