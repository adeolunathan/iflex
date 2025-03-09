// services/user-management/src/debug-jwt.ts

import jwt from "jsonwebtoken";
import { config } from "./config";

// Log environment and configuration
console.log("Environment Variables:");
console.log("JWT_SECRET=", process.env.JWT_SECRET);
console.log("Config JWT Secret:", config.jwtSecret);
console.log("Config JWT Expires:", config.jwtExpiresIn);

// Test token creation and verification
const payload = { test: "data", userId: "12345" };

// Create token
try {
  const token = jwt.sign(payload, config.jwtSecret);
  console.log("Generated Token:", token);

  // Decode token (without verification)
  const decoded = jwt.decode(token);
  console.log("Decoded Token (without verification):", decoded);

  // Verify token
  const verified = jwt.verify(token, config.jwtSecret);
  console.log("Verified Token:", verified);

  console.log(
    "JWT TEST: SUCCESS - Token verification works with current config"
  );
} catch (error) {
  console.error("JWT TEST: FAILED - Error in JWT process:", error);
}
