# QA Test Login (Temporary)

> Temporary testing credential note for Codex-assisted QA checks.
> Delete this file before launch.

## Environment
- App URL: from env var `APP_BASE_URL`
- Auth provider: Email + Password (Supabase Auth)
- Role: Normal user (no admin permissions)

## Credentials Source
Use environment variables in the Codex runtime (do not hardcode credentials in this repo):

- `QA_EMAIL`
- `QA_PASSWORD`

## Notes
- Keep this account scoped to normal app access only.
- Rotate the password after each major QA cycle.
- Remove this file and the QA user before public launch.
