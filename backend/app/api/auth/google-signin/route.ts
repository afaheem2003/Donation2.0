import { signIn } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/";
  await signIn("google", { redirectTo: callbackUrl });
}
