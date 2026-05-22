"use client";

import { useState } from "react";

/**
 * Staff avatar — shows the employee photo in a circle with a colored ring
 * (so the per-staff color coding is preserved as the ring). Falls back to a
 * solid colored circle when there's no photo, or if the image fails to load.
 *
 * Use everywhere the small color dot appears next to a staff member.
 */
export function StaffAvatar({
  photoUrl,
  color,
  name,
  size = 40,
}: {
  photoUrl?: string | null;
  color: string;
  name: string;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const showPhoto = Boolean(photoUrl) && !errored;
  const dim = `${size}px`;

  if (showPhoto) {
    return (
      <span
        className="inline-block shrink-0 overflow-hidden rounded-full"
        style={{ width: dim, height: dim, boxShadow: `0 0 0 2px ${color}` }}
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl as string}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: dim, height: dim, backgroundColor: color }}
      title={name}
    />
  );
}
