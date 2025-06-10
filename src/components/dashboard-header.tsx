"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MobileNav } from "./mobile-nav"

export function DashboardHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 sm:px-10 gap-4">

        {/* Mobile Nav Toggle */}
        <MobileNav onOpenSidebar={onOpenSidebar} />

        {/* Center - Search Bar */}
        <div className="flex-1 flex items-center">
          <div className="relative w-full max-w-[600px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquise aqui..." className="w-full max-w-[400px] flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-8" />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button className="ml-2 bg-foreground text-background hover:bg-foreground/90 flex">
            Nova campanha
            <span className="ml-2">+</span>
          </Button>
          
        </div>
      </div>
    </div>
  )
}

