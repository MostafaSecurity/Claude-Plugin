# Database Adapters — Multi-Database Support

This reference shows how to implement the infrastructure layer for each supported database. The domain layer remains identical regardless of database choice — only the `infra/` layer changes.

## Architecture Principle

```
domain/ports/order-repository.ts    ← Interface (same for all databases)
       ↓ implemented by
infra/repositories/
  ├── prisma-order-repo.ts          ← PostgreSQL / MySQL / SQLite (Prisma)
  └── mongo-order-repo.ts           ← MongoDB (Mongoose or native driver)
```

The domain layer NEVER knows which database is being used. It only knows about the port interface.

---

## Port Interface (Same for All Databases)

```typescript
// src/domain/ports/order-repository.ts
export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, options?: PaginationInput): Promise<Order[]>;
  update(id: string, data: Partial<Order>): Promise<Order>;
  delete(id: string): Promise<void>;
}
```

---

## PostgreSQL / MySQL / SQLite — Prisma ORM

### Schema Definition

```prisma
// prisma/schema.prisma

// PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// MySQL (swap provider)
// datasource db {
//   provider = "mysql"
//   url      = env("DATABASE_URL")
// }

// SQLite (swap provider)
// datasource db {
//   provider = "sqlite"
//   url      = env("DATABASE_URL")
// }

generator client {
  provider = "prisma-client-js"
}

model Order {
  id        String   @id @default(cuid())
  userId    String
  items     Json
  status    String   @default("pending")
  total     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  orders    Order[]
  createdAt DateTime @default(now())
}
```

### Repository Implementation (Prisma)

```typescript
// src/infra/repositories/prisma-order-repo.ts
import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '@/domain/ports/order-repository';
import { Order } from '@/domain/entities/order';

export const createPrismaOrderRepo = (prisma: PrismaClient): OrderRepository => ({

  async save(order: Order): Promise<Order> {
    const created = await prisma.order.create({
      data: {
        userId: order.userId,
        items: order.items as any,
        status: order.status,
        total: order.total,
      },
    });
    return mapToEntity(created);
  },

  async findById(id: string): Promise<Order | null> {
    const record = await prisma.order.findUnique({ where: { id } });
    return record ? mapToEntity(record) : null;
  },

  async findByUserId(userId: string, options?: { page?: number; limit?: number }): Promise<Order[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const records = await prisma.order.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapToEntity);
  },

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.items && { items: data.items as any }),
        ...(data.total !== undefined && { total: data.total }),
      },
    });
    return mapToEntity(updated);
  },

  async delete(id: string): Promise<void> {
    await prisma.order.delete({ where: { id } });
  },
});

// Mapper: Prisma record → Domain entity
function mapToEntity(record: any): Order {
  return {
    id: record.id,
    userId: record.userId,
    items: record.items,
    status: record.status,
    total: record.total,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
```

### Wiring (Prisma)

```typescript
// src/app.ts — Composition root
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Repository
const orderRepo = createPrismaOrderRepo(prisma);

// Use case (same regardless of DB)
const executeCreateOrder = createOrder({ orderRepo });

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});
```

### Commands

```bash
# Initialize Prisma
npx prisma init

# Generate client after schema changes
npx prisma generate

# Create and apply migrations (PostgreSQL/MySQL)
npx prisma migrate dev --name [migration_name]

# Apply migrations in production
npx prisma migrate deploy

# Push schema without migrations (SQLite / prototyping)
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## MongoDB — Mongoose

### Schema Definition

```typescript
// src/infra/models/order-model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface OrderDocument extends Document {
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  status: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<OrderDocument>(
  {
    userId: { type: String, required: true, index: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    status: { type: String, default: 'pending', index: true },
    total: { type: Number, required: true },
  },
  { timestamps: true },
);

export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema);
```

### Repository Implementation (Mongoose)

```typescript
// src/infra/repositories/mongo-order-repo.ts
import { OrderRepository } from '@/domain/ports/order-repository';
import { Order } from '@/domain/entities/order';
import { OrderModel } from '@/infra/models/order-model';

export const createMongoOrderRepo = (): OrderRepository => ({

  async save(order: Order): Promise<Order> {
    const doc = await OrderModel.create({
      userId: order.userId,
      items: order.items,
      status: order.status,
      total: order.total,
    });
    return mapToEntity(doc);
  },

  async findById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id);
    return doc ? mapToEntity(doc) : null;
  },

  async findByUserId(userId: string, options?: { page?: number; limit?: number }): Promise<Order[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const docs = await OrderModel.find({ userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    return docs.map(mapToEntity);
  },

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const doc = await OrderModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!doc) throw new Error(`Order ${id} not found`);
    return mapToEntity(doc);
  },

  async delete(id: string): Promise<void> {
    await OrderModel.findByIdAndDelete(id);
  },
});

function mapToEntity(doc: any): Order {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    items: doc.items,
    status: doc.status,
    total: doc.total,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
```

### Wiring (Mongoose)

```typescript
// src/app.ts — Composition root
import mongoose from 'mongoose';

await mongoose.connect(process.env.DATABASE_URL!);

// Repository
const orderRepo = createMongoOrderRepo();

// Use case (same regardless of DB)
const executeCreateOrder = createOrder({ orderRepo });

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await mongoose.disconnect();
});
```

---

## MongoDB — Native Driver

### Repository Implementation (Native Driver)

```typescript
// src/infra/repositories/mongo-native-order-repo.ts
import { Collection, ObjectId } from 'mongodb';
import { OrderRepository } from '@/domain/ports/order-repository';
import { Order } from '@/domain/entities/order';

export const createMongoNativeOrderRepo = (collection: Collection): OrderRepository => ({

  async save(order: Order): Promise<Order> {
    const result = await collection.insertOne({
      userId: order.userId,
      items: order.items,
      status: order.status,
      total: order.total,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { ...order, id: result.insertedId.toString() };
  },

  async findById(id: string): Promise<Order | null> {
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? mapToEntity(doc) : null;
  },

  async findByUserId(userId: string, options?: { page?: number; limit?: number }): Promise<Order[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const docs = await collection
      .find({ userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(mapToEntity);
  },

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) throw new Error(`Order ${id} not found`);
    return mapToEntity(result);
  },

  async delete(id: string): Promise<void> {
    await collection.deleteOne({ _id: new ObjectId(id) });
  },
});

function mapToEntity(doc: any): Order {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    items: doc.items,
    status: doc.status,
    total: doc.total,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
```

### Wiring (Native Driver)

```typescript
// src/app.ts — Composition root
import { MongoClient } from 'mongodb';

const client = await MongoClient.connect(process.env.DATABASE_URL!);
const db = client.db(process.env.DB_NAME);

// Repository
const orderRepo = createMongoNativeOrderRepo(db.collection('orders'));

// Use case (same regardless of DB)
const executeCreateOrder = createOrder({ orderRepo });

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await client.close();
});
```

---

## Choosing the Right Database

| Factor | PostgreSQL (Prisma) | MongoDB | MySQL (Prisma) | SQLite (Prisma) |
|--------|-------------------|---------|---------------|----------------|
| **Best for** | Relational data, complex queries | Flexible schemas, document data | Traditional web apps | Prototyping, embedded |
| **Schema** | Strict (migrations) | Flexible (schemaless) | Strict (migrations) | Strict (local file) |
| **Hosting** | Supabase, Neon, Railway | Atlas, Railway | PlanetScale, Railway | Local file |
| **Scaling** | Vertical + read replicas | Horizontal (sharding) | Vertical + read replicas | Single file |
| **ORM** | Prisma | Mongoose / native | Prisma | Prisma |
| **Migrations** | `prisma migrate` | None (schema-flexible) | `prisma migrate` | `prisma db push` |
