/**
 * Shared OG image renderer for WHEN-branded share previews.
 * Pure JSX returning ImageResponse — no business_name leakage,
 * just the WHEN wordmark on a dark gradient background.
 *
 * Used by:
 *   app/opengraph-image.tsx (landing)
 *   app/widget/[tenantSlug]/opengraph-image.tsx
 *   app/widget/[tenantSlug]/[serviceSlug]/opengraph-image.tsx
 */

import { ImageResponse } from "next/og";

const LOGO_PATH_1 =
  "M2356 1576 c-114 -42 -226 -203 -356 -514 -51 -120 -53 -121 -215 -129 l-100 -5 3 87 c7 181 -88 282 -216 229 -149 -62 -112 -273 64 -372 33 -19 -82 -268 -195 -419 -154 -209 -285 -223 -326 -36 -6 28 -1 39 33 80 187 225 249 443 141 498 -131 68 -260 -128 -287 -435 l-7 -84 -75 -63 c-94 -79 -205 -137 -244 -127 -70 17 -53 99 75 368 179 375 201 502 97 566 -89 54 -211 0 -379 -169 -133 -134 -166 -203 -114 -237 37 -24 69 -11 99 39 60 103 253 277 307 277 66 0 45 -87 -91 -370 -156 -324 -183 -429 -137 -516 63 -121 287 -78 441 85 37 39 42 39 50 -3 25 -133 166 -189 311 -122 135 62 354 372 406 575 l12 49 86 -1 c47 -1 107 2 132 6 l47 8 -93 -285 c-125 -383 -124 -376 -46 -376 54 0 63 11 139 161 172 342 441 609 526 523 31 -31 19 -88 -53 -258 -79 -185 -98 -262 -82 -322 29 -107 153 -139 282 -73 39 19 159 134 159 151 0 21 19 5 25 -21 11 -52 60 -107 120 -136 186 -91 463 4 650 223 33 39 61 70 62 68 1 -1 -13 -55 -32 -121 -48 -168 -44 -195 27 -195 40 0 47 13 83 146 115 418 230 616 351 602 60 -7 68 -42 75 -328 7 -272 12 -304 59 -368 61 -84 163 -80 251 10 75 78 184 297 177 357 -4 37 -59 43 -75 9 -135 -286 -205 -375 -257 -323 -30 31 -39 99 -41 335 -1 139 -7 249 -13 269 -58 176 -246 194 -365 36 l-30 -40 6 31 c3 18 9 43 12 57 13 50 -70 74 -94 28 -6 -9 -22 -64 -36 -122 -30 -119 -58 -172 -155 -297 -154 -200 -309 -295 -485 -296 -140 -1 -195 48 -195 173 l0 48 83 6 c227 16 451 149 492 291 41 140 -42 234 -199 224 -189 -12 -383 -185 -451 -401 -73 -232 -365 -451 -365 -275 0 40 8 64 91 258 103 243 67 375 -103 374 -128 -1 -276 -118 -415 -328 -40 -60 -73 -107 -73 -105 1 25 123 336 134 344 9 5 43 26 76 45 270 153 468 487 359 603 -40 43 -86 53 -143 33z m64 -130 c0 -46 -23 -98 -83 -184 -53 -76 -219 -242 -225 -224 -9 27 159 335 217 395 60 64 91 68 91 13z m-856 -318 c11 -15 16 -45 16 -90 l0 -68 -25 16 c-69 45 -90 164 -29 164 12 0 30 -10 38 -22z m1751 -210 c116 -53 -64 -243 -277 -293 -135 -32 -148 -22 -92 71 98 164 269 268 369 222z m-2176 -74 c-12 -44 -69 -156 -99 -194 l-20 -25 0 25 c0 40 27 135 55 190 42 83 86 86 64 4z";

const LOGO_PATH_2 =
  "M5097 1364 c-4 -4 -7 -30 -7 -58 l0 -51 -235 -1 -235 -1 0 54 c0 69 -18 69 -22 1 l-3 -53 -63 4 c-45 2 -69 -1 -87 -13 l-25 -16 1 -323 c0 -177 4 -331 9 -342 6 -14 9 5 11 60 1 44 2 87 3 95 1 13 23 15 131 15 l130 0 2 -147 1 -148 -31 0 c-80 -1 -51 -18 40 -24 200 -13 527 -7 551 10 l22 15 0 394 0 395 -24 16 c-18 11 -43 15 -88 12 l-63 -3 3 42 c4 42 -8 79 -21 67z m-497 -179 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 235 0 235 0 0 -44 c0 -46 13 -68 24 -40 3 9 6 31 6 50 l0 34 63 0 c79 0 87 -8 87 -87 l0 -63 -410 0 -410 0 0 68 c0 84 -2 82 82 82 l68 0 0 -45z m100 -259 c0 -74 3 -141 6 -150 5 -14 -10 -16 -125 -16 l-131 0 0 150 0 150 125 0 125 0 0 -134z m289 -16 l1 -150 -130 0 -130 0 0 150 0 150 130 0 129 0 0 -150z m281 0 l0 -150 -130 0 -130 0 0 150 0 150 130 0 130 0 0 -150z m-373 -179 l93 -1 -2 -145 -2 -145 -128 0 -128 0 0 150 0 149 38 -3 c20 -2 79 -4 129 -5z m291 -1 l82 0 0 -129 c0 -175 12 -161 -136 -161 l-124 0 0 144 c0 158 0 159 60 151 19 -3 72 -5 118 -5z";

export const OG_SIZE = { width: 1200, height: 630 };

export function whenLogoSvg(width: number, fill = "#fafafa") {
  // Original viewBox 0 0 600 188 — keep ratio when overriding width
  const height = Math.round((width / 600) * 188);
  return (
    <svg width={width} height={height} viewBox="0 0 600 188" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,188) scale(0.1,-0.1)" fill={fill} stroke="none">
        <path d={LOGO_PATH_1} />
        <path d={LOGO_PATH_2} />
      </g>
    </svg>
  );
}

type OgConfig = {
  /** Top label, uppercase, accent-colored */
  label: string;
  /** Bottom main heading, large white text */
  heading?: string;
  /** Bottom secondary text */
  sub?: string;
  /** URL shown in bottom-right (e.g. "whenbooking.pl") */
  domain?: string;
};

export function whenOgImage(cfg: OgConfig) {
  const { label, heading, sub, domain = "whenbooking.pl" } = cfg;
  const hasFooter = Boolean(heading || sub);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: hasFooter ? "space-between" : "center",
          alignItems: hasFooter ? "stretch" : "center",
          gap: hasFooter ? 0 : 36,
          padding: "70px 90px",
          background:
            "radial-gradient(circle at 25% 25%, rgba(212,162,106,0.18), transparent 55%), #09090b",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#d4a26a",
          }}
        >
          <span style={{ width: 36, height: 2, background: "#d4a26a" }} />
          {label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: hasFooter ? "flex-start" : "center",
            flex: hasFooter ? 1 : 0,
            paddingTop: hasFooter ? 30 : 0,
          }}
        >
          {whenLogoSvg(640)}
        </div>

        {hasFooter && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              color: "#a1a1aa",
              fontSize: 28,
              fontWeight: 400,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {heading && (
                <span style={{ color: "#fafafa", fontSize: 36, fontWeight: 600 }}>{heading}</span>
              )}
              {sub && <span style={{ fontSize: 22 }}>{sub}</span>}
            </div>
            {domain && (
              <span style={{ fontSize: 18, color: "#71717a", letterSpacing: "0.1em" }}>{domain}</span>
            )}
          </div>
        )}

        {!hasFooter && (
          <span style={{ fontSize: 28, color: "#a1a1aa" }}>Zarezerwuj wizytę online</span>
        )}
      </div>
    ),
    { ...OG_SIZE }
  );
}
