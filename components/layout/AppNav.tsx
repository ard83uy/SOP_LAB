"use client";

import { useNavLinks } from "./useNavLinks";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";

export function AppNav() {
  const { isLoading, isAdmin } = useNavLinks();

  // Show a sticky placeholder while the role is unknown to prevent layout shift
  if (isLoading) {
    return <div className="sticky top-0 z-50 h-14 bg-card border-b border-border" />;
  }

  return isAdmin ? <TopNav /> : <BottomNav />;
}
