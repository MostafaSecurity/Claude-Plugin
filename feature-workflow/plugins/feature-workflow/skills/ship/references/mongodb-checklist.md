# MongoDB Atlas Post-Deploy Checklist

Since the project uses schema-flexible MongoDB without formal migrations, this checklist ensures database health after deployments.

## Connection Verification

- [ ] Application connects to MongoDB Atlas successfully (check app logs)
- [ ] Connection string uses the correct cluster and database name
- [ ] Network access allows connections from deployment targets:
  - Cloud Run egress IPs (or 0.0.0.0/0 with authentication)
  - Vercel serverless function IPs (if frontend has server-side rendering)

## Index Management

When new features add queries, verify indexes exist for performance:

```javascript
// Check existing indexes
db.collection.getIndexes()

// Common indexes to verify after feature deploys:
// - Compound indexes for filtered queries
// - Text indexes for search features
// - TTL indexes for expiring data
```

**Rule of thumb:** If a new use case adds a repository method with a filter or sort, check that an index supports it.

## Collection Check

After deploying a feature that introduces new collections:

- [ ] New collections are created by the application on first write
- [ ] Collection names follow project conventions (e.g., lowercase plural: `orders`, `users`)
- [ ] No orphaned collections from old features

## Schema Validation (Optional)

If the project uses MongoDB schema validation rules:

```javascript
// View current validation rules
db.getCollectionInfos({ name: "orders" })[0].options.validator

// Update validation (if needed)
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "items", "status"],
      properties: {
        userId: { bsonType: "string" },
        status: { enum: ["pending", "confirmed", "cancelled"] }
      }
    }
  }
})
```

## Monitoring

After deployment, monitor Atlas dashboard for:

- [ ] Connection count is stable (no connection leaks)
- [ ] Query performance (no slow queries from new features)
- [ ] Storage usage is expected
- [ ] No authentication failures in logs

## Atlas Dashboard Quick Checks

1. **Metrics tab**: Check connections, operations/sec, query targeting
2. **Real-Time Performance**: Look for slow queries after deploy
3. **Alerts**: Verify alert thresholds are set for:
   - Connections > 80% of limit
   - Query targeting ratio < 95%
   - Disk usage > 80%
