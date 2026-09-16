-- Add permanent human-readable customer identifiers without changing internal IDs.
CREATE SEQUENCE IF NOT EXISTS customer_business_id_seq;

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20);

SELECT setval(
    'customer_business_id_seq',
    GREATEST(COALESCE((
        SELECT MAX(SUBSTRING(customer_code FROM 5)::BIGINT)
        FROM customers
        WHERE customer_code ~ '^CUS-[0-9]{6,}$'
    ), 0), 1),
    COALESCE((
        SELECT MAX(SUBSTRING(customer_code FROM 5)::BIGINT)
        FROM customers
        WHERE customer_code ~ '^CUS-[0-9]{6,}$'
    ), 0) > 0
);

UPDATE customers
SET customer_code = 'CUS-' || LPAD(nextval('customer_business_id_seq')::TEXT, 6, '0')
WHERE customer_code IS NULL;

ALTER TABLE customers
    ALTER COLUMN customer_code SET DEFAULT ('CUS-' || LPAD(nextval('customer_business_id_seq')::TEXT, 6, '0')),
    ALTER COLUMN customer_code SET NOT NULL;

ALTER TABLE customers
    DROP CONSTRAINT IF EXISTS customers_customer_code_key;

ALTER TABLE customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);

ALTER TABLE customers
    DROP CONSTRAINT IF EXISTS customers_customer_code_format_check;

ALTER TABLE customers
    ADD CONSTRAINT customers_customer_code_format_check
    CHECK (customer_code ~ '^CUS-[0-9]{6,}$');
