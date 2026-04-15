import { ERPSidebar } from "./ERPSidebar";

interface ERPLayoutProps {
  children: React.ReactNode;
}

export function ERPLayout({ children }: ERPLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ERPSidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}