// src/screens/HomeScreen.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { SessionType } from '../state/store';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const TYPES: SessionType[] = ['Perna', 'Puxadas', 'Empurradas'];

export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Treino</Text>
        <Text style={styles.subtitle}>Escolha a sessão</Text>

        <View style={styles.list}>
          {TYPES.map((type) => (
            <Pressable
              key={type}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                navigation.navigate('Session', { type })
              }
            >
              <Text style={styles.cardTitle}>{type}</Text>
              <Text style={styles.cardHint}>
                Iniciar / Continuar
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111111',
  },
  subtitle: {
    fontSize: 14,
    color: '#444444',
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111',
  },
  cardHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});