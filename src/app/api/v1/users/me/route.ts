import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/integrations/api-auth";
import { serializeUser } from "@/lib/integrations/serialize";

export const GET = withApiAuth(async (_req, user) => NextResponse.json({ resource: serializeUser(user) }));
