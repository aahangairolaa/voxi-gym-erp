/**
 * Small helpers that every API route uses:
 *   export const GET = route(async (req) => { ...return data })
 * - Whatever you return is sent as JSON.
 * - Throw `new ApiError(404, "Member not found")` to send an error.
 * - Validation (zod) and database errors are turned into friendly messages.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<any> };

export function route<P extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, params: P) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const params = ((ctx?.params ? await ctx.params : {}) ?? {}) as P;
      const data = await handler(req, params);
      if (data instanceof Response) return data;
      return NextResponse.json(data ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join(".");
    return NextResponse.json(
      { error: field ? `${field}: ${first!.message}` : first?.message ?? "Invalid input", issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      return NextResponse.json({ error: `That ${target ?? "value"} is already in use.` }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "This record is linked to other data and can't be removed." }, { status: 409 });
    }
  }
  if (err instanceof Prisma.PrismaClientInitializationError || (err instanceof Error && /DATABASE_URL|Can't reach database/.test(err.message))) {
    console.error("[VOXI database unavailable]", err.message);
    return NextResponse.json({ error: process.env.DATABASE_URL ? "VOXI can't reach its database right now. Please try again in a minute." : "VOXI is launching soon — sign-in isn't open yet." }, { status: 503 });
  }
  console.error("[VOXI API error]", err);
  return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
}

/** Read + validate the JSON body of a request. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readBody<T>(req: NextRequest, schema: ZodType<T, ZodTypeDef, any>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema.parse(json);
}

/** Read query-string values: searchParams(req).get("search") */
export function searchParams(req: NextRequest) {
  return req.nextUrl.searchParams;
}

export function notFound(what = "Record"): never {
  throw new ApiError(404, `${what} not found.`);
}
