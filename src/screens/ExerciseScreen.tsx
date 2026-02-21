// src/screens/ExerciseScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { ensureSession, uid, scheduleSave } from '../state/store';

type R = RouteProp<RootStackParamList, 'Exercise'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function parseNum(v: string): number | undefined {
  const t = v.replace(',', '.').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function ExerciseScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { routineId, exerciseId } = route.params;

  const session = ensureSession(routineId);
  const ex = session.exercises.find((e) => e.id === exerciseId);

  const [, force] = useState(0);

  if (!ex) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errTitle}>Exercício não encontrado.</Text>
        <Text style={styles.errSub}>
          Isso acontece quando a navegação abriu a tela sem o exerciseId correto.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  React.useEffect(() => {
    navigation.setOptions({ title: ex.name });
  }, [ex.name, navigation]);

  const hasWarmup = useMemo(() => ex.sets.some((s) => s.kind === 'warmup'), [ex.sets]);

  function toggleWarmup() {
    if (hasWarmup) {
      ex.sets = ex.sets.filter((s) => s.kind !== 'warmup');
    } else {
      ex.sets = [
        {
          id: uid('warm'),
          kind: 'warmup' as const,
          weight: undefined,
          reps: undefined,
          rir: undefined,
        },
        ...ex.sets,
      ];
    }
    scheduleSave();
    force((x) => x + 1);
  }

  function addWorkSet() {
    ex.sets.push({
      id: uid('work'),
      kind: 'work',
      weight: undefined,
      reps: undefined,
      rir: undefined,
    });
    scheduleSave();
    force((x) => x + 1);
  }

  function removeWorkSet(setId: string) {
    const work = ex.sets.filter((s) => s.kind === 'work');
    if (work.length <= 1) {
      Alert.alert('Não dá', 'O exercício precisa ter pelo menos 1 série de trabalho.');
      return;
    }
    ex.sets = ex.sets.filter((s) => s.id !== setId);
    scheduleSave();
    force((x) => x + 1);
  }

  function setField(setId: string, field: 'weight' | 'reps' | 'rir', value: string) {
    const s = ex.sets.find((x) => x.id === setId);
    if (!s) return;
    const n = parseNum(value);
    (s as any)[field] = n;
    scheduleSave();
    force((x) => x + 1);
  }

  function saveExercise() {
    ex.status = 'done';
    scheduleSave();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{ex.name}</Text>

        <Pressable style={styles.smallBtn} onPress={toggleWarmup}>
          <Text style={styles.smallBtnTxt}>{hasWarmup ? 'Remover aquecimento' : '+ Aquecimento'}</Text>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        {ex.sets.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{s.kind === 'warmup' ? 'Aquecimento' : 'Trabalho'}</Text>

              {s.kind === 'work' && (
                <Pressable style={styles.removeBtn} onPress={() => removeWorkSet(s.id)}>
                  <Text style={styles.removeTxt}>Remover</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Peso</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="kg"
                  value={s.weight === undefined ? '' : String(s.weight)}
                  onChangeText={(v) => setField(s.id, 'weight', v)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Reps</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  value={s.reps === undefined ? '' : String(s.reps)}
                  onChangeText={(v) => setField(s.id, 'reps', v)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>RIR</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="opcional"
                  value={s.rir === undefined ? '' : String(s.rir)}
                  onChangeText={(v) => setField(s.id, 'rir', v)}
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.secondaryBtn} onPress={addWorkSet}>
        <Text style={styles.secondaryTxt}>+ Série de trabalho</Text>
      </Pressable>

      <Pressable style={styles.primaryBtn} onPress={saveExercise}>
        <Text style={styles.primaryTxt}>Salvar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },

  errTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  errSub: { fontSize: 12, color: '#666', textAlign: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#111', flex: 1 },

  smallBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  smallBtnTxt: { fontWeight: '900', color: '#111', fontSize: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    padding: 12,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontWeight: '900', color: '#111' },

  removeBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0b3b3',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  removeTxt: { color: '#b00020', fontWeight: '900', fontSize: 12 },

  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  field: { minWidth: 90, flexGrow: 1, gap: 6 },
  label: { fontSize: 12, color: '#666', fontWeight: '800' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryTxt: { color: '#111', fontWeight: '900' },

  primaryBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '900' },
});