import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  body: z.string().min(1).max(1000),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  // Verify the parent post exists and is not deleted
  const post = await prisma.post.findFirst({ where: { id: postId, isDeleted: false } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  const post = await prisma.post.findFirst({ where: { id: postId, isDeleted: false } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (!post.allowComments) {
    return NextResponse.json({ error: "Comments are disabled on this post" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { postId, userId: session.user.id, body: parsed.data.body },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
