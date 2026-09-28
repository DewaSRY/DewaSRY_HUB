-- ADR-004 §8: Document Doctor and its two plans, needed by /public/products in phase 1.

INSERT INTO products (id, code, name, description, website_url, active)
VALUES (gen_random_uuid(), 'document-doctor', 'Document Doctor',
        'Fix, convert, and check documents in your browser.', NULL, true);

INSERT INTO plans (id, product_id, code, name, price_amount, currency, billing_period, features, is_public, active)
SELECT gen_random_uuid(), p.id, 'dd-free', 'Free', 0, 'IDR', NULL, '{"removeAds": false}'::jsonb, true, true
FROM products p WHERE p.code = 'document-doctor';

INSERT INTO plans (id, product_id, code, name, price_amount, currency, billing_period, features, is_public, active)
SELECT gen_random_uuid(), p.id, 'dd-pro-monthly', 'Pro', 49000, 'IDR', 'MONTHLY', '{"removeAds": true}'::jsonb, true, true
FROM products p WHERE p.code = 'document-doctor';
