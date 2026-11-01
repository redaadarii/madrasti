import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LogOut, Menu, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { Logo } from '@/components/shared/logo'
import { RoleBadge } from '@/components/shared/badges'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useCurrentUser, useLogout } from '@madrasti/shared/features/auth/queries'
import { unreadCountQueryOptions } from '@madrasti/shared/features/messaging/queries'
import { initials } from '@madrasti/shared/format'
import { applyTheme, currentTheme, type Theme } from '@/lib/theme'
import { navigationFor } from './navigation'
import { t } from '@/i18n'

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const { data: unread = 0 } = useQuery(unreadCountQueryOptions)
  return (
    <nav className="flex flex-col gap-5" aria-label={t('Navigation principale')}>
      {navigationFor(user.role).map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[0.68rem] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">{t(section.title)}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: '!bg-sidebar-accent !text-sidebar-accent-foreground' }}
              >
                <Icon className="size-4.5" />
                <span className="flex-1">{t(label)}</span>
                {to === '/messages' && unread > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-coral px-1.5 text-xs font-semibold text-coral-foreground"
                    aria-label={t('{{count}} conversations non lues', { count: unread })}>
                    {unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon" aria-label={next === 'dark' ? t('Activer le mode sombre') : t('Activer le mode clair')}
      onClick={() => { applyTheme(next); setTheme(next) }}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

function UserMenu() {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-auto gap-3 px-2 py-1.5">
            <Avatar>
              <AvatarFallback className="bg-coral text-coral-foreground">{initials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-start sm:block">
              <span className="block text-sm font-semibold">{user.firstName} {user.lastName}</span>
              <span className="block text-xs text-muted-foreground">{user.email}</span>
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            {t('Mon compte')} <RoleBadge role={user.role} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout()
            navigate({ to: '/login' })
          }}
        >
          <LogOut /> {t('Se déconnecter')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const user = useCurrentUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 overflow-y-auto bg-sidebar p-5 lg:flex print:hidden">
        <Link to="/dashboard"><Logo inverted /></Link>
        <SidebarNav />
        <div className="mt-auto rounded-2xl bg-sidebar-accent p-4 text-sm text-sidebar-foreground/80">
          <p className="font-semibold text-sidebar-accent-foreground">{user.schoolName ?? t('Réseau Madrasti')}</p>
          <p className="mt-1 text-xs">{t('Année scolaire {{year}}', { year: '2026-2027' })}</p>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto border-0 bg-sidebar p-5">
          <SheetTitle className="mb-6"><Logo inverted /></SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background/85 px-4 py-3 backdrop-blur sm:px-8 print:hidden">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('Ouvrir le menu')} onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t('Bonjour')} <span className="font-semibold text-foreground">{user.firstName}</span> 👋
          </p>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
