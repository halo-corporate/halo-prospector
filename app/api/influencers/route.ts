import { NextResponse } from "next/server";
import { listInfluencers } from "@/lib/influenciadores/queries";

export async function GET() {
  try {
    const influencers = await listInfluencers();
    return NextResponse.json(influencers);
  } catch (err) {
    console.error("[GET /api/influencers]", err);
    return NextResponse.json(
      { error: "Erro ao buscar influenciadores" },
      { status: 500 },
    );
  }
}
