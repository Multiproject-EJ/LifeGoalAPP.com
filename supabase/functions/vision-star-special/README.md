# vision-star-special (Supabase Edge Function)

Generates the weekly special Vision Star payload:
- AI caption
- 5 short story panels
- AI-generated image (base64 data URL)

## Endpoint
`POST /functions/v1/vision-star-special`

## Auth
Requires authenticated user (Bearer token).

## OpenAI credentials
Order of resolution:
1. `ai_settings` row for the current user (`provider='openai'`, `api_key`)
2. `OPENAI_API_KEY` environment variable

Model resolution:
1. `ai_settings.model` for current user (`provider='openai'`)
2. Default: `gpt-4o-mini`

Image model: `gpt-image-1`.

## Local serve
```bash
supabase functions serve vision-star-special
```

## Deploy
```bash
supabase functions deploy vision-star-special
```
