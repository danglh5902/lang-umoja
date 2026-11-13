"use client";

import { useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { formatDestroy, formatKind, formatVnd } from "@/lib/format";

export interface PaymentPayload {
  orderCode: number;
  amount: number;
  qrDataUrl: string;
  checkoutUrl: string | null;
  provider: "mock" | "payos";
}

export default function QrModal({
  payload,
  title,
  onClose,
  paidEmoji = "🌱",
  paidTitle = "Cảm ơn Người Gieo Mầm!",
  paidText,
  paidAction = "Quay lại làng",
  donorName,
  unit = "kind",
}: {
  payload: PaymentPayload;
  title: string;
  onClose: () => void;
  paidEmoji?: string;
  paidTitle?: string;
  paidText?: string;
  paidAction?: string;
  /** Có tên → đây là khoản ủng hộ làng, hiện thông báo lên Bảng Vinh Danh */
  donorName?: string;
  /** đơn vị trong game của khoản này: nhân đạo (phe tốt) hay hủy diệt (kẻ xấu) */
  unit?: "kind" | "destroy";
}) {
  const inGame = unit === "destroy" ? formatDestroy(payload.amount) : formatKind(payload.amount);
  const [status, setStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [confirming, setConfirming] = useState(false);
  const fetchWorld = useWorld((s) => s.fetchWorld);
  const setOpenBoard = useWorld((s) => s.setOpenBoard);

  // thanh toán xong → tải lại thế giới ngay để Bảng Vinh Danh có tên người vừa ủng hộ
  useEffect(() => {
    if (status === "PAID") void fetchWorld();
  }, [status, fetchWorld]);

  useEffect(() => {
    if (status === "PAID") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/donations?orderCode=${payload.orderCode}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { status: string };
        if (data.status === "PAID") setStatus("PAID");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [payload.orderCode, status]);

  const mockConfirm = async () => {
    setConfirming(true);
    const res = await fetch("/api/mock-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode: payload.orderCode }),
    });
    if (res.ok) setStatus("PAID");
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[#17201b] p-6 text-white shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "PAID" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-5xl">{paidEmoji}</div>
            <h3 className="text-xl font-bold text-emerald-300">{paidTitle}</h3>
            <p className="text-sm text-white/80">
              {paidText ??
                `${inGame} của bạn đã đến với làng. Hãy nhìn ra ngôi làng — điều gì đó đang thay đổi...`}
            </p>
            {donorName && (
              <div className="w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                🏆 Tên <strong className="text-amber-300">{donorName}</strong> đã được khắc lên Bảng Vinh Danh!
                <button
                  className="mt-1 block w-full text-xs font-semibold text-amber-300 underline hover:text-amber-200"
                  onClick={() => {
                    onClose();
                    setOpenBoard("honor");
                  }}
                >
                  Xem Bảng Vinh Danh →
                </button>
              </div>
            )}
            <button
              className="mt-2 rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-black hover:bg-emerald-400"
              onClick={onClose}
            >
              {paidAction}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-white/70">
              Quét mã QR để chuyển <strong className="text-white">{formatVnd(payload.amount)}</strong>
            </p>
            <p className={`-mt-2 text-xs font-bold ${unit === "destroy" ? "text-red-300" : "text-amber-300"}`}>
              = {inGame}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={payload.qrDataUrl} alt="QR thanh toán" className="h-56 w-56 rounded-xl bg-white p-2" />
            <p className="text-xs text-white/50">Mã giao dịch: {payload.orderCode}</p>
            {payload.checkoutUrl && (
              <a
                href={payload.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-sky-300 underline"
              >
                Hoặc mở trang thanh toán PayOS →
              </a>
            )}
            {payload.provider === "mock" && (
              <button
                disabled={confirming}
                onClick={mockConfirm}
                className="mt-1 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {confirming ? "Đang xác nhận..." : "✅ Tôi đã chuyển khoản (giả lập)"}
              </button>
            )}
            <p className="text-[11px] text-white/40">
              {payload.provider === "mock"
                ? "Chế độ demo — chưa có tiền thật nào được chuyển."
                : "Đang chờ xác nhận từ ngân hàng (tự động)..."}
            </p>
            <button className="text-xs text-white/50 underline" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
