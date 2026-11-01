import { describe, expect, it, vi } from 'vitest'
import { goToProvider } from './checkout'

describe('goToProvider', () => {
  it('poste un formulaire signé vers la passerelle CMI', () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => undefined)
    goToProvider({ session: 'SCO-1-abc', redirectUrl: 'https://testpayment.cmi.co.ma/fim/est3Dgate', formFields: { oid: 'SCO-1-abc', amount: '450.00', hash: 'xyz' } })

    const form = document.querySelector('form')!
    expect(form.method).toBe('post')
    expect(form.action).toBe('https://testpayment.cmi.co.ma/fim/est3Dgate')
    expect(Object.fromEntries(new FormData(form))).toEqual({ oid: 'SCO-1-abc', amount: '450.00', hash: 'xyz' })
    expect(submit).toHaveBeenCalledOnce()
  })
})
