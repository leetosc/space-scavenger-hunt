import { createContext } from "@space-scavenger-hunt/api/context";
import { appRouter } from "@space-scavenger-hunt/api/routers/index";
import { auth } from "@space-scavenger-hunt/auth";
import { env } from "@space-scavenger-hunt/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

import { bootstrapAdmin } from "./lib/bootstrap-admin";
import {
  getLocationHintPhoto,
  replaceLocationHintPhoto,
  uploadLocationHintPhoto,
} from "./routes/hint-photo";
import { getAttemptPhoto } from "./routes/attempt-photo";
import { getAstronautPhoto, uploadAstronautPhoto } from "./routes/astronaut-photo";
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

// Public sign-up is handled by the player.signUp tRPC mutation which calls
// auth.api.signUpEmail in-process. The HTTP auth sign-up routes remain blocked
// so users can only register through our controlled flow.
app.all("/api/auth/sign-up{/*path}", (_req, res) => {
  res.status(403).json({
    code: "PUBLIC_SIGN_UP_DISABLED",
    message: "Public sign-up is disabled. Use the sign-up page instead.",
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

app.get("/api/attempts/:attemptId/photo/:token", getAttemptPhoto);
app.post(
  "/api/astronauts/:astronautId/upload",
  uploadMiddleware.single("image"),
  uploadAstronautPhoto,
);
app.get("/api/astronauts/:astronautId/photo/:token", getAstronautPhoto);
app.post(
  "/api/location-hints/upload",
  uploadMiddleware.single("image"),
  uploadLocationHintPhoto,
);
app.post(
  "/api/location-hints/:hintId/upload",
  uploadMiddleware.single("image"),
  replaceLocationHintPhoto,
);
app.get("/api/location-hints/:hintId/photo/:token", getLocationHintPhoto);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

await bootstrapAdmin();

const trpcNamespaces = Object.keys(appRouter._def.record);
const hasGameRouters = trpcNamespaces.includes("activity") && trpcNamespaces.includes("player");
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`[trpc] namespaces: ${trpcNamespaces.join(", ")}`);
  if (!hasGameRouters) {
    console.warn(
      "[trpc] Game routers missing — stop dev and restart (bun dev). " +
        "The API package may not have reloaded.",
    );
  }
});
