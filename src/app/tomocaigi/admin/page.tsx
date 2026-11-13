"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { formatDestroy, formatKind } from "@/lib/format";

interface Contribution {
  id: string;
  name: string;
  slogan: string;
  lore: string;
  contributorName: string | null;
  status: string;
  createdAt: string;
}
interface DonationRow {
  id: string;
  type: string;
  amount: number;
  status: string;
  orderCode: number;
  payerName: string | null;
  createdAt: string;
  building: { name: string } | null;
  child: { name: string } | null;
}
interface StandingBuilding {
  id: string;
  name: string;
  raisedAmount: number;
  goalAmount: number;
  source: string;
  contributorName: string | null;
  createdAt: string;
}
interface Overview {
  contributions: Contribution[];
  donations: DonationRow[];
  standingBuildings: StandingBuilding[];
  env: "production" | "local";
  testTools: boolean;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (pw: string) => {
      setError(null);
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Sai mật khẩu");
        setData(null);
        return;
      }
      setData((await res.json()) as Overview);
    },
    []
  );

  const act = async (url: string, body: object) => {
    setBusy(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "Lỗi");
      return;
    }
    await load(password);
  };

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#131a16] p-4 text-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(password);
          }}
          className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#1b241f] p-6"
        >
          <h1 className="text-xl font-black">🛡️ Hội đồng làng</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu admin"
            className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm outline-none"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 font-bold text-black">
            Vào
          </button>
        </form>
      </main>
    );
  }

  const villainBuildings = data.standingBuildings.filter((b) => b.source === "COMMUNITY");

  return (
    <main className="min-h-dvh bg-[#131a16] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black">
            🛡️ Hội đồng làng Umoja
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                data.env === "production" ? "bg-red-500/80 text-white" : "bg-sky-500/80 text-white"
              }`}
            >
              {data.env === "production" ? "🌐 ONLINE — dữ liệu thật" : "🧪 LOCAL — dữ liệu thử"}
            </span>
          </h1>
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            ← Về làng
          </Link>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <section className="mt-6">
          <h2 className="font-bold text-red-300">😈 Tòa nhà do kẻ xấu dựng ({villainBuildings.length})</h2>
          <p className="mt-1 text-xs text-white/50">
            Tòa nhà mọc lên ngay khi kẻ xấu trả phí. Gỡ những tòa đặt tên người/công ty có thật hoặc nội dung phản cảm.
          </p>
          {villainBuildings.length === 0 && <p className="mt-2 text-sm text-white/50">Chưa có tòa nào.</p>}
          <div className="mt-2 flex flex-col gap-1.5">
            {villainBuildings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm">
                <span>
                  <strong>{b.name}</strong>{" "}
                  <span className="text-white/50">
                    — bởi {b.contributorName ?? "Kẻ Giấu Mặt"} · {new Date(b.createdAt).toLocaleString("vi-VN")}
                  </span>
                </span>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Gỡ tòa "${b.name}" khỏi làng?`)) void act(`/api/admin/buildings/${b.id}`, {});
                  }}
                  className="shrink-0 rounded-lg bg-red-500/80 px-3 py-1 text-xs font-bold disabled:opacity-50"
                >
                  🗑️ Gỡ bỏ
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-amber-300">🏭 Tòa đang đứng ({data.standingBuildings.length})</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {data.standingBuildings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span>
                  {b.name}{" "}
                  <span className="text-white/40">
                    ({formatKind(b.raisedAmount)} / {formatDestroy(b.goalAmount)})
                  </span>
                </span>
                {data.testTools && (
                  <button
                    disabled={busy}
                    onClick={() => act("/api/admin/fast-forward", { buildingId: b.id })}
                    className="rounded-lg bg-amber-400/90 px-3 py-1 text-xs font-bold text-black disabled:opacity-50"
                    title="Test: nạp đủ tiền còn thiếu để tòa này sụp ngay"
                  >
                    ⏩ Phá nhanh (test)
                  </button>
                )}
              </div>
            ))}
            {data.standingBuildings.length === 0 && (
              <p className="text-sm text-emerald-300">Tất cả đã sụp đổ — thế giới mới đã mở. 🌍</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-amber-300">💸 Giao dịch gần đây</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-white/40">
                <tr>
                  <th className="py-1 pr-3">Thời gian</th>
                  <th className="py-1 pr-3">Loại</th>
                  <th className="py-1 pr-3">Mục tiêu</th>
                  <th className="py-1 pr-3">Số tiền</th>
                  <th className="py-1 pr-3">Người góp</th>
                  <th className="py-1">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.donations.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="py-1.5 pr-3 text-white/50">{new Date(d.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="py-1.5 pr-3">
                      {d.type === "DEMOLISH" ? "⚒️ Phá" : d.type === "FEED" ? "🍞 Nuôi" : "😈 Phí phá làng"}
                    </td>
                    <td className="py-1.5 pr-3">{d.building?.name ?? d.child?.name ?? "—"}</td>
                    <td className="py-1.5 pr-3 font-bold">
                      {d.amount.toLocaleString("vi-VN")}đ{" "}
                      <span className="font-normal text-white/40">
                        ({d.type === "CONTRIBUTE_FEE" ? "hủy diệt" : "nhân đạo"})
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">{d.payerName ?? "ẩn danh"}</td>
                    <td className={`py-1.5 ${d.status === "PAID" ? "text-emerald-300" : "text-white/40"}`}>
                      {d.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
