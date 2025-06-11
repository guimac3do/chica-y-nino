"use client"

import { useEffect, useState } from "react"
import { 
  BarChart2, 
  Box, 
  ShoppingBag, 
  Users, 
  X, 
  PlusCircle,
  ListOrdered,
  Package,
  Download,
  Image
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

export function DashboardSidebar({
  className,
  isOpen,
  onClose,
}: { className?: string; isOpen: boolean; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState("")
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false)
  
  // Detecção de plataforma
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isPWAInstallSupported = 'BeforeInstallPromptEvent' in window

  useEffect(() => {
    if (isPWAInstallSupported) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        console.log('beforeinstallprompt disparado:', e)
        setDeferredPrompt(e)
      }
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isPWAInstallSupported])

  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('PWA instalada')
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => window.removeEventListener('appinstalled', handleAppInstalled)
  }, [])

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    const handleLocationChange = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscapeKey)
    return () => document.removeEventListener("keydown", handleEscapeKey)
  }, [onClose])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      const promptEvent = deferredPrompt as any
      promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      console.log(outcome === 'accepted' ? 'PWA instalada' : 'Instalação recusada')
      setDeferredPrompt(null)
    } else if (isAndroid) {
      // Abre o diálogo com instruções manuais
      setIsInstallDialogOpen(true)
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/20 backdrop-blur-sm lg:hidden",
          isOpen ? "block" : "hidden",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-16 left-0 z-40 h-[calc(100vh)] w-64 bg-[#0A3323] text-white p-4 flex flex-col transition-transform duration-300 ease-in-out lg:fixed top-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className,
        )}
      >
        <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white lg:hidden" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xl font-semibold">✧ Chica y Nino</span>
        </div>
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold mb-4 text-gray-400">MENU</p>
            <nav className="space-y-2">
              <MenuItem icon={Box} label="Dashboard" path="/admin" active={currentPath === "/admin"} onClose={onClose} />
              <MenuItem icon={Users} label="Clientes" path="/admin/clientes" active={currentPath === "/admin/clientes"} onClose={onClose} />
              <MenuItem icon={Users} label="Adicionar cliente" path="/admin/clientes/novo" active={currentPath === "/admin/clientes/novo"} onClose={onClose} />
              <MenuItem icon={ShoppingBag} label="Campanhas" path="/admin/campanhas" active={currentPath === "/admin/campanhas"} onClose={onClose} />
              <MenuItem icon={PlusCircle} label="Criar Campanha" path="/admin/criar-campanha" active={currentPath === "/admin/criar-campanha"} onClose={onClose} />
              <MenuItem icon={ListOrdered} label="Lista de Pedidos" path="/admin/lista-de-pedidos" active={currentPath === "/admin/lista-de-pedidos"} onClose={onClose} />
              <MenuItem icon={Package} label="Lista de Produtos" path="/admin/lista-de-produtos" active={currentPath === "/admin/lista-de-produtos"} onClose={onClose} />
              <MenuItem icon={Package} label="Cadastrar Produto" path="/admin/cadastrar-produto" active={currentPath === "/admin/cadastrar-produto"} onClose={onClose} />
              <MenuItem icon={Image} label="Cadastro de Fotos" path="/admin/upload-imagens" active={currentPath === "/admin/upload-imagens"} onClose={onClose} />
            </nav>
          </div>
          {/* Botão de instalação ou mensagem alternativa */}
          <div className="mt-4">
            {isAndroid ? (
              <Button
                variant="outline"
                className="w-full flex items-center gap-2 text-white border-white hover:bg-white/10"
                onClick={handleInstallClick}
              >
                <Download className="w-5 h-5" />
                Instalar Aplicativo
              </Button>
            ) : isIOS ? (
              <p className="text-xs text-gray-400 text-center">
                Use "Adicionar à Tela de Início" no Safari
              </p>
            ) : deferredPrompt ? (
              <Button
                variant="outline"
                className="w-full flex items-center gap-2 text-white border-white hover:bg-white/10"
                onClick={handleInstallClick}
              >
                <Download className="w-5 h-5" />
                Instalar Aplicativo
              </Button>
            ) : null}

            {/* Diálogo para instruções manuais no Android */}
            <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Instalar o Aplicativo</DialogTitle>
                  <DialogDescription>
                    Para instalar o aplicativo, siga estas etapas:
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-gray-600">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Abra o menu do navegador (geralmente três pontos no canto superior direito).</li>
                    <li>Selecione "Adicionar à tela inicial" ou "Instalar aplicativo".</li>
                    <li>Confirme a instalação quando solicitado.</li>
                  </ol>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsInstallDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <img src="https://v0.dev/placeholder.svg" alt="User" className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-sm font-medium">Maurício</p>
              <p className="text-xs text-gray-400">maurício@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function MenuItem({
  icon: Icon,
  label,
  path,
  active,
  badge,
  onClose,
}: { 
  icon: any; 
  label: string; 
  path: string;
  active?: boolean; 
  badge?: string; 
  onClose: () => void 
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
        active ? "bg-white/10" : "hover:bg-white/5",
      )}
      onClick={() => {
        console.log(`Navigating to ${path}`)
        window.location.href = path
        onClose()
      }}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {badge && <span className="ml-auto bg-[#BBFF4D] text-black text-xs px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  )
}