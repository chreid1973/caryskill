// src/pages/BrowsePage.tsx
import React from "react";
import { BrowseList } from "../features/browse/BrowseList";

export default function BrowsePage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tag = params.get("tag") || undefined;
  return <BrowseList tag={tag} hideOwn={true} />;
}
