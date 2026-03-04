import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "neo4j-driver"],
};

export default nextConfig;
