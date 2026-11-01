import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextField } from '@/components/shared/form-fields'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { useLogin } from '@madrasti/shared/features/auth/queries'
import { t } from '@/i18n'

const schema = z.object({
  email: z.email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@madrasti.ma' },
  { label: 'Direction', email: 'direction@madrasti.ma' },
  { label: 'Enseignant', email: 'prof.math@madrasti.ma' },
  { label: 'Parent', email: 'parent.adari@madrasti.ma' },
  { label: 'Élève', email: 'adam.adari@eleve.madrasti.ma' },
]
const DEMO_PASSWORD = 'Madrasti2026!'

export function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/login' })
  const login = useLogin()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((credentials) =>
    login.mutate(credentials, {
      onSuccess: () => (redirect ? navigate({ href: redirect }) : navigate({ to: '/dashboard' })),
    }),
  )

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col">
        <Link to="/"><Logo inverted /></Link>
        <div className="my-auto max-w-md">
          <h1 className="text-5xl font-semibold leading-tight text-sidebar-accent-foreground">
            {t("L'école entière,")} <em className="text-coral not-italic">{t('en un regard.')}</em>
          </h1>
          <p className="mt-6 text-lg text-sidebar-foreground/75">
            {t('Vie scolaire, pédagogie, communication et finances réunies dans un espace clair pour la direction, les enseignants et les familles.')}
          </p>
        </div>
        <div aria-hidden className="absolute -end-24 -bottom-24 size-96 rounded-full bg-primary/40 blur-3xl" />
        <div aria-hidden className="absolute top-24 -end-10 size-40 rounded-full bg-coral/30 blur-2xl" />
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between"><Link to="/" className="lg:hidden"><Logo /></Link><LanguageSwitcher className="ms-auto" /></div>
          <h2 className="mt-8 text-3xl font-semibold">{t('Connexion')}</h2>
          <p className="mt-2 text-muted-foreground">{t('Accédez à votre espace Madrasti.')}</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
            <TextField label={t('Email')} type="email" autoComplete="email" registration={register('email')} error={errors.email} />
            <TextField label={t('Mot de passe')} type="password" autoComplete="current-password" registration={register('password')} error={errors.password} />
            {login.error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {login.error instanceof ApiError ? login.error.message : t('Connexion impossible')}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-2 h-11" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="animate-spin" /> : <>{t('Se connecter')} <ArrowRight className="rtl:-scale-x-100" /></>}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-10 rounded-2xl border border-dashed p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('Comptes de démonstration')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setValue('email', account.email)
                      setValue('password', DEMO_PASSWORD)
                    }}
                  >
                    {t(account.label)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
