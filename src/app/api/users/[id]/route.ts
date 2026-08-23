import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
    }

    const updateData: any = {
      name: body.name,
      email: body.email,
      username: body.username,
      kelas: body.kelas || null,
      role: body.role,
    };

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email atau username sudah digunakan." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "User tidak ditemukan." },
      { status: 404 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: "User tidak ditemukan." },
      { status: 404 },
    );
  }
}
