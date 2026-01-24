import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const hashed = await bcrypt.hash(body.password, 10);

  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      username: body.username,
      password: hashed,
      role: body.role,
    },
  });

  return NextResponse.json(user);
}
