# Deployment Targets — Platform-Specific Guides

## Frontend Platforms

### Vercel

**Best for:** Next.js, React (Vite), static sites

**Setup:**
```bash
npm i -g vercel
vercel login
vercel link  # Connect to existing project or create new
```

**Deploy:**
```bash
vercel --prod --yes       # Production
vercel --yes              # Preview (staging)
```

**Environment Variables:**
- Set in Dashboard → Project → Settings → Environment Variables
- Next.js: prefix with `NEXT_PUBLIC_`
- Vite: prefix with `VITE_`
- CRA: prefix with `REACT_APP_`

**Custom Domain:**
```bash
vercel domains add my-app.com
```

**Rollback:**
```bash
vercel ls
vercel promote [DEPLOYMENT_URL]
```

---

### Netlify

**Best for:** Static sites, Jamstack

**Setup:**
```bash
npm i -g netlify-cli
netlify login
netlify link  # or netlify init
```

**Deploy:**
```bash
netlify deploy --prod     # Production
netlify deploy            # Preview
```

**Environment Variables:**
- Set in Dashboard → Site Settings → Build & Deploy → Environment

**Rollback:**
- Use Dashboard → Deploys → click previous deploy → "Publish deploy"

---

### AWS Amplify

**Best for:** Full-stack AWS projects

**Setup:**
```bash
npm i -g @aws-amplify/cli
amplify configure
amplify init
```

**Deploy:**
```bash
amplify publish
```

---

## Backend Platforms

### GCP Cloud Run

**Best for:** Containerized Node.js/Express backends

**Setup:**
```bash
brew install google-cloud-sdk  # or see cloud.google.com/sdk
gcloud auth login
gcloud config set project [PROJECT_ID]
gcloud services enable run.googleapis.com
```

**Deploy from source:**
```bash
gcloud run deploy [SERVICE] \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10
```

**Deploy from Docker image:**
```bash
# Build and push
gcloud builds submit --tag gcr.io/[PROJECT_ID]/[SERVICE]

# Deploy
gcloud run deploy [SERVICE] \
  --image gcr.io/[PROJECT_ID]/[SERVICE] \
  --region us-central1
```

**Secrets:**
```bash
# Create secret
echo -n "value" | gcloud secrets create [NAME] --data-file=-

# Attach to Cloud Run
gcloud run services update [SERVICE] \
  --set-secrets "DATABASE_URL=[SECRET_NAME]:latest"
```

**Rollback:**
```bash
gcloud run revisions list --service [SERVICE]
gcloud run services update-traffic [SERVICE] \
  --to-revisions [REVISION]=100
```

---

### Railway

**Best for:** Quick deployment with minimal config

**Setup:**
```bash
npm i -g @railway/cli
railway login
railway init  # or railway link
```

**Deploy:**
```bash
railway up
```

**Environment Variables:**
```bash
railway variables set KEY=value
```

**Rollback:**
```bash
railway rollback
```

---

### Render

**Best for:** Auto-deploy from GitHub

**Setup:**
- Connect GitHub repo in Render Dashboard
- Configure build and start commands
- Set environment variables in Dashboard

**Deploy:**
- Automatic on git push to configured branch
- Manual: Dashboard → Service → Manual Deploy

**Rollback:**
- Dashboard → Service → Events → select previous deploy → Rollback

---

## Database Platforms

### Supabase (PostgreSQL)

**Connection string:** Dashboard → Settings → Database → Connection String → URI

**IP access:** Supabase allows all IPs by default (connection pooler with SSL)

**Post-deploy:** Check Dashboard → Database → Replication for migration status

---

### MongoDB Atlas

**Connection string:** Dashboard → Database → Connect → Drivers

**IP access:** Dashboard → Network Access → Add IP Address
- Development: Add your IP
- Production: Add Cloud Run egress IPs or 0.0.0.0/0 (with auth enforced)

**Post-deploy checklist:**
- Verify connection count is stable
- Check for slow queries in Performance Advisor
- Verify indexes exist for new queries

---

### Neon (PostgreSQL)

**Connection string:** Console → Connection Details → Connection String

**Branching:** Neon supports database branches (like git branches)
```
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
```

---

### PlanetScale (MySQL)

**Connection string:** Dashboard → Connect → Create password → Connection string

**Branching:** PlanetScale supports schema branches
```bash
pscale branch create my-db feature-branch
pscale deploy-request create my-db feature-branch
```

---

## Health Check Patterns

Every deployed backend should have a health check endpoint:

```typescript
// src/api/routes/health.ts
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.raw('SELECT 1');  // Prisma: await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database unreachable' });
  }
});
```

**Verify after deployment:**
```bash
curl -s https://[BACKEND_URL]/health | jq .
# Expected: { "status": "ok", "timestamp": "..." }
```

---

## Flutter / Mobile Platforms

### Android — Google Play Console

**Build:**
```bash
# App Bundle (recommended for Play Store)
flutter build appbundle --release

# APK (for direct distribution or testing)
flutter build apk --release
flutter build apk --split-per-abi --release   # Separate APKs per architecture
```

**Output:**
- AAB: `build/app/outputs/bundle/release/app-release.aab`
- APK: `build/app/outputs/flutter-apk/app-release.apk`

**Upload to Play Store:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app → Release → Production (or Internal Testing)
3. Upload the `.aab` file
4. Fill in release notes
5. Submit for review

**With Fastlane (automation):**
```bash
# Install Fastlane
gem install fastlane

# Initialize (first time)
cd android && fastlane init

# Deploy to Play Store
fastlane android deploy
```

**Common Issues:**
| Error | Fix |
|-------|-----|
| `Keystore not found` | Generate with `keytool -genkey -v -keystore key.jks -keyalg RSA -keysize 2048` |
| `Version code already used` | Increment `versionCode` in `pubspec.yaml` or `build.gradle` |
| `Signing config missing` | Configure `android/app/build.gradle` with keystore path |

---

### iOS — App Store Connect

**Prerequisites:**
- macOS only (Xcode required)
- Apple Developer Account ($99/year)
- CocoaPods: `gem install cocoapods && cd ios && pod install`

**Build:**
```bash
flutter build ipa --release
```

**Output:** `build/ios/ipa/app-name.ipa`

**Upload to App Store:**
1. Open `ios/Runner.xcworkspace` in Xcode
2. Product → Archive
3. Distribute App → App Store Connect
4. Or use Transporter app to upload the `.ipa`

**With Fastlane (automation):**
```bash
cd ios && fastlane init
fastlane ios release
```

**Common Issues:**
| Error | Fix |
|-------|-----|
| `CocoaPods not installed` | `gem install cocoapods && cd ios && pod install` |
| `Provisioning profile missing` | Xcode → Signing & Capabilities → enable Automatic Signing |
| `Minimum deployment target` | Set in `ios/Podfile`: `platform :ios, '13.0'` |

---

### Flutter Web — Firebase Hosting / Vercel / Netlify

**Build:**
```bash
flutter build web --release
```

**Output:** `build/web/` directory

**Deploy to Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # Set public directory to "build/web"
firebase deploy
```

**Deploy to Vercel:**
```bash
cd build/web
vercel --prod --yes
```

**Deploy to Netlify:**
```bash
cd build/web
netlify deploy --prod --dir .
```

---

### Firebase App Distribution (Testing)

For internal testing before store releases:

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Distribute Android APK
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups testers

# Distribute iOS IPA
firebase appdistribution:distribute build/ios/ipa/app-name.ipa \
  --app YOUR_FIREBASE_APP_ID \
  --groups testers
```
