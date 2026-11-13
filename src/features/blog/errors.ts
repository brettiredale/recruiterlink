/**
 * Turns database refusals from the blog functions into plain messages with
 * the right HTTP status, for the admin pages, the API and the connector.
 */
export class BlogError extends Error {
  readonly code: string;
  readonly status: number;
  readonly field?: string;

  constructor(code: string, message: string, status: number, field?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

type DbError = { code?: string; message: string };

/** The database said no: work out why, in words a person can act on. */
export function blogErrorFrom(error: DbError): BlogError {
  switch (error.code) {
    case "28000":
      return new BlogError("unauthorized", "Invalid or revoked API key, or you are not signed in.", 401);
    case "42501":
      return new BlogError("forbidden", "This account is not allowed to do that.", 403);
    case "RLIMT":
      return new BlogError("rate_limited", error.message, 429);
    case "23505":
      return new BlogError("slug_taken", error.message, 409, "slug");
    case "22023":
      return new BlogError("invalid", error.message, 400);
    case "23514":
      return new BlogError("invalid", "One of the values is not allowed (for example a cover image address that is not https).", 400);
    case "40001":
      return new BlogError("conflict", "This post was changed by someone else after you read it. Read it again, then make your change.", 409);
    case "P0002":
      return new BlogError("not_found", error.message, 404);
    default:
      console.error("Blog database call failed:", error.code, error.message);
      return new BlogError("server_error", "Something went wrong on our side. Please try again in a minute.", 500);
  }
}
