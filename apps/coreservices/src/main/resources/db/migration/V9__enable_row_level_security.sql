-- ADR-001 §5.6 security rules: enable Row Level Security with no policies on every table, so the
-- Supabase anon/authenticated roles can read nothing even if the Data API is switched on by
-- mistake. The API role owns the tables and therefore bypasses RLS (RLS is not FORCEd).

ALTER TABLE categories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE images                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_slug_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_body_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_credentials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shedlock                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_reminders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_redirect_uris      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_codes                  ENABLE ROW LEVEL SECURITY;
