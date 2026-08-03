import { NextResponse, type NextRequest } from "next/server";

import { getBetModule } from "@/lib/bet";
import { withErrorHandling } from "@/lib/api/server-utils";

export const POST = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    await getBetModule().cancel(token);
    return NextResponse.json(
      { cancelled: true },
      { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } },
    );
  },
);
