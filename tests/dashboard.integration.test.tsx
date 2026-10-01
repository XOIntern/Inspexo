import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

// The page gates on requireUser(): stub an authenticated auditor and the
// site list so the test exercises rendering, not the session layer
// (covered by tests/auth/* against live Postgres).
vi.mock("@/src/lib/auth/server-user", () => ({
  requireUser: async () => ({
    id: "u-auditor-1",
    name: "Rudi Hartono",
    email: "rudi@inspexo.id",
    role: "auditor",
    status: "active",
    department: null,
    emailVerified: true,
    mustChangePassword: false,
    siteIds: ["s-plant-1"],
  }),
}));

vi.mock("@/src/lib/auth/admin-queries", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/src/lib/auth/admin-queries")>();
  return {
    ...mod,
    listSites: async () => [{ id: "s-plant-1", code: "plant-1", name: "Plant 1" }],
  };
});

// jsdom tidak punya matchMedia — stub sebelum React Query/Recharts/Sidebar init.
beforeAll(() => {
  window.matchMedia = window.matchMedia ?? ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

// Recharts butuh ukuran element; di jsdom semua 0 — diamkan saja peringatannya.
describe("Dashboard page (HSE)", () => {
  it("renders HSE cards, chart title, and findings table", async () => {
    render(await DashboardPage());

    // Section cards sesuai PRD E6-2
    expect(screen.getByText("Open Findings")).toBeInTheDocument();
    expect(screen.getByText("Overdue Actions")).toBeInTheDocument();
    expect(screen.getByText("Audits in Progress")).toBeInTheDocument();
    expect(screen.getByText("Audit Completion")).toBeInTheDocument();

    // Chart
    expect(screen.getByText("Open Findings Trend")).toBeInTheDocument();

    // Findings table: baris pertama data.json
    expect(screen.getByText("Guard house floor is slippery")).toBeInTheDocument();
    expect(screen.getAllByText("Plant 1").length).toBeGreaterThan(0);
  });

  it("renders sidebar nav with InspeXO brand", async () => {
    render(await DashboardPage());

    expect(screen.getAllByText("InspeXO").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /audits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /findings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /corrective actions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reports/i })).toBeInTheDocument();
  });
});
