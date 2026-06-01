import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { env } from "@space-scavenger-hunt/env/web";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { Metadata } from "next";

export const DEFAULT_ASTRONAUT_OG_IMAGE = "/astronautIcon.png";

function createServerTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc`,
      }),
    ],
  });
}

export async function getAstronautPageMetadata(
  code: string,
): Promise<Metadata | null> {
  try {
    const astronaut = await createServerTrpcClient().astronaut.getByCode.query({
      code,
    });
    if (!astronaut) return null;

    const ogImagePath = astronaut.previewUrl ?? DEFAULT_ASTRONAUT_OG_IMAGE;
    const description =
      astronaut.description?.trim() ||
      `Rescue ${astronaut.name} in Space Scavenger Hunt.`;

    return {
      title: astronaut.name,
      description,
      openGraph: {
        title: astronaut.name,
        description,
        images: [
          {
            url: ogImagePath,
            alt: `${astronaut.name} portrait`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: astronaut.name,
        description,
        images: [ogImagePath],
      },
    };
  } catch {
    return null;
  }
}
