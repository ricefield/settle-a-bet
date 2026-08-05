import { NextResponse, type NextRequest } from "next/server";

import { getBetModule } from "@/lib/bet";
import { withErrorHandling } from "@/lib/api/server-utils";

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const result = await getBetModule().submit(token, await request.json());
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  },
);
