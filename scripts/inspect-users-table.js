require('dotenv').config();
const db = require('../config/db');

async function main() {
    const cols = await db.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('columns:', cols.rows);

    const constraints = await db.query(
        "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'users'::regclass"
    );
    console.log('constraints:', constraints.rows);
}

main().catch(console.error);
