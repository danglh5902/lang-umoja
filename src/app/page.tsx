import { redirect } from "next/navigation";
import { isSunset } from "@/lib/game";
import Home from "@/components/Home";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Thế giới mới đã mở → website "ngủ yên", mọi đường dẫn về trang kết
  if (await isSunset()) redirect("/epilogue");
  return <Home />;
}
