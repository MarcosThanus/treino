// src/screens/ExerciseScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import {
  ensureSession,
  scheduleSave,
  uid,
  markExerciseSaved,
} from '../state/store';

type R = RouteProp<RootStackParamList, 'Exercise'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const v = Number(t.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

type LoadStatus = 'red' | 'green' | 'yellow' | 'neutral';

function getLoadStatus(ex: any): LoadStatus {
  const work = ex.sets.filter((s: any) => s.kind === 'work');
  if (work.length === 0) return 'neutral';

  const repsList = work.map((s: any) => s.reps).filter((v: any) => typeof v === 'number');
  if (repsList.length !== work.length) return 'neutral';

  if (repsList.every((r: number) => r <= 8)) return 'red';

  const allHigh = repsList.every((r: number) => r >= 15);

  const rirs = work.map((s: any) => s.rir).filter((v: any) => typeof v === 'number');
  const allRirFilled = rirs.length === work.length;

  if (allHigh && allRirFilled) {
    const minRir = Math.min(...rirs);
    if (minRir >= 2) return 'green';
    return 'yellow';
  }

  return 'neutral';
}

function bannerStyles(status: LoadStatus) {
  switch (status) {
    case 'green':
      return { bg: '#eefaf1', border: '#bfe8c9', text: 'Destaque: 15+ e RIR ≥ 2' };
    case 'yellow':
      return { bg: '#fff9e6', border: '#f3e3b1', text: 'Destaque: 15+ com RIR baixo' };
    case 'red':
      return { bg: '#ffecec', border: '#f2b8b8', text: 'Destaque: ≤ 8 reps em todas' };
    default:
      return { bg: '#ffffff', border: '#e6e6e6', text: 'Sem destaque (neutro)' };
  }
}

export function ExerciseScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { routineId, exerciseId } = route.params;

  const session = ensureSession(routineId);
  const exercise = session.exercises.find((e) => e.id === exerciseId);

  const [, force] = useState(0);

  const title = useMemo(() => exercise?.name ?? 'Exercício', [exercise?.name]);
  React.useEffect(() => {
    navigation.setOptions({ title });
  }, [title, navigation]);

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercício não encontrado</Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const status = getLoadStatus(exercise);
  const b = bannerStyles(status);

  function updateSet(setId: string, patch: { weight?: number; reps?: number; rir?: number }) {
    const s = exercise.sets.find((x) => x.id === setId);
    if (!s) return;

    if ('weight' in patch) s.weight = patch.weight;
    if ('reps' in patch) s.reps = patch.reps;
    if ('rir' in patch) s.rir = patch.rir;

    scheduleSave();
    force((x) => x + 1);
  }

  function addWorkSet() {
    exercise.sets.push({
      id: uid('work'),
      kind: 'work',
      weight: undefined,
      reps: undefined,
      rir: undefined,
    });
    scheduleSave();
    force((x) => x + 1);
  }

  function toggleWarmup() {
    const has = exercise.sets.some((s) => s.kind === 'warmup');
    if (has) {
      exercise.sets = exercise.sets.filter((s) => s.kind !== 'warmup');
    } else {
      exercise.sets.unshift({
        id: uid('warm'),
        kind: 'warmup',
        weight: undefined,
        reps: undefined,
        rir: undefined,
      });
    }
    scheduleSave();
    force((x) => x + 1);
  }

  function removeSet(setId: string) {
    const s = exercise.sets.find((x) => x.id === setId);
    if (!s) return;

    if (s.kind === 'work') {
      const workCount = exercise.sets.filter((x) => x.kind === 'work').length;
      if (workCount <= 1) {
        Alert.alert('Não dá', 'Precisa existir pelo menos 1 série de trabalho.');
        return;
      }
    }

    exercise.sets = exercise.sets.filter((x) => x.id !== setId);
    scheduleSave();
    force((x) => x + 1);
  }

  function saveExercise() {
    // "Salvar" = marcar como concluído hoje + manter para próxima sessão (template)
    markExerciseSaved(routineId, exerciseId);
    scheduleSave();
    force((x) => x + 1);

    Alert.alert('Salvo', 'Exercício marcado como salvo.');
    navigation.goBack();
  }

  const hasWarmup = exercise.sets.some((s) => s.kind === 'warmup');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <View style={[styles.banner, { backgroundColor: b.bg, borderColor: b.border }]}>
        <Text style={styles.bannerText}>{b.text}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryBtn} onPress={toggleWarmup}>
          <Text style={styles.secondaryTxt}>{hasWarmup ? 'Remover aquecimento' : '+ Aquecimento'}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={addWorkSet}>
          <Text style={styles.secondaryTxt}>+ Série (trabalho)</Text>
        </Pressable>
      </View>

      {exercise.sets.map((s, idx) => (
        <View key={s.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>
              {idx + 1}. {s.kind === 'warmup' ? 'Aquecimento' : 'Trabalho'}
            </Text>

            <Pressable style={styles.iconBtn} onPress={() => removeSet(s.id)}>
              <Text style={styles.iconTxt}>−</Text>
            </Pressable>
          </View>

          <View style={styles.inputs}>
            <TextInput
              style={styles.input}
              placeholder="Peso"
              keyboardType="numeric"
              value={s.weight === undefined ? '' : String(s.weight)}
              onChangeText={(t) => updateSet(s.id, { weight: numOrUndef(t) })}
            />
            <TextInput
              style={styles.input}
              placeholder="Reps"
              keyboardType="numeric"
              value={s.reps === undefined ? '' : String(s.reps)}
              onChangeText={(t) => updateSet(s.id, { reps: numOrUndef(t) })}
            />
            <TextInput
              style={styles.input}
              placeholder="RIR"
              keyboardType="numeric"
              value={s.rir === undefined ? '' : String(s.rir)}
              onChangeText={(t) => updateSet(s.id, { rir: numOrUndef(t) })}
            />
          </View>

          {s.kind === 'warmup' && (
            <Text style={styles.hint}>Aquecimento: geralmente 15+ reps com pouco peso.</Text>
          )}
        </View>
      ))}

      <Pressable style={styles.primaryBtn} onPress={saveExercise}>
        <Text style={styles.primaryTxt}>Salvar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  title: { fontSize: 20, fontWeight: '900' },

  banner: { borderWidth: 1, borderRadius: 14, padding: 12 },
  bannerText: { fontSize: 12, color: '#111', fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 12 },

  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryTxt: { color: '#111', fontWeight: '900' },

  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '900', fontSize: 14, color: '#111' },

  inputs: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  iconTxt: { fontSize: 18, fontWeight: '900', color: '#111' },

  hint: { fontSize: 12, color: '#666' },

  primaryBtn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '900' },
});