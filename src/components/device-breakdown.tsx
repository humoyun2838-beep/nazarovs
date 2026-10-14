"use client";
import { UiText } from "@/components/ui-locale";


import { useState } from "react";

type ModelRow = {
  model: string;
  browser: string;
  username: string;
  count: number;
};

export function DeviceBreakdown({
  devices,
  models,
}: {
  devices: Record<string, number>;
  models: Record<string, ModelRow[]>;
}) {
  const [open, setOpen] = useState("");
  const entries = Object.entries(devices).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;

  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-[#4a6288]"><UiText>{"Hali ma’lumot yo‘q."}</UiText></p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {entries.map(([name, count]) => {
        const expanded = open === name;
        const rows = (models[name] || []).sort((a, b) => b.count - a.count);
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? "" : name)}
              className="w-full rounded-xl px-1 py-1 text-left hover:bg-[#f3f7fd]"
            >
              <div className="flex justify-between text-sm">
                <span className="font-medium text-[#071a38]"><UiText>{name}</UiText></span>
                <span className="tabular-nums text-[#4a6288]">{count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e8f1fb]">
                <div
                  className="h-full rounded-full bg-[#1a6fd4]"
                  style={{ width: `${Math.round((count / total) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[#1a6fd4]">
                <UiText>{expanded ? "Yopish" : "Modelni ko‘rish"}</UiText>
              </p>
            </button>
            {expanded ? (
              <ul className="mt-2 space-y-1 rounded-xl bg-[#f6f9fe] px-3 py-2">
                {rows.length === 0 ? (
                  <li className="text-xs text-[#4a6288]"><UiText>{"Model aniqlanmadi."}</UiText></li>
                ) : (
                  rows.map((row) => (
                    <li
                      key={`${row.model}-${row.username}-${row.browser}`}
                      className="text-sm text-[#12315f]"
                    >
                      <span className="font-semibold"><UiText>{row.model}</UiText></span>
                      <span className="text-[#4a6288]"> · <UiText>{row.browser}</UiText></span>
                      <span className="text-[#4a6288]"> · @{row.username}</span>
                      {row.count > 1 ? (
                        <span className="text-[#7a7166]"> · {row.count}<UiText>{" marta"}</UiText></span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
