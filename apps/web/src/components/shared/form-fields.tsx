import type { ComponentProps, ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'

/** Les messages de validation sont des clés françaises : on les traduit à l'affichage. */
const translated = (error?: { message?: string }) => error && { message: error.message && t(error.message) }

interface BaseFieldProps {
  label: string
  registration: UseFormRegisterReturn
  error?: { message?: string }
}

export function TextField({ label, registration, error, ...props }: BaseFieldProps & ComponentProps<'input'>) {
  const id = registration.name
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-invalid={!!error} {...props} {...registration} />
      <FieldError errors={[translated(error)]} />
    </Field>
  )
}

export function TextAreaField({ label, registration, error, ...props }: BaseFieldProps & ComponentProps<'textarea'>) {
  const id = registration.name
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} aria-invalid={!!error} {...props} {...registration} />
      <FieldError errors={[translated(error)]} />
    </Field>
  )
}

interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  options: { value: string | number; label: ReactNode }[]
}

export function SelectField({ label, registration, error, placeholder, options }: SelectFieldProps) {
  const id = registration.name
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} aria-invalid={!!error} className="w-full" {...registration}>
        {placeholder !== undefined && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError errors={[translated(error)]} />
    </Field>
  )
}
