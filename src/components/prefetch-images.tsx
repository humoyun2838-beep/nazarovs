"use client";

import { useEffect } from "react";

export function PrefetchImages({ urls }: { urls: string[] }) {
  useEffect(() => {
    const unique = [...new Set(urls.filter(Boolean))];
    for (const url of unique) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [urls]);

  return null;
}
