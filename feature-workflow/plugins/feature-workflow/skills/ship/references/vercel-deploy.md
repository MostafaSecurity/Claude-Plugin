# Vercel Deployment Checklist — React Frontend

## Pre-Deploy

- [ ] Build succeeds locally: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No lint errors: `npx eslint src/ui/`
- [ ] Environment variables are set in Vercel dashboard
- [ ] API URL points to correct backend (Cloud Run production URL)

## Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `https://api-service-xxxxx-uc.a.run.app` |
| `REACT_APP_ENV` | Environment identifier | `production` |

**Important:** Vercel environment variables must be prefixed with `REACT_APP_` for Create React App, or `VITE_` for Vite projects.

## Deploy Commands

```bash
# Preview deployment (for PR review)
vercel

# Production deployment
vercel --prod

# Deploy with environment
vercel --prod --env REACT_APP_ENV=production
```

## Post-Deploy Verification

- [ ] Deployment URL loads without errors
- [ ] API calls reach the correct backend
- [ ] Authentication flows work
- [ ] No console errors in browser DevTools
- [ ] Assets load correctly (images, fonts, CSS)
- [ ] Check Vercel Functions tab for any serverless function errors

## Rollback

If deployment fails:

```bash
# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote [DEPLOYMENT_URL]
```

## Preview Deployments

Every PR automatically gets a preview deployment. Share the preview URL in the PR for review:

```
Preview: https://project-xxxx-team.vercel.app
```
