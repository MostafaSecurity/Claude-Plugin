/**
 * Wiring Patterns — Dependency Injection for Function-Based Use Cases
 *
 * Shows how to connect all layers together:
 * 1. Repository implementations → Use case factories
 * 2. Use case executors → Express controllers
 * 3. Controllers → Express routes
 * 4. Full application setup
 */

// ═══════════════════════════════════════════════════════════════════
// 1. REPOSITORY IMPLEMENTATION (Infra Layer)
// ═══════════════════════════════════════════════════════════════════

/**
 * MongoDB repository implementing the domain port.
 * Translates between MongoDB documents and domain entities.
 */

// src/infra/repositories/mongo-order-repo.ts
import { Collection, ObjectId } from "mongodb";
// import { OrderRepository } from '@/domain/ports/order-repository';
// import { Order } from '@/domain/entities/order';

interface OrderRepository {
  save(order: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findActiveOrdersByUser(userId: string): Promise<any[]>;
}

const createMongoOrderRepo = (collection: Collection): OrderRepository => ({
  async save(order) {
    const doc = {
      ...order,
      _id: order.id ? new ObjectId(order.id) : new ObjectId(),
      createdAt: order.createdAt || new Date(),
    };
    await collection.insertOne(doc);
    return { ...order, id: doc._id.toString() };
  },

  async findById(id: string) {
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return { ...doc, id: doc._id.toString() };
  },

  async findActiveOrdersByUser(userId: string) {
    const docs = await collection
      .find({ userId, status: { $ne: "cancelled" } })
      .toArray();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. CONTROLLER (API Layer)
// ═══════════════════════════════════════════════════════════════════

/**
 * Controller wires the use case and handles HTTP concerns.
 * It receives the use case executor (already wired with dependencies).
 */

// src/api/controllers/order-controller.ts
import { Request, Response, NextFunction } from "express";

type UseCaseExecutor<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

const createOrderController = (
  executeCreateOrder: UseCaseExecutor<any, any>,
  executeGetOrders: UseCaseExecutor<any, any>,
) => ({
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await executeCreateOrder({
        userId: req.user?.id, // from auth middleware
        ...req.body,
      });
      res.status(201).json({ data: result });
    } catch (error) {
      next(error); // Let error-handler middleware handle it
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await executeGetOrders({
        userId: req.user?.id,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. ROUTE SETUP (API Layer)
// ═══════════════════════════════════════════════════════════════════

/**
 * Routes define HTTP endpoints and connect to controller methods.
 */

// src/api/routes/order-routes.ts
import { Router } from "express";

const createOrderRoutes = (
  controller: ReturnType<typeof createOrderController>,
  authMiddleware: any,
  validateBody: any,
) => {
  const router = Router();

  router.post(
    "/orders",
    authMiddleware,
    validateBody("createOrder"),
    controller.create,
  );

  router.get(
    "/orders",
    authMiddleware,
    controller.list,
  );

  return router;
};

// ═══════════════════════════════════════════════════════════════════
// 4. APPLICATION WIRING (Composition Root)
// ═══════════════════════════════════════════════════════════════════

/**
 * The composition root — where everything comes together.
 * This is the ONLY place that knows about all layers.
 *
 * Place in: src/app.ts or src/server.ts
 */

// src/app.ts
import express from "express";
// import { MongoClient } from 'mongodb';

const createApp = async () => {
  const app = express();
  app.use(express.json());

  // ── Database Connection ──
  // const client = await MongoClient.connect(process.env.MONGODB_URI!);
  // const db = client.db(process.env.DB_NAME);

  // ── Repository Instances ──
  // const orderRepo = createMongoOrderRepo(db.collection('orders'));
  // const userRepo = createMongoUserRepo(db.collection('users'));
  // const discountRepo = createMongoDiscountRepo(db.collection('discounts'));

  // ── Use Case Executors ──
  // Wire dependencies into use case factories → get executor functions
  // const executeCreateOrder = createOrder({
  //   orderRepo,
  //   userRepo,
  //   discountRepo,
  // });
  //
  // const executeGetOrders = getUserOrders({ orderRepo });

  // ── Controllers ──
  // Wire executors into controllers
  // const orderController = createOrderController(
  //   executeCreateOrder,
  //   executeGetOrders,
  // );

  // ── Routes ──
  // Wire controllers into routes
  // const orderRoutes = createOrderRoutes(
  //   orderController,
  //   authMiddleware,
  //   validateBody,
  // );
  // app.use('/api', orderRoutes);

  // ── Error Handler ──
  // app.use(globalErrorHandler);

  return app;
};

// ═══════════════════════════════════════════════════════════════════
// 5. REACT WIRING (UI Layer)
// ═══════════════════════════════════════════════════════════════════

/**
 * React hooks call the API service, not the domain directly.
 * The UI layer communicates via HTTP.
 */

// src/ui/services/order-service.ts
// const API_BASE = process.env.REACT_APP_API_URL || '/api';
//
// export const orderService = {
//   async create(data: CreateOrderInput) {
//     const res = await fetch(`${API_BASE}/orders`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(data),
//     });
//     if (!res.ok) throw new Error(await res.text());
//     return res.json();
//   },
//
//   async list(params: { page?: number; limit?: number } = {}) {
//     const query = new URLSearchParams(params as any).toString();
//     const res = await fetch(`${API_BASE}/orders?${query}`);
//     if (!res.ok) throw new Error(await res.text());
//     return res.json();
//   },
// };

// src/ui/hooks/useOrders.ts
// import { useState, useEffect } from 'react';
// import { orderService } from '../services/order-service';
//
// export const useOrders = () => {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//
//   useEffect(() => {
//     orderService.list()
//       .then(res => setOrders(res.data))
//       .catch(err => setError(err.message))
//       .finally(() => setLoading(false));
//   }, []);
//
//   return { orders, loading, error };
// };

export {
  createMongoOrderRepo,
  createOrderController,
  createOrderRoutes,
  createApp,
};
