import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const envelope = await request.text();
    const piece = envelope.split("\n")[0];
    const header = JSON.parse(piece);

    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace("/", "");
    const sentryUrl = `https://${dsn.hostname}/api/${projectId}/envelope/`;

    const response = await fetch(sentryUrl, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
    });

    return NextResponse.json({ status: response.status });
  } catch {
    return NextResponse.json({ error: "Tunnel failed" }, { status: 500 });
  }
}
