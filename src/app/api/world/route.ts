import { NextResponse } from "next/server";
import { getWorld } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const world = await getWorld();
  return NextResponse.json(world);
}
