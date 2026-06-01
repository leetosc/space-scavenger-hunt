import prisma from "@space-scavenger-hunt/db";

import { getAstronautPhotoPreviewPath } from "./astronaut-photo-url";

export const DEFAULT_ASTRONAUT_OG_IMAGE = "/astronautIcon.png";

function normalizeAstronautCode(code: string): string {
  return code.length === 4 ? code.toUpperCase() : code;
}

export async function getAstronautShareMetadata(code: string) {
  const astronaut = await prisma.astronaut.findUnique({
    where: { code: normalizeAstronautCode(code) },
    select: {
      id: true,
      name: true,
      description: true,
      imageBlobName: true,
    },
  });

  if (!astronaut) return null;

  return {
    name: astronaut.name,
    description: astronaut.description,
    ogImagePath: astronaut.imageBlobName
      ? getAstronautPhotoPreviewPath(astronaut.id)
      : DEFAULT_ASTRONAUT_OG_IMAGE,
  };
}
