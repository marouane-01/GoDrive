CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('client', 'driver')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES users(id),
    driver_id INT REFERENCES users(id),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    transport_type VARCHAR(50) CHECK (transport_type IN ('local', 'inter-city', 'international')) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered')),
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    status VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);