import { createFileRoute } from "@tanstack/react-router";
import {
  BUILTIN_AMBIENT_TRACK_ID,
  SECOND_BUILTIN_AMBIENT_TRACK_ID,
} from "@/features/ambient-music.shared";

const sources = new Map([
  [
    BUILTIN_AMBIENT_TRACK_ID,
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663944662130/qNSMGMklwZieRTUU.mp3",
  ],
  [
    SECOND_BUILTIN_AMBIENT_TRACK_ID,
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663957546608/bVwvljMqcZRhBjZq.mp3",
  ],
]);

async function streamAmbientAudio(request: Request): Promise<Response> {
  const trackId = new URL(request.url).searchParams.get("track") ?? "";
  const source = sources.get(trackId);
  if (!source) return new Response("Faixa não encontrada", { status: 404 });

  const headers = new Headers();
  const range = request.headers.get("range");
  if (
    range &&
    range.length <= 128 &&
    /^bytes=(?:\d+-\d*|-\d+)(?:,(?:\d+-\d*|-\d+))*$/i.test(range)
  ) {
    headers.set("Range", range);
  }

  let upstream: Response;
  try {
    upstream = await fetch(source, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      signal: request.signal,
    });
  } catch {
    return new Response("Áudio temporariamente indisponível", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (upstream.status !== 200 && upstream.status !== 206 && upstream.status !== 416) {
    return new Response("Áudio temporariamente indisponível", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const responseHeaders = new Headers({
    "Content-Type": "audio/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const Route = createFileRoute("/api/ambient-audio")({
  server: {
    handlers: {
      GET: ({ request }) => streamAmbientAudio(request),
      HEAD: ({ request }) => streamAmbientAudio(request),
    },
  },
});
