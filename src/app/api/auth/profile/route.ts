import { NextRequest, NextResponse } from "next/server";
import { authenticateSessionToken, SESSION_COOKIE_NAME, requireActiveUser } from "@/lib/server/auth";
import { updateDbUserProfile, getDbUserById } from "@/lib/server/db";
import { toUserProfile } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json(
      { profile: session.profile },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/auth/profile] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    let session;
    try {
      session = await requireActiveUser(req);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.code || "unauthorized", message: authErr.message },
        { status: authErr.status || 403 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, school, fieldOfStudy, expectedGraduationYear } = body;

    const updatedRecord = await updateDbUserProfile(session.user.uid, {
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      school: school ?? null,
      fieldOfStudy: fieldOfStudy ?? null,
      expectedGraduationYear: expectedGraduationYear ?? null,
      displayName: firstName && lastName ? `${firstName} ${lastName}` : session.user.displayName,
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    const updatedProfile = toUserProfile(updatedRecord);

    return NextResponse.json(
      { profile: updatedProfile },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/auth/profile] PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
