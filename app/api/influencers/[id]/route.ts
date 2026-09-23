import { NextRequest, NextResponse } from "next/server";
import {
  createInfluencerAction,
  updateInfluencerAction,
  deleteInfluencerAction,
} from "@/lib/influenciadores/actions";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const result = await createInfluencerAction(undefined, formData);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/influencers]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").slice(-2, -1)[0];

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const formData = await req.formData();
    const result = await updateInfluencerAction(id, undefined, formData);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/influencers/[id]]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").slice(-2, -1)[0];

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const result = await deleteInfluencerAction(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/influencers/[id]]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
