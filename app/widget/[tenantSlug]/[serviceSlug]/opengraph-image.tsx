import { whenOgImage, OG_SIZE } from "@/lib/og-when";

export const runtime = "edge";
export const alt = "Rezerwacja online";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OgImage() {
  return whenOgImage({ label: "Rezerwacja online" });
}
