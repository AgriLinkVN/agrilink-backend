# Storage Provider Configuration

Run `npm run storage:check-config` during deployment after setting the backend
environment. It verifies credentials, confirms the configured Supabase bucket
exists, and confirms that bucket is private. The command is read-only and must
never be exposed through a health endpoint.

## Supabase Dashboard Requirements

- Keep `SUPABASE_BUCKET` private. Do not enable public bucket access.
- Restrict accepted MIME types to `application/pdf`, `image/jpeg`, and
  `image/png` for private documents.
- Set the provider maximum file size to 10 MB or lower.
- Use only a server administration secret for `SUPABASE_SERVICE_KEY`; never
  place it in frontend variables or source control.

## Cloudinary Requirements

- Store only public product, review, ad, and avatar images in Cloudinary.
- Set an upload preset or account policy that permits JPEG, PNG, and WebP only.
- Set a maximum upload size of 5 MB or lower.
- Keep the API secret backend-only.

Provider-side settings are operator-managed. This repository does not modify
production provider settings automatically.
