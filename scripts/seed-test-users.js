require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function main() {
    const hash = await bcrypt.hash('TestPass123!', 10);
    const users = [
        ['Customer One', 'client@test.com', 'client'],
        ['Driver One', 'driver@test.com', 'driver'],
        ['Admin One', 'admin@test.com', 'admin'],
    ];

    for (const [name, email, role] of users) {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            await db.query('UPDATE users SET name = $1, password = $2, role = $3 WHERE email = $4', [name, hash, role, email]);
        } else {
            await db.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, role]);
        }
    }

    console.log('Seed users OK');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
