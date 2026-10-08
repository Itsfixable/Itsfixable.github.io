"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { githubUsername } from "@/data/profile";
import { GitHubApiError, type Repo } from "./types";
import { pushedAtMs } from "./relativeTime";

export const GITHUB_PROFILE_URL = `https://github.com/${githubUsername}`;

const ENDPOINT =
  `https://api.github.com/users/${githubUsername}` +
  `/repos?per_page=100&sort=updated`;

/* --------------------------------------------------------------------------
 * Narrowing helpers. The response is `unknown` until each field has been
 * checked, which is how we get a typed `Repo` out of untyped JSON without
 * reaching for `any` or trusting a cast.
 * ------------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** Returns null for anything that is not recognisably a repository. */
function toRepo(value: unknown): Repo | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const name = asString(value.name);
  const htmlUrl = asString(value.html_url);

  if (typeof id !== "number" || name === null || htmlUrl === null) return null;

  return {
    id,
    name,
    html_url: htmlUrl,
    description: asString(value.description),
    language: asString(value.language),
    stargazers_count: asCount(value.stargazers_count),
    forks_count: asCount(value.forks_count),
    topics: asStringArray(value.topics),
    fork: value.fork === true,
    archived: value.archived === true,
    pushed_at: asString(value.pushed_at),
    homepage: asString(value.homepage),
  };
}

async function fetchRepos(signal: AbortSignal): Promise<Repo[]> {
  let response: Response;

  try {
    response = await fetch(ENDPOINT, {
      signal,
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch (cause) {
    // A cancelled query (unmount, a second refetch) must keep looking like a
    // cancellation to TanStack Query rather than becoming an error state.
    if (signal.aborted) throw cause;

    // A dropped network never produces a status, so 0 stands in for "no
    // response at all" and the UI reports it as a transport failure.
    throw new GitHubApiError(0, "The request to the GitHub API failed.");
  }

  if (!response.ok) {
    throw new GitHubApiError(
      response.status,
      `GitHub API responded with ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();

  if (!Array.isArray(payload)) {
    throw new GitHubApiError(
      response.status,
      "The GitHub API returned something that was not a list of repositories.",
    );
  }

  return payload
    .map(toRepo)
    .filter((repo): repo is Repo => repo !== null)
    .sort((a, b) => pushedAtMs(b.pushed_at) - pushedAtMs(a.pushed_at));
}

export const reposQueryKey = ["github", "repos", githubUsername] as const;

/**
 * Reads the `QueryClient` already mounted by `QueryProvider` (5 min
 * `staleTime`, 30 min `gcTime`, no refetch on focus, one retry) — this section
 * deliberately adds no options of its own beyond the retry rule below.
 *
 * Nothing here runs at build time: the page is statically exported, and
 * TanStack Query only kicks off a fetch once the observer subscribes in an
 * effect, which never happens during prerendering.
 */
export function useRepos(): UseQueryResult<Repo[], Error> {
  return useQuery({
    queryKey: reposQueryKey,
    queryFn: ({ signal }) => fetchRepos(signal),
    // Retrying into an exhausted rate limit just burns the budget further and
    // makes the error arrive later; everything else keeps the provider's
    // single retry.
    retry: (failureCount, error) => {
      if (error instanceof GitHubApiError && (error.status === 403 || error.status === 429)) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
