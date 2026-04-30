import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { OG_SIZE, whenLogoSvg } from "@/lib/og-when";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

export const runtime = "edge";
export const alt = "Rezerwacja potwierdzona";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { id: string };

export default async function OgImage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  // Fetch booking + settings
  let businessName = "when?";
  let serviceName = "";
  let dateLabel = "";
  let timeLabel = "";

  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const supabase = createAdminClient();
    const { data: booking } = await supabase
      .from("bookings")
      .select("starts_at, ends_at, tenant_id, service:services(name)")
      .eq("id", id)
      .maybeSingle();

    if (booking) {
      const { data: settings } = await supabase
        .from("settings")
        .select("business_name, color_accent")
        .eq("tenant_id", booking.tenant_id)
        .maybeSingle();

      businessName = (settings?.business_name as string | null) ?? "when?";
      const svcRaw = booking.service;
      const svc = (Array.isArray(svcRaw) ? svcRaw[0] : svcRaw) as { name: string } | null;
      serviceName = svc?.name ?? "";
      dateLabel = formatWarsawDate(booking.starts_at as string);
      timeLabel = formatWarsawTime(booking.starts_at as string);
    }
  }

  const accent = "#d4a26a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background:
            "radial-gradient(circle at 20% 30%, rgba(212,162,106,0.15), transparent 50%), #09090b",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fafafa",
        }}
      >
        {/* Top — label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          <span style={{ width: 28, height: 2, background: accent }} />
          Rezerwacja potwierdzona
        </div>

        {/* Middle — business + service */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "#fafafa",
              lineHeight: 1.1,
            }}
          >
            {businessName}
            <span style={{ color: accent }}>.</span>
          </div>
          {serviceName && (
            <div
              style={{
                fontSize: 28,
                color: "#a1a1aa",
                fontWeight: 400,
              }}
            >
              {serviceName}
            </div>
          )}
        </div>

        {/* Bottom — date + logo */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          {dateLabel ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 600, color: accent }}>
                {timeLabel}
              </span>
              <span style={{ fontSize: 22, color: "#71717a" }}>{dateLabel}</span>
            </div>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", opacity: 0.35 }}>
            {whenLogoSvg(160, "#fafafa")}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
