"use client";

/**
 * The narrow slice of GitHub's "list repositories for a user" payload that
 * this section actually renders. The response has ~80 fields per repo; typing
 * only what we draw means a shape change in an unused field can never break
 * the build, and nothing here is `any`.
 *
 * Field names deliberately mirror the API so the mapping stays obvious.
 */
export type Repo = {
  id: number;
  name: string;
  html_url: string;
  /** Frequently null on GitHub — every consumer must handle it. */
  description: string | null;
  /** Null when the repo has no detected language yet. */
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  fork: boolean;
  archived: boolean;
  /** ISO 8601, or null if the API ever omits it. */
  pushed_at: string | null;
  homepage: string | null;
};

/**
 * Thrown by the query function so the UI can tell "rate limited" apart from
 * "something actually broke" without string-matching an error message.
 */
export class GitHubApiError extends Error {
  /** HTTP status, or 0 when the request never got a response at all. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

/**
 * Unauthenticated calls get 60 requests/hour per IP. GitHub answers an
 * exhausted budget with 403 (classic) or 429 (secondary limits), and both
 * mean "come back later", not "this is broken".
 */
export function isRateLimited(error: unknown): boolean {
  return (
    error instanceof GitHubApiError &&
    (error.status === 403 || error.status === 429)
  );
}

export function describeError(error: unknown): { title: string; body: string } {
  if (isRateLimited(error)) {
    return {
      title: "Rate limit reached",
      body:
        "This page calls the GitHub API without a token, so it shares an hourly budget with everyone on your network. Try again in a few minutes — or read the repositories straight from the profile.",
    };
  }

  if (error instanceof GitHubApiError) {
    return {
      title: "Could not reach GitHub",
      body: `The API answered with HTTP ${error.status}. The repositories are still browsable on the profile.`,
    };
  }

  return {
    title: "Could not reach GitHub",
    body:
      "The request failed before it got a response — most likely the network dropped. The repositories are still browsable on the profile.",
  };
}
