import type { Metadata } from "next";

export const SITE_NAME = "Space Scavenger Hunt";
export const SITE_DESCRIPTION =
  "Celebrate Luke & Leo's first birthday! Join a crew, find hidden astronauts, complete silly team photo challenges, and earn Signal Boosts with birthday selfies.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
};

export function createPageMetadata({
  title,
  description,
  path,
  image = {
    url: "/astronauts2.png",
    alt: "Astronaut crew waving from a moon base under a colorful galaxy",
  },
}: PageMetadataOptions): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`;

  // Next.js replaces nested metadata rather than merging it. Include the
  // shared social fields here so page overrides retain the image and site name.
  return {
    title: { absolute: socialTitle },
    description,
    openGraph: {
      title: socialTitle,
      description,
      siteName: SITE_NAME,
      url: path,
      locale: "en_US",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
