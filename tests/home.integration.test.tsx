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

  it("navigates to /login after clicking Get started", () => {
    render(<Home />);

    const getStartedButton = screen.getByRole("button", {
      name: /get started/i,
    });

    fireEvent.click(getStartedButton);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});