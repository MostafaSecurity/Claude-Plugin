# GCP Deployment Guide — Backend + AI Services

## Cloud Run — Express Backend

### Pre-Deploy

- [ ] Dockerfile exists and builds successfully
- [ ] Application listens on `PORT` environment variable (Cloud Run sets this)
- [ ] Health check endpoint exists (e.g., `GET /health`)
- [ ] MongoDB Atlas IP whitelist includes Cloud Run egress IPs (or use 0.0.0.0/0 with auth)
- [ ] Secrets are stored in GCP Secret Manager (not hardcoded)

### Deploy Command

```bash
# Deploy from source (Cloud Build + Cloud Run)
gcloud run deploy [SERVICE_NAME] \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "MONGODB_URI=mongodb-uri:latest" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

# Or deploy from container image
gcloud run deploy [SERVICE_NAME] \
  --image gcr.io/[PROJECT_ID]/[IMAGE_NAME] \
  --region us-central1
```

### Environment Variables & Secrets

```bash
# Set environment variables
gcloud run services update [SERVICE_NAME] \
  --set-env-vars "KEY=value"

# Use secrets from Secret Manager
gcloud run services update [SERVICE_NAME] \
  --set-secrets "MONGODB_URI=projects/[PROJECT_ID]/secrets/mongodb-uri:latest"
```

### Post-Deploy Verification

- [ ] Service URL responds: `curl https://[SERVICE_URL]/health`
- [ ] MongoDB connection succeeds (check logs)
- [ ] API endpoints return expected responses
- [ ] Check Cloud Run logs: `gcloud run services logs read [SERVICE_NAME]`
- [ ] Monitor error rate in Cloud Run dashboard

### Rollback

```bash
# List revisions
gcloud run revisions list --service [SERVICE_NAME]

# Route traffic to previous revision
gcloud run services update-traffic [SERVICE_NAME] \
  --to-revisions [REVISION_NAME]=100
```

---

## Vertex AI / Cloud Functions — AI Services

### Cloud Functions Deployment

```bash
# Deploy HTTP-triggered function
gcloud functions deploy [FUNCTION_NAME] \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --region us-central1 \
  --memory 1Gi \
  --timeout 300s \
  --set-env-vars "MODEL_NAME=gemini-pro" \
  --set-secrets "API_KEY=projects/[PROJECT_ID]/secrets/api-key:latest"
```

### Vertex AI Endpoint Deployment

For ML model endpoints:

```bash
# Deploy model to endpoint
gcloud ai endpoints deploy-model [ENDPOINT_ID] \
  --model [MODEL_ID] \
  --region us-central1 \
  --display-name "production-model" \
  --traffic-split 0=100
```

### Post-Deploy Verification

- [ ] Function/endpoint responds to test request
- [ ] Response latency is within acceptable range
- [ ] Error rate is zero for test requests
- [ ] Check logs: `gcloud functions logs read [FUNCTION_NAME]`

---

## Useful GCP Commands

```bash
# View current project
gcloud config get-value project

# List Cloud Run services
gcloud run services list

# List Cloud Functions
gcloud functions list

# View logs (last 50 entries)
gcloud run services logs read [SERVICE] --limit 50
gcloud functions logs read [FUNCTION] --limit 50

# Describe service (see config, URL, etc.)
gcloud run services describe [SERVICE] --region us-central1
```
