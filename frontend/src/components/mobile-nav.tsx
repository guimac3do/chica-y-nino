"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar}>
      <Menu className="h-6 w-6" />
    </Button>
  )
}

