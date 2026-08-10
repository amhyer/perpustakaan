import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    member: user.member
      ? {
          id: user.member.id,
          memberNumber: user.member.memberNumber,
          fullName: user.member.fullName,
          category: user.member.category,
          photo: user.member.photo,
          classGrade: user.member.classGrade,
        }
      : null,
  });
}
