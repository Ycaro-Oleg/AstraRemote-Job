import type { Ats, FetchResult } from "../types.ts";
import { fetchArbeitnow } from "./arbeitnow.ts";
import { fetchAshby } from "./ashby.ts";
import { fetchGreenhouse } from "./greenhouse.ts";
import { fetchHimalayas } from "./himalayas.ts";
import { fetchJobicy } from "./jobicy.ts";
import { fetchLever } from "./lever.ts";
import { fetchRemoteok } from "./remoteok.ts";
import { fetchRemotive } from "./remotive.ts";
import { fetchWwr } from "./wwr.ts";

export async function fetchBoard(
  ats: Ats,
  slug: string,
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<FetchResult> {
  switch (ats) {
    case "greenhouse":
      return fetchGreenhouse(slug, fetchFn, name);
    case "lever":
      return fetchLever(slug, fetchFn, name);
    case "ashby":
      return fetchAshby(slug, fetchFn, name);
    case "remotive":
      return fetchRemotive(slug, fetchFn);
    case "remoteok":
      return fetchRemoteok(slug, fetchFn);
    case "wwr":
      return fetchWwr(slug, fetchFn);
    case "himalayas":
      return fetchHimalayas(slug, fetchFn);
    case "arbeitnow":
      return fetchArbeitnow(slug, fetchFn);
    case "jobicy":
      return fetchJobicy(slug, fetchFn);
    case "captured":
      return { postings: [] };
    default: {
      const _exhaustive: never = ats;
      throw new Error(`Unknown ATS: ${_exhaustive}`);
    }
  }
}
