// src/features/browse/BrowseList.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BrowseList } from "./BrowseList";

vi.mock("../../auth/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "me-123" }),
}));

const listings = [
  { id: "1", ownerId: "me-123", title: "My own listing", tags: ["wood"] },
  { id: "2", ownerId: "u-999",  title: "Other person's listing", tags: ["wood"] },
];

describe("BrowseList", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => listings,
    } as any);
  });
  afterEach(() => {
    (global.fetch as any).mockRestore?.();
  });

  it("hides my own listings when hideOwn=true", async () => {
    render(<BrowseList tag="wood" hideOwn={true} />);
    await waitFor(() => {
      expect(screen.queryByText("Other person's listing")).toBeInTheDocument();
      expect(screen.queryByText("My own listing")).not.toBeInTheDocument();
    });
  });

  it("shows my own listings when hideOwn=false", async () => {
    render(<BrowseList tag="wood" hideOwn={false} />);
    await waitFor(() => {
      expect(screen.queryByText("My own listing")).toBeInTheDocument();
      expect(screen.queryByText("Other person's listing")).toBeInTheDocument();
    });
  });
});
