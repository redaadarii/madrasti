import Ionicons from '@expo/vector-icons/Ionicons'
import { useQueryClient } from '@tanstack/react-query'
import { type ComponentProps, type ReactNode, useState } from 'react'
import { ActivityIndicator, I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { type Palette, useTheme } from '@/lib/theme'

export type IconName = ComponentProps<typeof Ionicons>['name']
export type Tone = 'primary' | 'coral' | 'mint' | 'sun' | 'danger' | 'muted'

const toneColors = (c: Palette, tone: Tone) => ({
  primary: { bg: c.primarySoft, fg: c.primary },
  coral: { bg: c.coralSoft, fg: c.coral },
  mint: { bg: c.mintSoft, fg: c.mint },
  sun: { bg: c.sunSoft, fg: c.sun },
  danger: { bg: c.dangerSoft, fg: c.danger },
  muted: { bg: c.border, fg: c.muted },
})[tone]

/** Écran défilant avec « tirer pour actualiser » (recharge toutes les données affichées). */
export function Screen({ children, refreshable = true, style }: { children: ReactNode; refreshable?: boolean; style?: ViewStyle }) {
  const c = useTheme()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = async () => {
    setRefreshing(true)
    await queryClient.refetchQueries({ type: 'active' })
    setRefreshing(false)
  }
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.screen, style]}
      refreshControl={refreshable ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} /> : undefined}>
      {children}
    </ScrollView>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme()
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const c = useTheme()
  return <Text style={[styles.title, { color: c.text }, style]}>{children}</Text>
}

export function Label({ children, muted, style, numberOfLines }: { children: ReactNode; muted?: boolean; style?: TextStyle; numberOfLines?: number }) {
  const c = useTheme()
  return <Text numberOfLines={numberOfLines} style={[styles.label, { color: muted ? c.muted : c.text }, style]}>{children}</Text>
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const c = useTheme()
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>{title.toLocaleUpperCase()}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

export function Badge({ label, tone = 'primary', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = useTheme()
  const { bg, fg } = toneColors(c, tone)
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  )
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading }: {
  label: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger'; icon?: IconName; disabled?: boolean; loading?: boolean
}) {
  const c = useTheme()
  const filled = variant === 'primary'
  const color = variant === 'danger' ? c.danger : filled ? c.primaryText : c.primary
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, {
        backgroundColor: filled ? c.primary : 'transparent',
        borderColor: variant === 'danger' ? c.danger : c.primary,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }]}>
      {loading ? <ActivityIndicator color={color} /> : icon && <Ionicons name={icon} size={18} color={color} />}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  )
}

/** Ligne de liste : icône, titre, sous-titre, contenu à droite (à gauche en arabe) et action éventuelle. */
export function ListRow({ icon, tone = 'primary', title, subtitle, trailing, onPress, last }: {
  icon?: IconName; tone?: Tone; title: string; subtitle?: string; trailing?: ReactNode; onPress?: () => void; last?: boolean
}) {
  const c = useTheme()
  const { bg, fg } = toneColors(c, tone)
  const content = (
    <View style={[styles.listRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      {icon && <View style={[styles.listIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={fg} /></View>}
      <View style={{ flex: 1 }}>
        <Label style={{ fontWeight: '600' }} numberOfLines={2}>{title}</Label>
        {subtitle ? <Label muted style={{ fontSize: 13, marginTop: 2 }} numberOfLines={2}>{subtitle}</Label> : null}
      </View>
      {trailing}
      {onPress && <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={c.muted} />}
    </View>
  )
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{content}</Pressable>
    : content
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  const c = useTheme()
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}><Ionicons name={icon} size={22} color={c.primary} /></View>
      <Label style={{ fontWeight: '600', textAlign: 'center' }}>{title}</Label>
      {hint && <Label muted style={{ textAlign: 'center', fontSize: 13 }}>{hint}</Label>}
    </View>
  )
}

export function Loading() {
  const c = useTheme()
  return <View style={styles.loading}><ActivityIndicator color={c.primary} size="large" /></View>
}

/** Choix de l'enfant (parent de plusieurs élèves) ; invisible sinon. */
export function ChildPicker() {
  const c = useTheme()
  const { children, student, select } = useFamily()
  if (children.length < 2) return null
  return (
    <View accessibilityRole="tablist" accessibilityLabel={t('Choisir l\'enfant')} style={styles.chips}>
      {children.map((child) => {
        const active = child.id === student?.id
        return (
          <Pressable key={child.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => select(child.id)}
            style={[styles.chip, { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border }]}>
            <Text style={{ color: active ? c.primaryText : c.text, fontWeight: '600' }}>{child.firstName}</Text>
            <Text style={{ color: active ? c.primaryText : c.muted, fontSize: 12 }}>{child.classroomName}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 16 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loading: { padding: 48, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
})
