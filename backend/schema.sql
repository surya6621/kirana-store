-- =========================================
-- KIRANA STORE DATABASE
-- =========================================

-- =========================================
-- USERS
-- Owner / Staff accounts
-- =========================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF'
        CHECK (role IN ('OWNER', 'STAFF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- CATEGORIES
-- =========================================

CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- PRODUCTS
-- =========================================

CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    category_id BIGINT NOT NULL
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    description TEXT,

    unit VARCHAR(30) NOT NULL,

    selling_price NUMERIC(10,2) NOT NULL
        CHECK (selling_price >= 0),

    purchase_price NUMERIC(10,2)
        CHECK (purchase_price >= 0),

    minimum_stock NUMERIC(12,3) NOT NULL DEFAULT 0
        CHECK (minimum_stock >= 0),

    image_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- INVENTORY
-- Current stock of every product
-- =========================================

CREATE TABLE inventory (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL UNIQUE
        REFERENCES products(id)
        ON DELETE CASCADE,

    quantity NUMERIC(12,3) NOT NULL DEFAULT 0
        CHECK (quantity >= 0),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- INVENTORY TRANSACTIONS
-- Every stock movement is recorded here
-- =========================================

CREATE TABLE inventory_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,

    transaction_type VARCHAR(30) NOT NULL
        CHECK (
            transaction_type IN (
                'PURCHASE',
                'SALE',
                'RETURN',
                'DAMAGE',
                'ADJUSTMENT'
            )
        ),

    quantity_change NUMERIC(12,3) NOT NULL,

    reason TEXT,

    reference_id BIGINT,

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- CUSTOMERS
-- =========================================

CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) UNIQUE,

    address TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- SALES
-- Handles BOTH online and offline sales
-- =========================================

CREATE TABLE sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT
        REFERENCES customers(id)
        ON DELETE SET NULL,

    sale_type VARCHAR(20) NOT NULL
        CHECK (sale_type IN ('ONLINE', 'OFFLINE')),

    total_amount NUMERIC(12,2) NOT NULL
        CHECK (total_amount >= 0),

    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            payment_status IN (
                'PAID',
                'PARTIAL',
                'CREDIT',
                'PENDING'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
        CHECK (
            status IN (
                'PENDING',
                'CONFIRMED',
                'READY',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- SALE ITEMS
-- Products inside each sale
-- =========================================

CREATE TABLE sale_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sale_id BIGINT NOT NULL
        REFERENCES sales(id)
        ON DELETE CASCADE,

    product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,

    quantity NUMERIC(12,3) NOT NULL
        CHECK (quantity > 0),

    price NUMERIC(10,2) NOT NULL
        CHECK (price >= 0),

    discount NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (discount >= 0)
);


-- =========================================
-- PAYMENTS
-- Cash / UPI
-- Can support multiple payments for one sale
-- =========================================

CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sale_id BIGINT NOT NULL
        REFERENCES sales(id)
        ON DELETE CASCADE,

    payment_method VARCHAR(20) NOT NULL
        CHECK (
            payment_method IN (
                'CASH',
                'UPI'
            )
        ),

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- CUSTOMER CREDIT / UDHAAR
-- =========================================

CREATE TABLE customer_credit_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    sale_id BIGINT
        REFERENCES sales(id)
        ON DELETE SET NULL,

    transaction_type VARCHAR(20) NOT NULL
        CHECK (
            transaction_type IN (
                'CREDIT',
                'PAYMENT'
            )
        ),

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    description TEXT,

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- SUPPLIERS
-- =========================================

CREATE TABLE suppliers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    phone VARCHAR(20),

    address TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- PURCHASES
-- Stock purchased from suppliers
-- =========================================

CREATE TABLE purchases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    supplier_id BIGINT
        REFERENCES suppliers(id)
        ON DELETE SET NULL,

    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (total_amount >= 0),

    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID'
        CHECK (
            payment_status IN (
                'PAID',
                'PENDING',
                'PARTIAL'
            )
        ),

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- PURCHASE ITEMS
-- =========================================

CREATE TABLE purchase_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    purchase_id BIGINT NOT NULL
        REFERENCES purchases(id)
        ON DELETE CASCADE,

    product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,

    quantity NUMERIC(12,3) NOT NULL
        CHECK (quantity > 0),

    purchase_price NUMERIC(10,2) NOT NULL
        CHECK (purchase_price >= 0)
);


-- =========================================
-- DAILY FRUIT / VEGETABLE PRICES
-- =========================================

CREATE TABLE daily_prices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    price NUMERIC(10,2) NOT NULL
        CHECK (price >= 0),

    available_quantity NUMERIC(12,3) NOT NULL DEFAULT 0
        CHECK (available_quantity >= 0),

    price_date DATE NOT NULL DEFAULT CURRENT_DATE,

    updated_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (product_id, price_date)
);


-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_products_category
ON products(category_id);

CREATE INDEX idx_inventory_product
ON inventory(product_id);

CREATE INDEX idx_inventory_transactions_product
ON inventory_transactions(product_id);

CREATE INDEX idx_sales_created_at
ON sales(created_at);

CREATE INDEX idx_sales_customer
ON sales(customer_id);

CREATE INDEX idx_sale_items_sale
ON sale_items(sale_id);

CREATE INDEX idx_payments_sale
ON payments(sale_id);

CREATE INDEX idx_credit_customer
ON customer_credit_transactions(customer_id);

CREATE INDEX idx_purchases_supplier
ON purchases(supplier_id);

CREATE INDEX idx_daily_prices_date
ON daily_prices(price_date);