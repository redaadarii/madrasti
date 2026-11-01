import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { SelectField, TextAreaField, TextField } from '@/components/shared/form-fields'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { todayIso } from '@madrasti/shared/features/homework/status'
import { handleFormError } from '@/lib/form'
import { submitPreRegistration } from '@madrasti/shared/features/admissions/api'
import { t } from '@/i18n'

const LEVELS = ['Petite section', 'Moyenne section', 'Grande section', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '1AC', '2AC', '3AC']

const schema = z.object({
  childFirstName: z.string().trim().min(1, 'Prénom requis').max(80),
  childLastName: z.string().trim().min(1, 'Nom requis').max(80),
  birthDate: z.string().min(1, 'Date requise').refine((d) => d < todayIso(), 'Date invalide'),
  desiredLevel: z.string().min(1, 'Niveau requis'),
  parentName: z.string().trim().min(1, 'Nom requis').max(150),
  parentEmail: z.email('Adresse email invalide'),
  parentPhone: z.string().trim().regex(/^[+0-9 ().-]{8,30}$/, 'Numéro invalide'),
  message: z.string().trim().max(1000).optional().transform((v) => v || undefined),
})

/** Formulaire public de pré-inscription (aucun compte requis). */
export function PreRegistrationPage() {
  const submit = useMutation({ mutationFn: submitPreRegistration })
  const { register, handleSubmit, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { desiredLevel: '' } })

  const onSubmit = handleSubmit((input) => submit.mutate(input, { onError: (error) => handleFormError(error, setError) }))

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link to="/"><Logo /></Link>
        <LanguageSwitcher className="ms-auto me-2" />
        <Button variant="outline" nativeButton={false} render={<Link to="/login" />}>{t('Se connecter')}</Button>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        {submit.isSuccess ? (
          <Card className="mt-10 text-center">
            <CardContent className="flex flex-col items-center gap-3 py-10">
              <CheckCircle2 className="size-12 text-mint-foreground" />
              <h1 className="text-3xl font-semibold">{t('Demande envoyée !')}</h1>
              <p className="max-w-md text-muted-foreground">
                {t("Merci. L'équipe de direction étudie votre demande et vous recontactera par email ou téléphone.")}
              </p>
              <Button nativeButton={false} render={<Link to="/" />}>{t('Retour à l\'accueil')}</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <h1 className="mt-6 text-4xl font-semibold">{t('Pré-inscription en ligne')}</h1>
            <p className="mt-2 text-muted-foreground">{t('Quelques informations suffisent : l\'école vous recontacte pour finaliser l\'inscription.')}</p>
            <Card className="mt-8">
              <CardContent>
                <form onSubmit={onSubmit} noValidate>
                  <FieldGroup className="grid gap-5 sm:grid-cols-2">
                    <h2 className="font-sans text-sm font-semibold tracking-wide text-muted-foreground uppercase sm:col-span-2">{t('L\'enfant')}</h2>
                    <TextField label={t('Prénom')} registration={register('childFirstName')} error={errors.childFirstName} />
                    <TextField label={t('Nom')} registration={register('childLastName')} error={errors.childLastName} />
                    <TextField label={t('Date de naissance')} type="date" max={todayIso()} registration={register('birthDate')} error={errors.birthDate} />
                    <SelectField label={t('Niveau souhaité')} placeholder={t('Choisir…')} registration={register('desiredLevel')} error={errors.desiredLevel}
                      options={LEVELS.map((l) => ({ value: l, label: t(l) }))} />
                    <h2 className="mt-2 font-sans text-sm font-semibold tracking-wide text-muted-foreground uppercase sm:col-span-2">{t('Le responsable légal')}</h2>
                    <div className="sm:col-span-2"><TextField label={t('Nom complet')} registration={register('parentName')} error={errors.parentName} /></div>
                    <TextField label={t('Email')} type="email" registration={register('parentEmail')} error={errors.parentEmail} />
                    <TextField label={t('Téléphone')} type="tel" placeholder="+212 6…" registration={register('parentPhone')} error={errors.parentPhone} />
                    <div className="sm:col-span-2"><TextAreaField label={t('Message (optionnel)')} rows={3} registration={register('message')} error={errors.message} /></div>
                    <Button type="submit" size="lg" className="h-11 sm:col-span-2" disabled={submit.isPending}>{t('Envoyer ma demande')}</Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
