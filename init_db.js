const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function init() {
    // Connect to default 'postgres' database to create 'godrive' if it doesn't exist
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: 'postgres' 
    });

    try {
        await client.connect();
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'godrive'");
        if (res.rowCount === 0) {
            await client.query('CREATE DATABASE godrive');
            console.log('Database godrive created.');
        } else {
            console.log('Database godrive already exists.');
        }
        await client.end();

        // Connect to 'godrive' to create tables
        const dbClient = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });
        await dbClient.connect();
        const sql = fs.readFileSync('database.sql', 'utf8');
        await dbClient.query(sql);
        console.log('Tables created successfully.');
        await dbClient.end();
    } catch (err) {
        console.error('Error initializing database:', err.message);
        process.exit(1);
    }
}

init();
