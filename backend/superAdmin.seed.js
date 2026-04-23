const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

async function seedSuperAdmin() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "survivour",
    database: "ecommerce_db"
  });

  const hashedPassword = await bcrypt.hash("Anuradha@12345", 10);

  // 1. Insert user
  const [userResult] = await db.execute(
    `INSERT INTO users (first_name, last_name, email, password_hash, address, phone)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "Stylewith",
      "Anu",
      "bwit23.anu@ismt.edu.np",
      hashedPassword,
      "Butwal",
      "9816435462"
    ]
  );

  const userId = userResult.insertId;

  // 2. Assign superadmin role (assume role_id = 1)
  await db.execute(
    `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
    [userId, 1]
  );

  console.log("✅ Super Admin seeded successfully!");
  process.exit();
}

seedSuperAdmin();