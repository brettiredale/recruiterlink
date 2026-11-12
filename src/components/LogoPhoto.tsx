"use client";

import Image from "next/image";
import { useState } from "react";

export type LogoPhotoProps = {
  src: string;
  alt: string;
  size: number;
  /** Load straight away (for logos at the top of the page). */
  eager?: boolean;
};

/**
 * The logo picture itself. If the file fails to load it removes itself, which
 * reveals the initials placeholder that LogoImage always renders underneath.
 */
export function LogoPhoto({ src, alt, size, eager = false }: LogoPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      className="absolute inset-0 h-full w-full bg-white object-contain"
      onError={() => setFailed(true)}
      ref={(img) => {
        // Catches a failure that happened before the page became interactive.
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
