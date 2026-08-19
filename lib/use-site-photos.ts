"use client";

import { useEffect, useState } from "react";
import { asPhotos, defaultPhotos, type SitePhotos } from "@/lib/site-photos";

let cache: SitePhotos | null = null;
let inflight: Promise<SitePhotos> | null = null;

function loadPhotos() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        cache = asPhotos(json.photos);
        return cache;
      })
      .catch(() => defaultPhotos())
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSitePhotos() {
  const [photos, setPhotos] = useState<SitePhotos>(cache || defaultPhotos());
  useEffect(() => {
    void loadPhotos().then(setPhotos);
  }, []);
  return photos;
}
