import { NextResponse } from "next/server";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";

async function imageProxyHandler(req: AppRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.href);

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao buscar imagem" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL não aponta para uma imagem" }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar imagem" }, { status: 502 });
  }
}

export const GET = compose(withAuth, withTenant, imageProxyHandler);
