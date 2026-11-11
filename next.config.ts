import type { NextConfig } from "next";

const config: NextConfig = {
  // pdf-parse/mammoth must run as plain Node modules, not bundled
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default config;
