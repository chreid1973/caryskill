# PR1 – Hide Own Listings in Browse (Drop-in Patch)

This ZIP contains only the new/changed files needed for PR1. Merge these into your project, keeping the same paths.

## Files
- `src/auth/useCurrentUser.ts` – convenience hook (adjust AuthContext import path if needed)
- `src/features/browse/BrowseList.tsx` – filtering logic and server-side exclusion query support
- `src/pages/BrowsePage.tsx` – enables `hideOwn` by default
- `src/types.ts` – ensures `Listing` includes `ownerId`
- `src/features/browse/BrowseList.test.tsx` – unit tests (Vitest + RTL)

## How to apply
1. Copy the `src/` files into your repo (preserving folders).
2. Ensure your AuthContext export path matches the import in `useCurrentUser.ts`.
3. If your API supports it, implement `ownerId_ne` on `GET /api/listings` for server-side filtering (optional). Client-side filtering is already included.
4. Run:
   ```bash
   npm ci
   npm run test -- --ci
   npm run build
   ```
5. Open the app, create a listing as your user, and confirm it **does not** appear in Browse.

## Notes
- If your `Listing` type or auth shape differ, tweak accordingly.
- This patch avoids any styling or routing changes beyond the Browse page.
