import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError } from '@madrasti/shared/http'
import { Button, Label } from '@/components/ui'
import { StaffAccountError, useAuth } from '@/lib/auth'
import { changeLanguage, LANGUAGES, t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import i18n from '@/lib/i18n'

export default function LoginScreen() {
  const c = useTheme()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const submit = async () => {
    setPending(true)
    setError(undefined)
    try {
      await login(email.trim(), password)
    } catch (e) {
      setError(e instanceof StaffAccountError
        ? t('L\'application mobile est réservée aux familles et aux élèves. Utilisez l\'espace web.')
        : e instanceof ApiError ? e.message : t('Connexion impossible. Vérifiez votre réseau.'))
      setPending(false)
    }
  }

  const input = [styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: '#1e3a8a' }]}>
            <Text style={styles.logoLetter}>M</Text>
            <View style={styles.logoDot} />
          </View>
          <Text style={[styles.brandName, { color: c.text }]}>Madrasti</Text>
        </View>
        <Text style={[styles.heading, { color: c.text }]}>{t('Connexion')}</Text>
        <Label muted>{t('Accédez à votre espace Madrasti.')}</Label>

        <View style={{ gap: 6 }}>
          <Label style={{ fontWeight: '600' }}>{t('Email')}</Label>
          <TextInput accessibilityLabel={t('Email')} style={input} value={email} onChangeText={setEmail} autoCapitalize="none"
            autoComplete="email" keyboardType="email-address" textContentType="username" placeholderTextColor={c.muted} />
        </View>
        <View style={{ gap: 6 }}>
          <Label style={{ fontWeight: '600' }}>{t('Mot de passe')}</Label>
          <TextInput accessibilityLabel={t('Mot de passe')} style={input} value={password} onChangeText={setPassword} secureTextEntry
            autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        </View>
        {error && <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>}
        <Button label={t('Se connecter')} icon="log-in-outline" onPress={submit} loading={pending} disabled={!email || !password} />

        <View style={styles.languages}>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} accessibilityRole="button" accessibilityState={{ selected: i18n.language === l.code }}
              onPress={() => void changeLanguage(l.code)} style={[styles.language, { borderColor: i18n.language === l.code ? c.primary : c.border }]}>
              <Text style={{ color: i18n.language === l.code ? c.primary : c.muted, fontWeight: '600' }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontSize: 26, fontWeight: '800' },
  logoDot: { position: 'absolute', top: 6, end: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: '#f5b700' },
  brandName: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 32, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  languages: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  language: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
})
