// src/features/browse/BrowseList.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Listing } from "../../types";
import { useCurrentUser } from "../../auth/useCurrentUser";

type Props = {
  tag?: string;
  hideOwn?: boolean; // default true
};

export function BrowseList({ tag, hideOwn = true }: Props) {
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const me = useCurrentUser();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Prefer server-side exclusion if your API supports an ownerId_ne param:
        const qs = new URLSearchParams();
        if (tag) qs.set("tag", tag);
        if (hideOwn && me?.id) qs.set("ownerId_ne", me.id); // optional filter
        const url = `/api/listings${qs.toString() ? `?${qs.toString()}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load listings`);
        const data: Listing[] = await res.json();
        console.log("Listings fetched", data, "Current user", me);
        if (!cancelled) setAll(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tag, hideOwn, me?.id]);

  const filtered = useMemo(() => {
    let list = all;
    if (hideOwn && me?.id) {
      list = list.filter(l => l.ownerId !== me.id);
    }
    if (tag) list = list.filter(l => l.tags?.includes(tag));
    return list;
  }, [all, tag, hideOwn, me?.id]);

  if (loading) return <div>Loading…</div>;
  if (error)   return <div role="alert">Error: {error}</div>;
  if (filtered.length === 0) return <div>No listings yet.</div>;

  return (
    <div className="grid gap-3">
      {filtered.map(l => (
        <div key={l.id} className="border rounded p-3">
          <div className="font-medium">{l.title}</div>
          {l.tags?.length ? (
            <div className="mt-2 flex gap-1 flex-wrap">
              {l.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full border">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
