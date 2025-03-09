// services/user-management/scripts/test-login.ts

import { pgPool } from "../src/db";
import { comparePassword } from "../src/utils/auth";
import { connectDb } from "../src/db";

async function testLogin(email: string, password: string) {
  console.log(`Testing login for ${email}...`);

  // Initialize database connection
  await connectDb();

  try {
    // Get user by email
    const { rows } = await pgPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      console.error("❌ User not found in database");
      return;
    }

    const user = rows[0];

    // Check if user is active
    if (!user.is_active) {
      console.error("❌ User account is inactive");
      return;
    }

    // Check password
    console.log("Comparing password...");
    console.log("Stored password hash:", user.password_hash);

    const passwordValid = await comparePassword(password, user.password_hash);

    if (passwordValid) {
      console.log("✅ Password is correct!");
      console.log("User details:");
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Roles: ${user.roles}`);
      console.log(`Organization ID: ${user.organization_id}`);
    } else {
      console.error("❌ Password is incorrect");
    }
  } catch (error) {
    console.error("Error testing login:", error);
  } finally {
    await pgPool.end();
  }
}

// Test with both users
async function runTests() {
  await testLogin("admin@example.com", "admin123");
  console.log("\n-------------------\n");
  await testLogin("superadmin@example.com", "admin123");
}

runTests();
