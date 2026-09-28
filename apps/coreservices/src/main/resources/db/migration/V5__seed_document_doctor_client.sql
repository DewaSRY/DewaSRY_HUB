-- ADR-004 §7: first Document Doctor credential. The Argon2id hash of the secret comes from the
-- Flyway placeholder `dd_client_secret_hash` (DD_CLIENT_SECRET_HASH, filled from SSM at deploy).
-- Nothing secret is in the repository. When the placeholder is empty (local, test) nothing is
-- inserted; the admin creates a credential with POST /admin/products/{id}/credentials instead.

INSERT INTO product_credentials (id, product_id, client_id, secret_hash)
SELECT gen_random_uuid(), p.id, '${dd_client_id}', '${dd_client_secret_hash}'
FROM products p
WHERE p.code = 'document-doctor'
  AND '${dd_client_secret_hash}' <> '';
