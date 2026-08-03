import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";

type ErrorHandler<Args extends unknown[]> = (
  req: NextRequest,
  ...args: Args
) => Promise<NextResponse>;

export function withErrorHandling<Args extends unknown[]>(
  handler: ErrorHandler<Args>,
): ErrorHandler<Args> {
  return async (request: NextRequest, ...args: Args): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: { message: "Validation failed", issues: error.issues } },
          { status: 400 },
        );
      } else if (error instanceof AppError) {
        return NextResponse.json(
          { error: { message: error.message } },
          { status: error.statusCode },
        );
      }

      console.error("Unhandled API Error:", error);
      return NextResponse.json(
        { error: { message: "An unexpected error occurred." } },
        { status: 500 },
      );
    }
  };
}
