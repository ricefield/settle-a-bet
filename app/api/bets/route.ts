import { NextResponse, type NextRequest } from "next/server";

import { getBetModule } from "@/lib/bet";
import { requestContext } from "@/lib/api/request-context";
import { withErrorHandling } from "@/lib/api/server-utils";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const result = await getBetModule().create(await request.json(), requestContext(request));
  return NextResponse.json(result, {
    status: 201,
    headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
});
