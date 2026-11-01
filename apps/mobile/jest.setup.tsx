// Icônes vectorielles : pas de chargement de police sous Jest, un simple composant texte suffit.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native')
  return ({ name }: { name: string }) => <Text>{name}</Text>
})
