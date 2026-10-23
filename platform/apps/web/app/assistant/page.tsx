import { AssistantChat } from "@/components/assistant";

export const metadata = { title: "Shopia AI" };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-2xl px-0 py-0 sm:px-4 sm:py-6">
      <div className="flex h-[calc(100dvh-140px)] flex-col overflow-hidden border-line bg-white sm:h-[75vh] sm:rounded-3xl sm:border sm:shadow-soft">
        <AssistantChat fullPage />
      </div>
    </div>
  );
}
