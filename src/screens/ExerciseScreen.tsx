import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { store } from '../state/store';

type R = RouteProp<RootStackParamList, 'Exercise'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExerciseScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const { sessionType, exerciseName } = route.params;
  const [, force] = useState(0);

  const session = store.sessions[sessionType];
  const exercise = session?.exercises.find((e) => e.name === exerciseName);

  if (!session || !exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercício não encontrado</Text>
        <Text style={styles.sub}>Volte e abra a sessão novamente.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => nav.goBack()}>
          <Text style={styles.primaryTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  function updateSet(index: number, field: 'weight' | 'reps', value: string) {
    const num = value === '' ? undefined : Number(value.replace(',', '.'));
    (exercise.sets[index] as any)[field] = num;
    force((x) => x + 1);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 10 }}>
        {exercise.sets.map((s, i) => (
          <View key={s.id ?? String(i)} style={styles.card}>
            <Text style={styles.label}>Peso</Text>
            <TextInput
              value={s.weight?.toString() ?? ''}
              onChangeText={(t) => updateSet(i, 'weight', t)}
              keyboardType="decimal-pad"
              placeholder="ex: 42,5"
              style={styles.input}
            />

            <Text style={styles.label}>Reps</Text>
            <TextInput
              value={s.reps?.toString() ?? ''}
              onChangeText={(t) => updateSet(i, 'reps', t)}
              keyboardType="number-pad"
              placeholder="ex: 15"
              style={styles.input}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            nav.goBack();
          }}
        >
          <Text style={styles.secondaryTxt}>Salvar</Text>
        </Pressable>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            exercise.status = 'done';
            nav.goBack();
          }}
        >
          <Text style={styles.primaryTxt}>Completar exercício</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#111' },
  sub: { color: '#555' },

  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#e6e6e6' },
  label: { fontWeight: '800', color: '#333' },
  input: { backgroundColor: '#eee', padding: 10, borderRadius: 8 },

  footer: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: '#111', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontWeight: '900' },
  secondaryBtn: { width: 120, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  secondaryTxt: { color: '#111', fontWeight: '900' }
});
