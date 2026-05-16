"use client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-8 w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-muted-foreground text-sm font-medium mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
