"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./toast";
import { CompareProvider, CompareTray } from "./compare";
import { AssistantProvider } from "./assistant";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CompareProvider>
        <AssistantProvider>
          {children}
          <CompareTray />
        </AssistantProvider>
      </CompareProvider>
    </ToastProvider>
  );
}
