"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminUserRow, SortColumn, SortDirection } from "@/lib/admin";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import LockUserButton from "@/components/admin/LockUserButton";
import AdminPasswordActions from "@/components/admin/AdminPasswordActions";

type ColumnKey = "displayName" | "username" | "email" | "artworks" | "joined" | "portfolio" | "actions";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "displayName", label: "Display name" },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "artworks", label: "Artworks" },
  { key: "joined", label: "Joined" },
  { key: "portfolio", label: "Portfolio" },
  { key: "actions", label: "Actions" },
];

// Only these columns map to something the database can actually sort by —
// Portfolio (a link) and Actions (buttons) aren't sortable data.
const SORT_KEYS: Partial<Record<ColumnKey, SortColumn>> = {
  displayName: "displayName",
  username: "username",
  email: "email",
  artworks: "artworkCount",
  joined: "createdAt",
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  displayName: 160,
  username: 140,
  email: 220,
  artworks: 90,
  joined: 100,
  portfolio: 90,
  actions: 200,
};

const MIN_WIDTH = 60;
const STORAGE_KEY = "admin-user-table-column-widths";

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

export default function ResizableUserTable({
  users,
  currentUserId,
  search,
  sortBy,
  sortDir,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  search?: string;
  sortBy: SortColumn;
  sortDir: SortDirection;
}) {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(DEFAULT_WIDTHS);
  const dragRef = useRef<{ column: ColumnKey; startX: number; startWidth: number } | null>(null);

  function sortHref(column: ColumnKey) {
    const sortKey = SORT_KEYS[column];
    if (!sortKey) return undefined;
    const nextDir: SortDirection = sortBy === sortKey && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    // Explicit rather than relying on Users being the default tab.
    params.set("tab", "users");
    if (search) params.set("q", search);
    params.set("sortBy", sortKey);
    params.set("sortDir", nextDir);
    return `/admin?${params.toString()}`;
  }

  // Loaded client-side only (after hydration) so the initial server-rendered
  // markup always matches the defaults, and each admin's chosen widths stick
  // across reloads without needing any backend storage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWidths({ ...DEFAULT_WIDTHS, ...JSON.parse(saved) });
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const nextWidth = Math.max(MIN_WIDTH, drag.startWidth + delta);
      setWidths((prev) => ({ ...prev, [drag.column]: nextWidth }));
    }

    function handleMouseUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setWidths((current) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
          // ignore
        }
        return current;
      });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function startResize(column: ColumnKey, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { column, startX: e.clientX, startWidth: widths[column] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function resetWidths() {
    setWidths(DEFAULT_WIDTHS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          data-testid="admin-user-table-reset-columns"
          onClick={resetWidths}
          className="text-xs text-gray-500 hover:underline"
        >
          Reset column sizes
        </button>
      </div>

      <div className="overflow-x-auto">
        <table
          className="border-collapse text-sm"
          style={{ tableLayout: "fixed", width: Object.values(widths).reduce((a, b) => a + b, 0) }}
          data-testid="admin-user-table"
        >
          <colgroup>
            {COLUMNS.map((col) => (
              <col key={col.key} style={{ width: widths[col.key] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              {COLUMNS.map((col) => {
                const sortKey = SORT_KEYS[col.key];
                const isActive = sortKey === sortBy;
                const href = sortHref(col.key);
                return (
                  <th key={col.key} className="relative select-none truncate py-2 pr-4">
                    {href ? (
                      <Link
                        href={href}
                        data-testid={`admin-user-table-sort-${col.key}`}
                        className="hover:text-gray-700 hover:underline"
                      >
                        {col.label}
                        {isActive ? <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
                      </Link>
                    ) : (
                      col.label
                    )}
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.label} column`}
                      data-testid={`admin-user-table-resize-${col.key}`}
                      onMouseDown={(e) => startResize(col.key, e)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-gray-300 active:bg-gray-400"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-gray-500" data-testid="admin-user-table-empty">
                  No users match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : null}
            {users.map((user) => (
              <tr key={user.id} data-testid={`admin-user-row-${user.id}`} className="border-b border-gray-100">
                <td className="truncate py-2 pr-4">{user.displayName}</td>
                <td className="truncate py-2 pr-4">@{user.username}</td>
                <td className="truncate py-2 pr-4">{user.email}</td>
                <td className="truncate py-2 pr-4">{user.artworkCount}</td>
                <td className="truncate py-2 pr-4">{formatDate(user.createdAt)}</td>
                <td className="truncate py-2 pr-4">
                  <Link
                    href={`/${user.username}`}
                    data-testid={`admin-portfolio-link-${user.id}`}
                    className="underline"
                  >
                    View
                  </Link>
                </td>
                <td className="overflow-hidden py-3">
                  <div className="flex flex-col items-start gap-2">
                    <DeleteUserButton userId={user.id} displayName={user.displayName} />
                    {user.id !== currentUserId ? (
                      <LockUserButton userId={user.id} displayName={user.displayName} />
                    ) : null}
                    <AdminPasswordActions userId={user.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
