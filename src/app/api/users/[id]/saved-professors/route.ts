import { NextRequest, NextResponse } from "next/server";
import {
  getUserSavedProfessorIds,
  toggleUserSavedProfessor,
  syncUserSavedProfessors,
} from "@/lib/server/db";
import { requireActiveUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const professorIds = await getUserSavedProfessorIds(id);
    return NextResponse.json({ professorIds }, { status: 200 });
  } catch (error) {
    console.error("[API GET /api/users/[id]/saved-professors] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved professors" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    let session;
    try {
      session = await requireActiveUser(req);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.code || "unauthorized", message: authErr.message },
        { status: authErr.status || 403 }
      );
    }

    if (session.user.uid !== id) {
      return NextResponse.json({ error: "Unauthorized user ID mismatch" }, { status: 403 });
    }

    const body = await req.json();

    // If syncing initial / offline list
    if (Array.isArray(body.syncIds)) {
      const professorIds = await syncUserSavedProfessors(id, body.syncIds);
      return NextResponse.json({ success: true, professorIds }, { status: 200 });
    }

    // Single toggle
    const { professorId } = body;
    if (!professorId || typeof professorId !== "string") {
      return NextResponse.json(
        { error: "Missing professor ID" },
        { status: 400 }
      );
    }

    const result = await toggleUserSavedProfessor(id, professorId.trim());
    return NextResponse.json(
      {
        success: true,
        isSaved: result.isSaved,
        professorIds: result.professorIds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API POST /api/users/[id]/saved-professors] Error:", error);
    return NextResponse.json(
      { error: "Failed to update saved professor" },
      { status: 500 }
    );
  }
}
