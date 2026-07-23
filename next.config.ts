import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mysql2", "oracledb", "xlsx", "@node-rs/argon2"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
