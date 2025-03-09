// test-connection.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:postgres@localhost:5432/postgres",
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Successfully connected to PostgreSQL");

    // Check if financeforge database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname='financeforge'"
    );

    if (result.rows.length > 0) {
      console.log("✅ financeforge database exists");
    } else {
      console.log("❌ financeforge database does not exist");
    }

    client.release();
  } catch (err) {
    console.error("❌ Database connection error:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
