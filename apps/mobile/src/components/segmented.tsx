import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

/** Choix exclusif compact (onglets internes d'un écran, trimestres…). */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string
}) {
  const c = useTheme()
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.bar, { backgroundColor: c.border }]}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.value)}
            style={[styles.item, active && { backgroundColor: c.card }]}>
            <Text style={{ color: active ? c.text : c.muted, fontWeight: active ? '700' : '500' }} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
})
