import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

export interface SkuBreadcrumbProps {
  sku: string;
  name: string;
}

export function SkuBreadcrumb({ sku, name }: SkuBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Inventory</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-muted/50 shrink-0" />
      <span className="font-mono text-ink bg-ground px-1.5 py-0.5 rounded border border-line">
        {sku}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-muted/50 shrink-0" />
      <span className="text-muted truncate max-w-[240px] sm:max-w-md">{name}</span>
    </nav>
  );
}
