// test-connection.js
// Quick script to test if a connection to the backend service is working

const fetch = require("node-fetch");

// The URL to test (this should be the user-management GraphQL endpoint)
const url = "http://localhost:4003/graphql";

// Simple GraphQL query to test the connection
const query = `
  query {
    __schema {
      queryType {
        name
      }
    }
  }
`;

async function testConnection() {
  try {
    console.log(`Testing connection to ${url}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      console.log("❌ Connection test failed - GraphQL errors occurred");
      return;
    }

    console.log("✅ Connection successful! The backend service is running.");
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.log("\nPossible solutions:");
    console.log(
      "1. Make sure the user-management service is running on port 4003"
    );
    console.log("2. Check if PostgreSQL and Redis are running and accessible");
    console.log(
      "3. Review the error logs in the user-management service terminal"
    );
  }
}

testConnection();
