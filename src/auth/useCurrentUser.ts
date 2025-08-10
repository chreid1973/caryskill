// src/auth/useCurrentUser.ts
// Lightweight hook for accessing the authenticated user.
// NOTE: Update the import path for AuthContext if your app structure differs.
import { useContext } from "react";
import { AuthContext } from "./AuthContext"; // <-- Adjust if needed

export function useCurrentUser() {
  const { currentUser } = useContext(AuthContext);
  return currentUser as { id: string } | undefined;
}
