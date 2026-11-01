import { useMutation } from '@tanstack/react-query'
import { type CheckoutResponse, startCheckout } from '@madrasti/shared/features/payments/online'

/** Quitte l'application vers la page du prestataire : lien simple, ou formulaire POST signé (CMI). */
export function goToProvider({ redirectUrl, formFields }: CheckoutResponse, doc: Document = document) {
  if (!formFields) {
    window.location.assign(redirectUrl)
    return
  }
  const form = Object.assign(doc.createElement('form'), { method: 'POST', action: redirectUrl })
  for (const [name, value] of Object.entries(formFields)) {
    form.append(Object.assign(doc.createElement('input'), { type: 'hidden', name, value }))
  }
  doc.body.append(form)
  form.submit()
}

/** Ouvre la session chez le prestataire puis quitte l'application vers sa page de paiement. */
export function useStartCheckout() {
  return useMutation({ mutationFn: (paymentId: number) => startCheckout(paymentId), onSuccess: (checkout) => goToProvider(checkout) })
}
