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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import {
  store,
  ensureSession,
  addAbdominal,
  scheduleSave,
  uid,
  SessionType,
  ExerciseEntry,
  AbExercise,
} from '../state/store';

type R = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

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

type LoadStatus = 'red' | 'green' | 'yellow' | 'neutral';

// sua regra aprovada
function getLoadStatusFromExercise(ex: ExerciseEntry): LoadStatus {
  const work = ex.sets.filter((s) => s.kind === 'work');
  const repsList = work.map((s) => s.reps).filter((v): v is number => typeof v === 'number');
  if (repsList.length === 0) return 'neutral';

  const allLow = repsList.length === work.length && repsList.every((r) => r <= 8);
  if (allLow) return 'red';

  const allHigh = repsList.length === work.length && repsList.every((r) => r >= 15);

  const rirs = work.map((s) => s.rir).filter((v): v is number => typeof v === 'number');
  const allRirFilled = rirs.length === work.length;

  if (allHigh && allRirFilled) {
    const minRir = Math.min(...rirs);
    if (minRir >= 2) return 'green';
    if (minRir <= 1) return 'yellow';
  }

  return 'neutral';
}

function statusStyles(status: LoadStatus) {
  switch (status) {
    case 'green':
      return { borderColor: '#bfe8c9', backgroundColor: '#eefaf1', chip: 'OK (15+ / RIR≥2)' };
    case 'yellow':
      return { borderColor: '#f3e3b1', backgroundColor: '#fff9e6', chip: '15+ (RIR baixo)' };
    case 'red':
      return { borderColor: '#f2b8b8', backgroundColor: '#ffecec', chip: '≤8 (pesado)' };
    default:
      return { borderColor: '#e6e6e6', backgroundColor: '#ffffff', chip: '' };
  }
}

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const v = Number(t.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

export function SessionScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { type } = route.params;

  // garante sessão e marca startedAt (feito dentro de ensureSession)
  const session = ensureSession(type);

  const [, force] = useState(0);

  const exercises = useMemo(() => session.exercises, [session.exercises]);

  const [gymDraft, setGymDraft] = useState(session.meta.gym ?? '');

  function saveGym() {
    session.meta.gym = gymDraft.trim() || undefined;
    scheduleSave();
    force((x) => x + 1);
  }

  function toggleHip() {
    session.hipMobilityDone = !session.hipMobilityDone;
    scheduleSave();
    force((x) => x + 1);
  }

  function toggleAbs() {
    session.showAbs = !session.showAbs;
    scheduleSave();
    force((x) => x + 1);
  }

  function onAddAbdominal() {
    addAbdominal(type);
    scheduleSave();
    force((x) => x + 1);
  }

  function removeAb(abId: string) {
    session.abs = session.abs.filter((a) => a.id !== abId);
    if (session.abs.length === 0) session.showAbs = false;
    scheduleSave();
    force((x) => x + 1);
  }

  function updateAbSet(abId: string, setId: string, patch: { weight?: number; reps?: number; timeSec?: number }) {
    const ab = session.abs.find((a) => a.id === abId);
    const st = ab?.sets.find((s) => s.id === setId);
    if (!ab || !st) return;
    Object.assign(st, patch);
    scheduleSave();
    force((x) => x + 1);
  }

  function addExerciseHere() {
    const base = `Exercício ${session.exercises.length + 1}`;
    let name = base;
    let i = 2;
    while (session.exercises.some((e) => e.name === name)) {
      name = `${base} (${i++})`;
    }

    session.exercises.push({
      name,
      status: 'pending',
      sets: [
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
      ],
    });

    scheduleSave();
    force((x) => x + 1);

    navigation.navigate('Exercise', { sessionType: type, exerciseName: name });
  }

  function finalizeSession() {
    const startedAt = session.meta.startedAt ?? Date.now();
    const endedAt = Date.now();
    const durationSec = Math.max(0, Math.round((endedAt - startedAt) / 1000));

    session.meta.endedAt = endedAt;
    session.meta.durationSec = durationSec;

    // salva template da última sessão do tipo (inclui abs + hip + showAbs)
    store.lastTemplateByType[type] = {
      type,
      exercises: session.exercises.map((e) => ({
        name: e.name,
        status: e.status,
        sets: e.sets.map((s) => ({ ...s })),
      })),
      hipMobilityDone: session.hipMobilityDone,
      showAbs: session.showAbs || session.abs.length > 0,
      abs: session.abs.map((a) => ({
        id: a.id,
        name: a.name,
        mode: a.mode,
        sets: a.sets.map((s) => ({ ...s })),
      })),
    };

    // adiciona no histórico (simples)
    store.history.unshift({
      id: uid('sess'),
      type,
      gym: session.meta.gym,
      startedAt,
      endedAt,
      durationSec,
      hipMobilityDone: session.hipMobilityDone,
      abs: session.abs.map((a) => ({ ...a, sets: a.sets.map((s) => ({ ...s })) })),
      exercises: session.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })),
    });

    scheduleSave();

    Alert.alert(
      'Sessão finalizada',
      `Duração: ${formatDuration(durationSec) || '—'}\nAcademia: ${session.meta.gym ?? '—'}`
    );

    navigation.goBack();
  }

  function renderAbdominal(ab: AbExercise) {
    return (
      <View key={ab.id} style={styles.abCard}>
        <View style={styles.abHeader}>
          <Text style={styles.abTitle}>{ab.name}</Text>
          <Pressable style={styles.abRemoveBtn} onPress={() => removeAb(ab.id)}>
            <Text style={styles.abRemoveTxt}>Remover</Text>
          </Pressable>
        </View>

        {ab.sets.map((s, idx) => (
          <View key={s.id} style={styles.abSetRow}>
            <Text style={styles.abSetLabel}>S{idx + 1}</Text>

            {ab.mode === 'time' && (
              <TextInput
                style={styles.abInput}
                placeholder="Tempo (s)"
                keyboardType="numeric"
                value={s.timeSec === undefined ? '' : String(s.timeSec)}
                onChangeText={(t) => updateAbSet(ab.id, s.id, { timeSec: numOrUndef(t) })}
              />
            )}

            {ab.mode === 'reps' && (
              <TextInput
                style={styles.abInput}
                placeholder="Reps"
                keyboardType="numeric"
                value={s.reps === undefined ? '' : String(s.reps)}
                onChangeText={(t) => updateAbSet(ab.id, s.id, { reps: numOrUndef(t) })}
              />
            )}

            {ab.mode === 'weight_reps' && (
              <>
                <TextInput
                  style={styles.abInput}
                  placeholder="Peso"
                  keyboardType="numeric"
                  value={s.weight === undefined ? '' : String(s.weight)}
                  onChangeText={(t) => updateAbSet(ab.id, s.id, { weight: numOrUndef(t) })}
                />
                <TextInput
                  style={styles.abInput}
                  placeholder="Reps"
                  keyboardType="numeric"
                  value={s.reps === undefined ? '' : String(s.reps)}
                  onChangeText={(t) => updateAbSet(ab.id, s.id, { reps: numOrUndef(t) })}
                />
              </>
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessão de {type}</Text>

      {/* Academia */}
      <View style={styles.section}>
        <Text style={styles.label}>Academia</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Ex: Smart Fit, Bodytech..."
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

      {/* Mobilidade quadril */}
      <View style={styles.section}>
        <Pressable style={styles.checkboxRow} onPress={toggleHip}>
          <View style={[styles.checkbox, session.hipMobilityDone && styles.checkboxOn]} />
          <Text style={styles.checkboxLabel}>Mobilidade de quadril</Text>
        </Pressable>
      </View>

      {/* Abdominais */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Abdominais</Text>
          <Pressable style={styles.smallBtn} onPress={toggleAbs}>
            <Text style={styles.smallBtnTxt}>{session.showAbs ? 'Esconder' : 'Exibir'}</Text>
          </Pressable>
        </View>

        {session.showAbs && (
          <>
            {session.abs.length === 0 ? (
              <Text style={styles.meta}>Nenhum abdominal adicionado.</Text>
            ) : (
              <View style={{ gap: 10 }}>{session.abs.map(renderAbdominal)}</View>
            )}

            <Pressable style={styles.secondaryBtn} onPress={onAddAbdominal}>
              <Text style={styles.secondaryTxt}>+ Incluir abdominal</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Exercícios */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Exercícios</Text>
          <Pressable style={styles.secondaryBtnMini} onPress={addExerciseHere}>
            <Text style={styles.secondaryTxt}>+ Exercício</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140, gap: 12 }}>
          {exercises.length === 0 && (
            <Text style={styles.meta}>
              Nenhum exercício. Use “+ Exercício”.
            </Text>
          )}

          {exercises.map((ex, idx) => {
            const st = getLoadStatusFromExercise(ex);
            const stUI = statusStyles(st);

            return (
              <Pressable
                key={`${ex.name}_${idx}`}
                style={[
                  styles.card,
                  { borderColor: stUI.borderColor, backgroundColor: stUI.backgroundColor },
                ]}
                onPress={() =>
                  navigation.navigate('Exercise', {
                    sessionType: type,
                    exerciseName: ex.name,
                  })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{ex.name}</Text>
                  {stUI.chip ? <Text style={styles.chip}>{stUI.chip}</Text> : null}
                </View>

                <Text style={styles.cardSub}>
                  {ex.sets.filter((s) => s.kind === 'work').length} trabalho
                  {ex.sets.some((s) => s.kind === 'warmup') ? ' • + aquecimento' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={finalizeSession}>
          <Text style={styles.primaryTxt}>Finalizar sessão</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16, gap: 14 },
  title: { fontSize: 22, fontWeight: '900' },

  section: { gap: 10 },

  label: { fontSize: 14, fontWeight: '900', color: '#111' },
  meta: { fontSize: 12, color: '#666' },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: '#111', borderColor: '#111' },
  checkboxLabel: { fontWeight: '800', color: '#111' },

  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontWeight: '900', fontSize: 16, color: '#111', flex: 1 },
  chip: { fontSize: 11, color: '#111', fontWeight: '900' },
  cardSub: { marginTop: 6, color: '#666' },

  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnMini: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryTxt: { color: '#111', fontWeight: '900' },

  abCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  abHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  abTitle: { fontWeight: '900', color: '#111' },
  abRemoveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  abRemoveTxt: { fontWeight: '900', color: '#111', fontSize: 12 },

  abSetRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  abSetLabel: { width: 26, fontWeight: '900', color: '#111' },
  abInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '900' },
});