import Image from "next/image";
import { cn } from "@/lib/utils";
import { VENUE_PHOTOS, venueSlug } from "@/lib/venues";

export function VenueImage({
  venue,
  className,
}: {
  venue: string | null | undefined;
  className?: string;
}) {
  const slug = venueSlug(venue);
  if (!slug || !VENUE_PHOTOS.has(slug)) return null;

  return (
    <Image
      src={`/venues/${slug}.jpg`}
      alt={venue ?? ""}
      fill
      sizes="(min-width: 1024px) 768px, 100vw"
      priority={false}
      className={cn("object-cover", className)}
    />
  );
}
