const readline = require("readline");
const bcrypt = require("bcryptjs");
const pool = require("./config/db");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (text) => {
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};

const createOwner = async () => {
    try {
        console.log("\n==============================");
        console.log("   KIRANA STORE OWNER SETUP");
        console.log("==============================\n");

        const name = await question("Owner name: ");
        const phone = await question("Owner phone: ");
        const password = await question("Owner password: ");

        if (!name || !phone || !password) {
            console.log("\nAll fields are required.");
            return;
        }

        // Check if an owner already exists
        const existingOwner = await pool.query(
            `SELECT id FROM users WHERE role = 'OWNER' LIMIT 1`
        );

        if (existingOwner.rows.length > 0) {
            console.log("\nAn OWNER account already exists.");
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create owner
        const result = await pool.query(
            `INSERT INTO users (
                name,
                phone,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, 'OWNER')
            RETURNING id, name, phone, role, created_at`,
            [name, phone, passwordHash]
        );

        console.log("\n================================");
        console.log("Owner created successfully!");
        console.log("================================");
        console.log(result.rows[0]);
    } catch (error) {
        console.error("\nFailed to create owner:", error.message);
    } finally {
        rl.close();
        await pool.end();
    }
};

createOwner();