import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type R = RouteProp<RootStackParamList, 'Session'>;

export function SessionScreen() {
  const route = useRoute<R>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessão de {route.params.type}</Text>
      <Text style={styles.sub}>OK: navegação funcionando.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { color: '#555' }
});
