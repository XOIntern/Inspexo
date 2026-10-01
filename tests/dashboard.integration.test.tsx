import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import DashboardPage from "@/app/dashboard/page";

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
  it("renders HSE cards, chart title, and findings table", () => {
    render(<DashboardPage />);

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

  it("renders sidebar nav with InspeXO brand", () => {
    render(<DashboardPage />);

    expect(screen.getAllByText("InspeXO").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /audits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /findings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /corrective actions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reports/i })).toBeInTheDocument();
  });
});
