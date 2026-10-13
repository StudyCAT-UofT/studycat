import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Allow dev resources (e.g. HMR websocket) when accessed through the Shibboleth SP proxy
  allowedDevOrigins: ["sp.studycat.local"],
};

export default nextConfig;
