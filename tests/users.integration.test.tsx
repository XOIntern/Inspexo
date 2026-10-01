import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UserTable } from "@/app/dashboard/users/user-table";
import { sampleUsers, userFormSchema } from "@/app/dashboard/users/users-data";

// usePathname butuh router context — stub untuk uji active-state sidebar.
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/users",
}));

// jsdom tidak punya matchMedia — stub sebelum Sidebar init.
beforeAll(() => {
  window.matchMedia = window.matchMedia ?? ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe("Users page", () => {
  it("renders sidebar nav with Users link", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );

    expect(screen.getAllByText("InspeXO").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /users/i })).toHaveAttribute(
      "href",
      "/dashboard/users"
    );
  });

  it("marks Users as active and Dashboard inactive on /dashboard/users", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );

    // base-ui merender state jadi atribut present-tanpa-nilai (data-active="").
    expect(screen.getByRole("link", { name: /users/i })).toHaveAttribute("data-active", "");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("data-active");
  });

  it("renders the user table with sample data", () => {
    render(<UserTable data={sampleUsers} />);

    expect(screen.getByText("Rina Kusuma")).toBeInTheDocument();
    expect(screen.getByText("rina.kusuma@inspexo.id")).toBeInTheDocument();
    expect(screen.getAllByText("Auditee").length).toBeGreaterThan(0);
  });

  it("filters rows by search term", async () => {
    const user = userEvent.setup();
    render(<UserTable data={sampleUsers} />);

    await user.type(screen.getByPlaceholderText(/search/i), "budi");

    expect(screen.queryByText("Rina Kusuma")).not.toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
  });

  it("paginates the user table (12 sample users, 10 per page)", async () => {
    const user = userEvent.setup();
    render(<UserTable data={sampleUsers} />);

    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Lina Marlina")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to next page/i }));
    expect(screen.getByText("Lina Marlina")).toBeInTheDocument();
  });

  it("filters by role", async () => {
    const user = userEvent.setup();
    render(<UserTable data={sampleUsers} />);

    await user.click(screen.getByRole("combobox", { name: /filter role/i }));
    await user.click(screen.getByRole("option", { name: "Verificator" }));

    expect(screen.getByText("Dewi Lestari")).toBeInTheDocument();
    expect(screen.queryByText("Rina Kusuma")).not.toBeInTheDocument();
  });

  it("opens the create dialog with a form", async () => {
    const user = userEvent.setup();
    render(<UserTable data={sampleUsers} />);

    await user.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("rejects an invalid email in the create form via zod schema", () => {
    const result = userFormSchema.safeParse({
      name: "X",
      email: "not-an-email",
      role: "auditee",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});
