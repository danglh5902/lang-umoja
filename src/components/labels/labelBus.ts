import type * as THREE from "three";

/**
 * Cầu nối giữa thế giới 3D và lớp nhãn DOM.
 * - Component 3D đăng ký "anchor" (Object3D) theo id.
 * - Lớp DOM đăng ký phần tử HTML cùng id.
 * - LabelProjector (trong Canvas) mỗi frame chiếu anchor ra màn hình và đặt transform cho phần tử.
 * Không tạo React root lồng nhau như drei <Html> → không lỗi unmount với React 19.
 */
export const labelAnchors = new Map<string, THREE.Object3D>();
export const labelElements = new Map<string, HTMLElement>();

export function anchorRef(id: string) {
  return (obj: THREE.Object3D | null) => {
    if (obj) labelAnchors.set(id, obj);
    else labelAnchors.delete(id);
  };
}

export function elementRef(id: string) {
  return (el: HTMLElement | null) => {
    if (el) labelElements.set(id, el);
    else labelElements.delete(id);
  };
}
