import { NextRequest, NextResponse } from "next/server";
import { getLecturerById } from "@/lib/server/db";
import { getServerProfessorById } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing lecturer ID" }, { status: 400 });
    }

    const lecturer = (await getLecturerById(id)) || (await getServerProfessorById(id));
    if (!lecturer) {
      return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
    }

    return NextResponse.json(lecturer, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/lecturers/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
