import { fireEvent, render, screen, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("Home integration", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

it("navigates to /auth/login after splash and skeleton loading", () => {
  render(<Home />);

  const getStartedButton = screen.getByRole("button", {
    name: /sign in/i,
  });

  fireEvent.click(getStartedButton);

  // Splash Screen: 1600ms
  act(() => {
    vi.advanceTimersByTime(1600);
  });

  // Login Skeleton: 900ms
  act(() => {
    vi.advanceTimersByTime(900);
  });

  expect(pushMock).toHaveBeenCalledWith("/auth/login");
});

it("keeps exactly one Sign in button across mobile menu open and close", () => {
  render(<Home />);

  const signInQuery = { name: /sign in/i } as const;

  // (a) initial render
  expect(screen.getAllByRole("button", signInQuery)).toHaveLength(1);

  const toggle = screen.getByRole("button", { name: /open menu/i });
  expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");

  // (b) menu open
  fireEvent.click(toggle);
  expect(screen.getAllByRole("button", signInQuery)).toHaveLength(1);
  expect(screen.getByRole("button", { name: /close menu/i })).toBeVisible();

  // (c) closed again via Escape, focus returned to the toggle
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.getAllByRole("button", signInQuery)).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /close menu/i })).toBeNull();
  expect(screen.getByRole("button", { name: /open menu/i })).toHaveFocus();
});
});