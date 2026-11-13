import { redirect } from "next/navigation";
import { isSunset } from "@/lib/game";
import SabotageForm from "@/components/SabotageForm";
import { getDestructionLevels } from "@/lib/prices";

export const dynamic = "force-dynamic";

export default async function SabotagePage() {
  if (await isSunset()) redirect("/epilogue");
  return <SabotageForm levels={await getDestructionLevels()} />;
}
