import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { VerifyBanner } from "@/components/verify-banner";
import {
  parseImportFile,
  validateImportRows,
} from "@/app/admin/users/import/import-manager";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined }),
}));

beforeAll(() => {
  window.matchMedia = window.matchMedia ?? ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSidebar(role: string | undefined) {
  return render(
    <SidebarProvider>
      <AppSidebar role={role} />
    </SidebarProvider>
  );
}

describe("role-based sidebar", () => {
  it("shows admin entries to admins only", () => {
    const { unmount } = renderSidebar("admin");
    expect(screen.getByRole("link", { name: /administration/i })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /^users$/i })).toHaveAttribute("href", "/dashboard/users");
    unmount();
  });

  it("hides admin entries from auditees (UX only; backend still enforces)", () => {
    renderSidebar("auditee");
    expect(screen.queryByRole("link", { name: /administration/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^users$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });
});

describe("verify banner", () => {
  it("posts a resend and confirms", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<VerifyBanner userName="Sari" />);
    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /resend link/i }));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/resend-verification", { method: "POST" });
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });
});

const SITES = [
  { id: "s1", code: "plant-1", name: "Plant 1" },
  { id: "s2", code: "plant-2", name: "Plant 2" },
];

function workbookBuffer(rows: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "users");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown as ArrayBuffer;
}

const HEADER = ["name", "email", "role", "status", "sites", "department"];

describe("import parsing and validation", () => {
  it("parses a spreadsheet into rows", () => {
    const rows = parseImportFile(
      SITES,
      "users.xlsx",
      workbookBuffer([HEADER, ["Sari", "SARI@inspexo.id", "Auditee", "", "plant-1", ""]])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      index: 2,
      name: "Sari",
      email: "sari@inspexo.id",
      role: "auditee",
      status: "active",
      siteCodes: ["plant-1"],
    });
  });

  it("rejects files without required columns", () => {
    expect(() =>
      parseImportFile(SITES, "bad.xlsx", workbookBuffer([["foo"], ["x"]]))
    ).toThrow(/required columns/i);
  });

  it("flags bad email, role, site, cardinality, and duplicates", () => {
    const rows = parseImportFile(
      SITES,
      "users.xlsx",
      workbookBuffer([
        HEADER,
        ["Ok", "ok@inspexo.id", "auditee", "active", "plant-1", ""],
        ["Bad", "nope", "boss", "active", "nowhere", ""],
        ["Two", "two@inspexo.id", "auditee", "active", "plant-1,plant-2", ""],
        ["Dup", "ok@inspexo.id", "auditor", "active", "plant-1", ""],
      ])
    );
    const messages = validateImportRows(SITES, rows).map((i) => `row ${i.index}: ${i.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/row 3.*email/i),
        expect.stringMatching(/row 3.*role/i),
        expect.stringMatching(/row 3.*nowhere/i),
        expect.stringMatching(/row 4.*exactly one/i),
        expect.stringMatching(/row 5.*duplicate/i),
      ])
    );
    expect(messages.filter((m) => m.startsWith("row 2:"))).toEqual([]);
  });
});
