import { whenOgImage, OG_SIZE } from "@/lib/og-when";

export const runtime = "edge";
export const alt = "WHEN — system rezerwacji online";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OgImage() {
  return whenOgImage({
    label: "System rezerwacji online",
    heading: "Zobacz swój salon w działającym demo.",
    sub: "Bez rejestracji. Postaw demo w 30 sekund.",
  });
}
