import descopeSdk from "@descope/web-js-sdk";

const sdk = descopeSdk({
  projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
  persistTokens: true, // Store tokens in localStorage
  autoRefresh: true,   // Automatically refresh session tokens
});

export default sdk;
