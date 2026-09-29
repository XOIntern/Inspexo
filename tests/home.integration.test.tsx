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
});