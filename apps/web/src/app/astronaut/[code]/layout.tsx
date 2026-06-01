import type { Metadata } from "next";

import { getAstronautShareMetadata } from "@space-scavenger-hunt/api/services/astronaut-share-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const astronaut = await getAstronautShareMetadata(code);

  if (!astronaut) {
    return { title: "Astronaut not found" };
  }

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
          url: astronaut.ogImagePath,
          alt: `${astronaut.name} portrait`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: astronaut.name,
      description,
      images: [astronaut.ogImagePath],
    },
  };
}

export default function AstronautLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
