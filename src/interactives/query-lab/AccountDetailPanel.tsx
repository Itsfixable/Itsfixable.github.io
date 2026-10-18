"use client";

import { useQuery } from "@tanstack/react-query";
import { DETAIL_STALE_MS, accountKey, fetchAccountDetail } from "./api";

const MONTHS = ["N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S", "O"];

/**
 * Selective loading, part two: one row's heavy columns, fetched on their own
 * request the first time the row is opened — or before that, when the row
 * was hovered long enough to signal intent (see `QueryLab`).
 */
export function AccountDetailPanel({ id }: { id: number }) {
  const query = useQuery({
    queryKey: accountKey(id),
    queryFn: ({ signal }) => fetchAccountDetail(id, signal),
    staleTime: DETAIL_STALE_MS,
  });

  if (query.isPending) {
    return (
      <p className="py-2 text-sm text-faint">
        Loading this account&rsquo;s notes, contacts and activity&hellip;
      </p>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 py-2 text-sm">
        <span className="text-danger">Couldn&rsquo;t load details: {query.error.message}</span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-none border border-line bg-surface px-3 py-1 text-xs font-medium text-text hover:border-faint"
        >
          Retry
        </button>
      </div>
    );
  }

  const { notes, contacts, monthly_activity: activity } = query.data;
  const peak = Math.max(1, ...activity);

  return (
    <div className="grid gap-6 py-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="eyebrow">Notes</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{notes}</p>
        <p className="eyebrow mt-5">Contacts</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {contacts.map((contact) => (
            <li key={contact.name} className="flex flex-wrap gap-x-2">
              <span className="text-text">{contact.name}</span>
              <span className="text-faint">{contact.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <figure className="min-w-0">
        <figcaption className="eyebrow">Touches per month</figcaption>
        <div
          className="mt-3 flex h-20 items-end gap-1"
          role="img"
          aria-label={`Activity over the last 12 months: ${activity.join(", ")}`}
        >
          {activity.map((value, index) => (
            <div key={index} className="flex h-full flex-1 flex-col justify-end gap-1">
              <div
                className="w-full bg-accent"
                style={{ height: `${Math.max(4, (value / peak) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1 flex gap-1 font-mono text-[0.625rem] text-faint">
          {MONTHS.map((month, index) => (
            <span key={index} className="flex-1 text-center">
              {month}
            </span>
          ))}
        </div>
      </figure>
    </div>
  );
}
