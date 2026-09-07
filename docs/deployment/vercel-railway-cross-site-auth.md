# Vercel And Railway Cross-Site Authentication

AgriLink Frontend on `vercel.app` and AgriLink Backend on `railway.app` are
cross-site deployments. Browser requests must use `credentials: include`, and
the Backend must explicitly allow the requesting Frontend origin.

Configure `CORS_ORIGINS` as a comma-separated list of exact origins. Each value
must include `http://` or `https://`, must not contain a path or trailing slash,
and must not be `*`. Credentialed CORS cannot safely use a wildcard.

In production, the refresh-token cookie uses `HttpOnly`, `Secure`, and
`SameSite=None`. In development it uses `HttpOnly`, `SameSite=Lax`, and does not
require HTTPS. Login and refresh set the same cookie policy; logout clears the
cookie with matching path and security attributes.

Cookie-issuing and cookie-consuming auth endpoints validate a browser's
`Origin` against `CORS_ORIGINS`. This Origin check is the CSRF control required
after enabling cross-site cookies. Non-browser clients without an `Origin`
header remain supported; authentication and refresh-token guards remain
unchanged.

Vercel Preview origins can change between deployments. Add only the exact
Preview origins that require browser integration, then remove stale origins
from `CORS_ORIGINS`. Do not hard-code Vercel or Railway domains in source code.
