import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Quick DB connectivity check
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "unhealthy", db: "disconnected", error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", error: "Internal error" },
      { status: 503 }
    );
  }
}
