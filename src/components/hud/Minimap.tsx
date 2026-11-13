"use client";

import { GRID_SIZE, TILE, VILLAGE_CENTER, gridToWorld, type WorldData } from "@/lib/world-types";
import { useWorld } from "@/store/world";

const SIZE = 168;
const WORLD = GRID_SIZE * TILE;

function worldToPx(wx: number, wz: number): [number, number] {
  return [((wx + WORLD / 2) / WORLD) * SIZE, ((wz + WORLD / 2) / WORLD) * SIZE];
}

export default function Minimap({ world }: { world: WorldData }) {
  const selectBuilding = useWorld((s) => s.selectBuilding);
  const setFocusPoint = useWorld((s) => s.setFocusPoint);
  const selectedId = useWorld((s) => s.selectedBuildingId);
  const [vx, vz] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);
  const [vpx, vpy] = worldToPx(vx, vz);

  const mapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SIZE;
    const py = ((e.clientY - rect.top) / rect.height) * SIZE;
    const wx = (px / SIZE) * WORLD - WORLD / 2;
    const wz = (py / SIZE) * WORLD - WORLD / 2;
    setFocusPoint([wx, wz]);
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 rounded-xl border border-white/15 bg-black/50 p-2 backdrop-blur-sm">
      <p className="mb-1 text-center text-[10px] font-bold text-white/60">🗺️ Bản đồ — click để bay tới</p>
      <svg
        width={SIZE}
        height={SIZE}
        className="cursor-crosshair rounded-lg"
        style={{ background: "linear-gradient(135deg, #5c4a2e, #4a5a30)" }}
        onClick={mapClick}
      >
        {/* làng */}
        <circle cx={vpx} cy={vpy} r={10} fill="rgba(255,220,130,0.25)" stroke="#ffd166" strokeWidth={1} />
        <text x={vpx} y={vpy + 3.5} textAnchor="middle" fontSize={9}>
          🏕️
        </text>
        {/* tòa nhà */}
        {world.buildings.map((b) => {
          const [wx, wz] = gridToWorld(b.gridX, b.gridY);
          const [px, py] = worldToPx(wx, wz);
          const destroyed = b.status === "DESTROYED";
          return (
            <g
              key={b.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!destroyed) selectBuilding(b.id);
                else setFocusPoint([wx, wz]);
              }}
            >
              <circle
                cx={px}
                cy={py}
                r={selectedId === b.id ? 6 : 4.5}
                fill={destroyed ? "#4ade80" : "#ef4444"}
                stroke={selectedId === b.id ? "#fff" : "rgba(0,0,0,0.5)"}
                strokeWidth={selectedId === b.id ? 1.5 : 0.5}
              />
              <text x={px} y={py + 2.6} textAnchor="middle" fontSize={6.5}>
                {destroyed ? "🌳" : "🏭"}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-center gap-3 text-[9px] text-white/60">
        <span>🔴 Cần phá</span>
        <span>🟢 Đã xanh</span>
      </div>
    </div>
  );
}
