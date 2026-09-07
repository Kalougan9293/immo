import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Narrow phone-like column on large screens */
  contained?: boolean;
};

export function AppShell({
  children,
  className,
  contained = false,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-dvh w-full flex-col",
        contained && "max-w-lg lg:max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
