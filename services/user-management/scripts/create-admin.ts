// services/user-management/scripts/create-admin.ts

import { pgPool } from "../src/db";
import { hashPassword } from "../src/utils/auth";
import { v4 as uuidv4 } from "uuid";

async function createAdminUser() {
  try {
    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      // Check if default organization exists
      const { rows: orgRows } = await client.query(
        "SELECT * FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'"
      );

      if (orgRows.length === 0) {
        console.log("Creating default organization...");
        await client.query(
          `INSERT INTO organizations (
            id, name, plan, is_active, created_at, updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'Default Organization',
            'BASIC',
            TRUE,
            NOW(),
            NOW()
          )`
        );
      }

      // Check if admin user exists
      const { rows: userRows } = await client.query(
        "SELECT * FROM users WHERE email = 'admin@example.com'"
      );

      if (userRows.length === 0) {
        console.log("Creating admin user...");

        // Create hash for password 'admin123'
        const passwordHash = await hashPassword("admin123");

        await client.query(
          `INSERT INTO users (
            id, email, password_hash, first_name, last_name, roles,
            organization_id, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )`,
          [
            uuidv4(),
            "admin@example.com",
            passwordHash,
            "Admin",
            "User",
            ["ADMIN"],
            "00000000-0000-0000-0000-000000000001",
            true,
            new Date(),
            new Date(),
          ]
        );

        console.log("Admin user created successfully!");
        console.log("Email: admin@example.com");
        console.log("Password: admin123");
      } else {
        console.log("Admin user already exists.");
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
