// src/screens/SessionScreen.tsx
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
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import {
  store,
  ensureSession,
  getRoutineName,
  addExercise,
  archiveExercise,
  listArchivedExercises,
  restoreArchivedExercise,
  finalizeSession,
  scheduleSave,
  type ExerciseEntry,
} from '../state/store';

type R = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type LoadStatus = 'red' | 'green' | 'yellow' | 'neutral';

function getLoadStatusFromExercise(ex: ExerciseEntry): LoadStatus {
  const work = ex.sets.filter((s) => s.kind === 'work');
  const repsList = work.map((s) => s.reps).filter((v): v is number => typeof v === 'number');
  if (work.length === 0) return 'neutral';
  if (repsList.length !== work.length) return 'neutral';

  if (repsList.every((r) => r <= 8)) return 'red';

  const allHigh = repsList.every((r) => r >= 15);
  const rirs = work.map((s) => s.rir).filter((v): v is number => typeof v === 'number');
  const allRirFilled = rirs.length === work.length;

  if (allHigh && allRirFilled) {
    const minRir = Math.min(...rirs);
    if (minRir >= 2) return 'green';
    return 'yellow';
  }
  return 'neutral';
}

function statusStyles(status: LoadStatus) {
  switch (status) {
    case 'green':
      return { borderColor: '#bfe8c9', backgroundColor: '#eefaf1', chip: '15+ / RIR≥2' };
    case 'yellow':
      return { borderColor: '#f3e3b1', backgroundColor: '#fff9e6', chip: '15+ (RIR baixo)' };
    case 'red':
      return { borderColor: '#f2b8b8', backgroundColor: '#ffecec', chip: '≤8 (pesado)' };
    default:
      return { borderColor: '#e6e6e6', backgroundColor: '#ffffff', chip: '' };
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function formatDuration(sec?: number) {
  if (!sec || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

export function SessionScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { routineId } = route.params;

  const session = ensureSession(routineId);
  const routineName = getRoutineName(routineId);

  const [, force] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      force((x) => x + 1);
      return undefined;
    }, [])
  );

  React.useEffect(() => {
    navigation.setOptions({ title: routineName });
  }, [routineName, navigation]);

  const [gymDraft, setGymDraft] = useState(session.meta.gym ?? '');
  const [showDone, setShowDone] = useState(false);

  const [showAddPanel, setShowAddPanel] = useState(false);

  const archived = listArchivedExercises(routineId);

  const { pending, done } = useMemo(() => {
    return {
      pending: session.exercises.filter((e) => e.status !== 'done'),
      done: session.exercises.filter((e) => e.status === 'done'),
    };
  }, [session.exercises]);

  function saveGym() {
    session.meta.gym = gymDraft.trim() || undefined;
    scheduleSave();
    force((x) => x + 1);
  }

  function onAddExerciseNow() {
    // IMPORTANTE: adiciona SEM depender de renomear
    addExercise(routineId);
    scheduleSave();
    setShowAddPanel(false);
    force((x) => x + 1);
  }

  function askRemoveExercise(exId: string, name: string) {
    Alert.alert(
      'Remover exercício',
      `Remover "${name}" desta sessão?\n\nEle não será apagado. Vai ficar disponível para re-adicionar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            archiveExercise(routineId, exId);
            scheduleSave();
            force((x) => x + 1);
          },
        },
      ]
    );
  }

  function restoreOne(exId: string) {
    const ex = restoreArchivedExercise(routineId, exId);
    if (!ex) return;
    scheduleSave();
    setShowAddPanel(false);
    force((x) => x + 1);
  }

  function onFinalize() {
    finalizeSession(routineId);
    const dur = store.sessionsByRoutineId[routineId]?.meta.durationSec;

    Alert.alert(
      'Sessão finalizada',
      `Rotina: ${routineName}\nDuração: ${formatDuration(dur) || '—'}\nAcademia: ${session.meta.gym ?? '—'}`
    );
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
      <Text style={styles.title}>Sessão: {routineName}</Text>

      {/* Academia */}
      <View style={styles.section}>
        <Text style={styles.label}>Academia (unidade/filial)</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Ex: General Osório, Barão da Torre..."
            value={gymDraft}
            onChangeText={setGymDraft}
          />
          <Pressable style={styles.smallBtn} onPress={saveGym}>
            <Text style={styles.smallBtnTxt}>Salvar</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>
          Início: {session.meta.startedAt ? new Date(session.meta.startedAt).toLocaleString() : '—'}
          {session.meta.durationSec ? ` • Duração: ${formatDuration(session.meta.durationSec)}` : ''}
        </Text>
      </View>

      {/* Exercícios */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Exercícios</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {done.length > 0 && (
              <Pressable style={styles.doneBtn} onPress={() => setShowDone((v) => !v)}>
                <Text style={styles.doneTxt}>Concluídos ({done.length}) {showDone ? '▲' : '▼'}</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryBtnMini} onPress={() => setShowAddPanel((v) => !v)}>
              <Text style={styles.secondaryTxt}>+ Exercício</Text>
            </Pressable>
          </View>
        </View>

        {showAddPanel && (
          <View style={styles.addPanel}>
            <Pressable style={styles.primaryBtnSmall} onPress={onAddExerciseNow}>
              <Text style={styles.primaryTxt}>Novo exercício</Text>
            </Pressable>

            {archived.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={styles.meta}>Re-adicionar removidos</Text>
                {archived.slice(0, 20).map((ex) => (
                  <Pressable key={ex.id} style={styles.archItem} onPress={() => restoreOne(ex.id)}>
                    <Text style={styles.archTitle}>{ex.name}</Text>
                    <Text style={styles.archSub}>Toque para re-adicionar</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable style={styles.secondaryBtn} onPress={() => setShowAddPanel(false)}>
              <Text style={styles.secondaryTxt}>Fechar</Text>
            </Pressable>
          </View>
        )}

        {/* PENDENTES (principal) */}
        <View style={{ gap: 12 }}>
          {pending.length === 0 ? (
            <Text style={styles.meta}>
              {done.length > 0 ? 'Tudo concluído nesta sessão.' : 'Nenhum exercício. Use “+ Exercício”.'}
            </Text>
          ) : (
            pending.map((ex) => {
              const st = statusStyles(getLoadStatusFromExercise(ex));
              return (
                <View key={ex.id} style={[styles.card, { borderColor: st.borderColor, backgroundColor: st.backgroundColor }]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('Exercise', { routineId, exerciseId: ex.id })}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{ex.name}</Text>
                      {st.chip ? <Text style={styles.chip}>{st.chip}</Text> : null}
                    </View>
                    <Text style={styles.cardSub}>
                      {ex.sets.filter((s) => s.kind === 'work').length} trabalho
                      {ex.sets.some((s) => s.kind === 'warmup') ? ' • + aquecimento' : ''}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.removeBtn} onPress={() => askRemoveExercise(ex.id, ex.name)}>
                    <Text style={styles.removeTxt}>Remover</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* CONCLUÍDOS (para editar) */}
        {showDone && done.length > 0 && (
          <View style={styles.donePanel}>
            {done.map((ex) => (
              <Pressable
                key={ex.id}
                style={styles.doneCard}
                onPress={() => navigation.navigate('Exercise', { routineId, exerciseId: ex.id })}
              >
                <Text style={styles.doneCardTitle}>{ex.name}</Text>
                <Text style={styles.doneCardSub}>SALVO • toque para editar</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Finalizar */}
      <Pressable style={styles.primaryBtn} onPress={onFinalize}>
        <Text style={styles.primaryTxt}>Finalizar sessão</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  title: { fontSize: 22, fontWeight: '900' },

  section: { gap: 10 },
  label: { fontSize: 14, fontWeight: '900', color: '#111' },
  meta: { fontSize: 12, color: '#666' },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  input: {
    flexGrow: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 180,
  },

  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  smallBtnTxt: { fontWeight: '900', color: '#111' },

  secondaryBtnMini: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
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

  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontWeight: '900', fontSize: 16, color: '#111', flex: 1 },
  chip: { fontSize: 11, color: '#111', fontWeight: '900' },
  cardSub: { marginTop: 6, color: '#666' },

  removeBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0b3b3',
    backgroundColor: '#fff',
  },
  removeTxt: { fontWeight: '900', color: '#b00020' },

  doneBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  doneTxt: { color: '#111', fontWeight: '900' },

  donePanel: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  doneCard: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
  },
  doneCardTitle: { fontWeight: '900', color: '#111' },
  doneCardSub: { marginTop: 4, fontSize: 12, color: '#666' },

  addPanel: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  archItem: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
  },
  archTitle: { fontWeight: '900', color: '#111' },
  archSub: { marginTop: 4, fontSize: 12, color: '#666' },

  primaryBtnSmall: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '900' },
});