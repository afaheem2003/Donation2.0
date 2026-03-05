import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NonprofitCategory } from "@prisma/client";

const schema = z.object({
  interests: z.array(z.nativeEnum(NonprofitCategory)).optional(),
  school: z.string().max(200).optional(),
  givingFrequency: z.enum(["one_time", "monthly", "whenever"]).optional(),
  complete: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { interests, school, givingFrequency, complete } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (interests !== undefined) updateData.interests = interests;
  if (school !== undefined) updateData.school = school;
  if (givingFrequency !== undefined) updateData.givingFrequency = givingFrequency;
  if (complete === true) updateData.onboardingComplete = true;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      interests: true,
      school: true,
      givingFrequency: true,
      onboardingComplete: true,
    },
  });

  return NextResponse.json(user);
}
