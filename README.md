This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## GitHub Pages environment variables

`env.local` and `.env.local` are local-only and are not used by GitHub Actions.
For deployed auth features, add these in GitHub repository **Settings → Secrets and variables → Actions** as either repository variables (`vars`) or secrets:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_OWNER_EMAIL` (optional)

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication setup (Email + Google)

This project uses Firebase Authentication on the client so it works on GitHub Pages.

1. Copy `.env.example` to `.env.local` in `site/`.
2. Fill in:
	- `NEXT_PUBLIC_FIREBASE_API_KEY`
	- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
	- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
	- `NEXT_PUBLIC_FIREBASE_APP_ID`
3. In Firebase Console → Authentication → Sign-in method, enable:
	- Email/Password
	- Google
4. Add authorized domains for your app:
	- `localhost`
	- `cofrimpong.github.io`

The sign-in page is available at `/signin`.

## AI Consultant POC (voice to published markdown)

This repo now includes a POC page at `/consultant` with this flow:

1. Record voice in-browser.
2. Transcribe locally using Whisper (`@xenova/transformers`, model `Xenova/whisper-tiny.en`).
3. Send transcript to one LLM call (OpenAI or Claude) to produce structured blog JSON.
4. Manually approve.
5. Publish markdown into `content/posts/*.md` via GitHub Contents API.
6. Existing GitHub Actions deploy workflow publishes the updated site.

### Required runtime values

- Firebase public vars for sign-in gate:
	- `NEXT_PUBLIC_FIREBASE_API_KEY`
	- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
	- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
	- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Optional allowlist for publisher emails:
	- `NEXT_PUBLIC_ALLOWED_PUBLISHER_EMAILS` (comma-separated)
- Optional defaults for GitHub target:
	- `NEXT_PUBLIC_GITHUB_OWNER`
	- `NEXT_PUBLIC_GITHUB_REPO`
	- `NEXT_PUBLIC_GITHUB_BRANCH`
	- `NEXT_PUBLIC_POSTS_PATH`
- Optional model defaults:
	- `NEXT_PUBLIC_OPENAI_MODEL`
	- `NEXT_PUBLIC_ANTHROPIC_MODEL`

LLM API keys and GitHub token are entered in the `/consultant` page and saved to `localStorage` for this device.

### GitHub token scope for publish

Use a fine-grained token with repository `Contents: Read and write` permission on your `blogtalk` repo.

### Security note

This POC allows direct browser API calls. For production, move all secret-bearing calls to a server-side API.
