import type { ReactNode } from "react";

export const metadata = {
  title: "Operator chat",
  description: "Operator chat",
  robots: { index: false, follow: false },
};

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="operator-workspace fixed inset-0 z-30 flex overflow-hidden text-[#122033]">
      {children}
    </div>
  );
}
