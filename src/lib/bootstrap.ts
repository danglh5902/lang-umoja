import { prisma } from "./db";
import { DEFAULT_CHILDREN, DEFAULT_ITEMS } from "./defaults";

// dùng chung 1 promise để hai request đầu tiên chạy song song không tạo trùng em bé
let pending: Promise<void> | null = null;

/**
 * Tạo dữ liệu nền nếu còn thiếu (database online mới tinh chưa từng seed):
 * dòng WorldState, 8 em bé, 5 món quà. KHÔNG xóa hay sửa gì đã có.
 * Tòa nhà không tự tạo — admin thêm (hoặc bấm "Nạp 12 tòa mẫu").
 */
export function ensureBaseData(): Promise<void> {
  pending ??= (async () => {
    await prisma.worldState.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    if ((await prisma.child.count()) === 0) await prisma.child.createMany({ data: DEFAULT_CHILDREN });
    if ((await prisma.item.count()) === 0) await prisma.item.createMany({ data: DEFAULT_ITEMS });
  })().catch((e) => {
    pending = null; // lỗi thì lần sau thử lại
    throw e;
  });
  return pending;
}
