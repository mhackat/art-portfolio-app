import { createSwaggerSpec } from "next-swagger-doc";

// Tags for endpoints that exist and work, but aren't publicly documented.
const HIDDEN_TAGS = ["Admin", "API Keys", "Uploads"];

function hideTaggedPaths(spec: Record<string, unknown>, tags: string[]): Record<string, unknown> {
  const paths = spec.paths as Record<string, Record<string, { tags?: string[] }>> | undefined;
  if (!paths) return spec;

  const filteredPaths: Record<string, Record<string, { tags?: string[] }>> = {};
  for (const [path, operations] of Object.entries(paths)) {
    const filteredOperations = Object.fromEntries(
      Object.entries(operations).filter(([, operation]) => !operation.tags?.some((t) => tags.includes(t)))
    );
    if (Object.keys(filteredOperations).length > 0) {
      filteredPaths[path] = filteredOperations;
    }
  }

  return { ...spec, paths: filteredPaths };
}

export const getApiDocs = (): Record<string, unknown> => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Art Portfolio API",
        version: "1.0.0",
        description:
          "API for managing user art portfolios and bios. Users may only modify their own resources. " +
          "Authenticate by generating a personal API key from the dashboard (or via POST /api/auth/login) " +
          "and sending it as `Authorization: Bearer <key>`. The web dashboard itself authenticates via " +
          "its own browser session automatically and isn't affected by this.",
      },
      servers: [
        { url: process.env.NEXTAUTH_URL || "http://localhost:3000", description: process.env.APP_ENV || "local" },
      ],
      components: {
        securitySchemes: {
          apiKeyAuth: {
            type: "http",
            scheme: "bearer",
            description: "A personal API key generated from the dashboard, sent as a Bearer token.",
          },
        },
        schemas: {
          Artwork: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              imageUrl: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          Error: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
      security: [{ apiKeyAuth: [] }],
    },
  }) as Record<string, unknown>;

  return hideTaggedPaths(spec, HIDDEN_TAGS);
};
