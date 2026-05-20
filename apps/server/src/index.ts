import { createContext } from "@space-scavenger-hunt/api/context";
import { appRouter } from "@space-scavenger-hunt/api/routers/index";
import { auth } from "@space-scavenger-hunt/auth";
import { env } from "@space-scavenger-hunt/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

import { bootstrapAdmin } from "./lib/bootstrap-admin";
import { uploadAttemptPhoto, uploadMiddleware } from "./routes/upload";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Block public sign-up endpoints. Admin and bootstrap create users via `auth.api.signUpEmail`
// directly (in-process), so disabling the HTTP routes does not affect them.
app.all("/api/auth/sign-up{/*path}", (_req, res) => {
  res.status(403).json({
    code: "PUBLIC_SIGN_UP_DISABLED",
    message: "Public sign-up is disabled. Ask your event admin for an account.",
  });
});

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.post(
  "/api/attempts/:attemptId/upload",
  uploadMiddleware.single("image"),
  uploadAttemptPhoto,
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

await bootstrapAdmin();

const trpcNamespaces = Object.keys(appRouter._def.record);
const hasGameRouters = trpcNamespaces.includes("activity") && trpcNamespaces.includes("player");

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
  console.log(`[trpc] namespaces: ${trpcNamespaces.join(", ")}`);
  if (!hasGameRouters) {
    console.warn(
      "[trpc] Game routers missing — stop dev and restart (bun dev). " +
        "The API package may not have reloaded.",
    );
  }
});
