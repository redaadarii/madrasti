import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenCheck,
  Bus,
  CalendarCheck,
  GraduationCap,
  type LucideIcon,
  MessagesSquare,
  School,
  Users,
  Wallet,
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

const MODULES: { icon: LucideIcon; title: string; tone: string; items: string[] }[] = [
  {
    icon: CalendarCheck,
    title: 'Vie scolaire',
    tone: 'bg-secondary text-primary',
    items: ['Pré-inscriptions en ligne', 'Emplois du temps', 'Absences & retards', 'Bulletins et rangs', 'Agenda et contrôles'],
  },
  {
    icon: MessagesSquare,
    title: 'Communication',
    tone: 'bg-coral/15 text-coral',
    items: ['Annonces ciblées', 'Messagerie interne', 'Réclamations suivies', 'Classes en direct'],
  },
  {
    icon: BookOpenCheck,
    title: 'Pédagogie',
    tone: 'bg-mint/25 text-mint-foreground',
    items: ['Cahier de textes', 'Devoirs rendus en ligne', 'Quiz auto-corrigés', 'Suivi des notes'],
  },
  {
    icon: Wallet,
    title: 'Finance',
    tone: 'bg-sun/35 text-sun-foreground',
    items: ['Encaissements', 'État de recouvrement', 'Facturation des services', 'Exports CSV'],
  },
  {
    icon: Bus,
    title: 'Services',
    tone: 'bg-secondary text-primary',
    items: ['Transport', 'Cantine & garde', 'Activités extra-scolaires', 'Bibliothèque'],
  },
]

const SPACES = [
  { icon: School, title: 'Écoles', text: 'Pilotage en temps réel, multi-établissements, accessible 24h/24.' },
  { icon: Users, title: 'Enseignants', text: 'Saisie des notes et absences en quelques secondes, classe par classe.' },
  { icon: GraduationCap, title: 'Parents', text: 'Notes, absences, paiements et actualités de vos enfants au même endroit.' },
]

const CURRENT_YEAR = new Date().getFullYear()

export function LandingPage() {
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2"><LanguageSwitcher /><Button nativeButton={false} render={<Link to="/login" />}>{t('Se connecter')}</Button></div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-8 lg:pt-20">
        <div aria-hidden className="absolute top-10 end-0 -z-10 size-72 rounded-full bg-coral/20 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 start-10 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />
        <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
          {t('Plateforme de gestion scolaire 360°')}
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] font-semibold sm:text-6xl">
          {t("Moins d'administratif,")} <span className="text-primary">{t("plus d'école.")}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          {t("Madrasti réunit la direction, les enseignants et les familles autour d'un seul espace : suivi des élèves, communication, pédagogie et finances.")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" className="h-12 px-5" nativeButton={false} render={<Link to="/login" />}>
            {t('Accéder à mon espace')} <ArrowRight className="rtl:-scale-x-100" />
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-5" nativeButton={false} render={<Link to="/pre-inscription" />}>
            {t('Pré-inscription en ligne')}
          </Button>
        </div>
      </section>

      <section id="modules" className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="text-4xl font-semibold">{t('Tout ce dont une école a besoin')}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t('Cinq modules qui fonctionnent ensemble, sans ressaisie.')}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map(({ icon: Icon, title, tone, items }) => (
              <article key={title} className="rounded-3xl border bg-background p-5">
                <span className={cn('grid size-11 place-items-center rounded-2xl', tone)}>
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t(title)}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {items.map((item) => <li key={item}>{t(item)}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <h2 className="text-4xl font-semibold">{t('Un espace pour chacun')}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SPACES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl bg-sidebar p-6 text-sidebar-foreground">
              <Icon className="size-6 text-coral" />
              <h3 className="mt-4 text-xl font-semibold text-sidebar-accent-foreground">{t(title)}</h3>
              <p className="mt-2 text-sm text-sidebar-foreground/75">{t(text)}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {CURRENT_YEAR} Madrasti — {t('La vie scolaire, simplement.')}
      </footer>
    </div>
  )
}
