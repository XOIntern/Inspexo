// Contract test: docs/openapi.yaml must describe every implemented route
// and describe nothing that does not exist. If this fails, either a route
// was added without documentation or the doc invented an endpoint.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routeFiles(full, out);
    } else if (entry === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

function routePath(file: string): string {
  const relative = file.split("app/api")[1]!.replace(/\/route\.ts$/, "");
  return `/api${relative.replace(/\[([^\]]+)\]/g, "{$1}")}`;
}

function exportedMethods(source: string): string[] {
  const found: string[] = [];
  for (const method of METHODS) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source)) {
      found.push(method.toLowerCase());
    }
  }
  return found;
}

describe("openapi contract", () => {
  const spec = parse(readFileSync("docs/openapi.yaml", "utf8")) as {
    paths: Record<string, Record<string, unknown>>;
  };
  const files = routeFiles("app/api");

  it("documents every implemented route and method", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const path = routePath(file);
      const methods = exportedMethods(readFileSync(file, "utf8"));
      expect(methods.length, `${file} exports no route handler`).toBeGreaterThan(0);
      expect(spec.paths[path], `${file} has no documented path`).toBeDefined();
      for (const method of methods) {
        expect(spec.paths[path]![method], `${method.toUpperCase()} ${path} is undocumented`).toBeDefined();
      }
    }
  });

  it("documents no endpoint that does not exist", () => {
    const implemented = new Set<string>();
    for (const file of files) {
      for (const method of exportedMethods(readFileSync(file, "utf8"))) {
        implemented.add(`${method.toUpperCase()} ${routePath(file)}`);
      }
    }
    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const method of Object.keys(operations)) {
        expect(
          implemented.has(`${method.toUpperCase()} ${path}`),
          `documented ${method.toUpperCase()} ${path} has no route file`,
        ).toBe(true);
      }
    }
  });

  it("covers the full endpoint inventory", () => {
    expect(Object.keys(spec.paths).sort()).toEqual(
      [
        "/api/admin/sites",
        "/api/admin/users",
        "/api/admin/users/credentials",
        "/api/admin/users/import",
        "/api/admin/users/{id}",
        "/api/admin/users/{id}/role",
        "/api/admin/users/{id}/sites",
        "/api/admin/users/{id}/status",
        "/api/auth/change-password",
        "/api/auth/forgot-password",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/me",
        "/api/auth/reset-password",
        "/api/auth/resend-verification",
        "/api/auth/session",
        "/api/auth/verify-email",
      ].sort(),
    );
  });
});
