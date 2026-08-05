import type { NextRequest } from "next/server";

export function requestContext(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "") ??
    "https";
  return { ip, baseUrl: `${protocol}://${host}` };
}

export function bearerToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}
