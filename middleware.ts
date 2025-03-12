import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*",
};

const allowedOrigins = [
  "https://presagio.pages.dev",
  "https://presagio.eth.limo",
  "https://presagio.eth.link",
];

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

const isProd = process.env.NODE_ENV === "production";
const allowAnyOrigin = process.env.ALLOW_ANY_ORIGIN === "true";

export function middleware(request: NextRequest) {
  // Check the origin from the request
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin =
    isProd && !allowAnyOrigin ? allowedOrigins.includes(origin) : true;

  // Handle preflighted requests
  const isPreflight = request.method === "OPTIONS";

  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
      ...corsOptions,
    };
    return NextResponse.json({}, { headers: preflightHeaders });
  }

  // Handle simple requests
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
