import { NextResponse, type NextRequest } from "next/server";

import { getAdminTakedownSecret, getBetModule } from "@/lib/bet";
import { bearerToken } from "@/lib/api/request-context";
import { withErrorHandling } from "@/lib/api/server-utils";

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await params;
    await getBetModule().hide(publicId, bearerToken(request), getAdminTakedownSecret());
    return NextResponse.json({ hidden: true });
  },
);
