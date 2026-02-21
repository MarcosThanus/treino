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
  createAbdominal,
  removeAbdominal,
  finalizeSession,
  scheduleSave,
  archiveExercise,
  listArchivedExercises,
  restoreArchivedExercise,
  type AbMode,
  type ExerciseEntry,
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

const ABD_MODES: { key: AbMode; label: string }[] = [
  { key: 'time', label: 'Tempo (s)' },
  { key: 'weight_reps', label: 'Peso + Reps' },
  { key: 'reps', label: 'Reps' },
];

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

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const [showDone, setShowDone] = useState(false);

  // painel de adicionar exercício
  const [showAddPanel, setShowAddPanel] = useState(false);

  // criar abdominal (deixa como está por enquanto)
  const [creatingAb, setCreatingAb] = useState(false);
  const [abNameDraft, setAbNameDraft] = useState('');
  const [abModeDraft, setAbModeDraft] = useState<AbMode>('reps');

  const archivedExercises = listArchivedExercises(routineId);

  const { pendingExercises, doneExercises } = useMemo(() => {
    const pending = session.exercises.filter((e) => e.status !== 'done');
    const done = session.exercises.filter((e) => e.status === 'done');
    return { pendingExercises: pending, doneExercises: done };
  }, [session.exercises]);

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

  function startCreateAb() {
    setCreatingAb(true);
    setAbNameDraft('');
    setAbModeDraft('reps');
    session.showAbs = true;
    scheduleSave();
    force((x) => x + 1);
  }

  function cancelCreateAb() {
    setCreatingAb(false);
    setAbNameDraft('');
    setAbModeDraft('reps');
  }

  function confirmCreateAb() {
    const name = abNameDraft.trim();
    if (!name) {
      Alert.alert('Nome inválido', 'Digite o nome do abdominal.');
      return;
    }
    createAbdominal(routineId, { name, mode: abModeDraft });
    scheduleSave();
    setCreatingAb(false);
    setAbNameDraft('');
    setAbModeDraft('reps');
    force((x) => x + 1);
  }

  function onRemoveAb(abId: string) {
    removeAbdominal(routineId, abId);
    scheduleSave();
    force((x) => x + 1);
  }

  function startAddExercise() {
    setShowAddPanel((v) => !v);
    setRenamingId(null);
    setRenameDraft('');
  }

  function createNewExercise() {
    const ex = addExercise(routineId);
    setRenamingId(ex.id);
    setRenameDraft(ex.name);
    setShowAddPanel(false);
    scheduleSave();
    force((x) => x + 1);
  }

  function restoreExercise(exId: string) {
    const ex = restoreArchivedExercise(routineId, exId);
    if (!ex) return;
    setShowAddPanel(false);
    scheduleSave();
    force((x) => x + 1);
    navigation.navigate('Exercise', { routineId, exerciseId: ex.id });
  }

  function confirmRename() {
    if (!renamingId) return;

    const ex = session.exercises.find((e) => e.id === renamingId);
    if (!ex) return;

    const next = renameDraft.trim();
    if (!next) {
      Alert.alert('Nome inválido', 'Digite um nome para o exercício.');
      return;
    }

    ex.name = next;
    setRenamingId(null);
    setRenameDraft('');
    scheduleSave();
    force((x) => x + 1);

    navigation.navigate('Exercise', { routineId, exerciseId: ex.id });
  }

  function askRemoveExercise(exerciseId: string, name: string) {
    Alert.alert(
      'Remover exercício',
      `Remover "${name}" desta sessão?\n\nEle não será apagado. Vai ficar disponível para re-adicionar depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            archiveExercise(routineId, exerciseId);
            scheduleSave();
            force((x) => x + 1);
          },
        },
      ]
    );
  }

  function onFinalize() {
    finalizeSession(routineId);
    const sess = store.sessionsByRoutineId[routineId];
    const dur = sess?.meta.durationSec;

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

      {/* Mobilidade quadril */}
      <View style={styles.section}>
        <Pressable style={styles.checkboxRow} onPress={toggleHip}>
          <View style={[styles.checkbox, session.hipMobilityDone && styles.checkboxOn]} />
          <Text style={styles.checkboxLabel}>Mobilidade de quadril</Text>
        </Pressable>
      </View>

      {/* Abdominais (deixa simples agora) */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Abdominais</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={styles.smallBtn} onPress={toggleAbs}>
              <Text style={styles.smallBtnTxt}>{session.showAbs ? 'Esconder' : 'Exibir'}</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={startCreateAb}>
              <Text style={styles.smallBtnTxt}>+ Abdominal</Text>
            </Pressable>
          </View>
        </View>

        {session.showAbs && (
          <View style={{ gap: 10 }}>
            {creatingAb && (
              <View style={styles.createBox}>
                <Text style={styles.label}>Criar abdominal</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nome (ex: Nadador, Prancha, Máquina...)"
                  value={abNameDraft}
                  onChangeText={setAbNameDraft}
                  autoFocus
                />

                <View style={styles.row}>
                  {ABD_MODES.map((m) => (
                    <Pressable
                      key={m.key}
                      style={[styles.modeBtn, abModeDraft === m.key && styles.modeBtnOn]}
                      onPress={() => setAbModeDraft(m.key)}
                    >
                      <Text style={[styles.modeTxt, abModeDraft === m.key && styles.modeTxtOn]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.row}>
                  <Pressable style={styles.secondaryBtn} onPress={cancelCreateAb}>
                    <Text style={styles.secondaryTxt}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.primaryBtnSmall} onPress={confirmCreateAb}>
                    <Text style={styles.primaryTxt}>Criar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {session.abs.length === 0 ? (
              <Text style={styles.meta}>Nenhum abdominal.</Text>
            ) : (
              session.abs.map((ab) => (
                <View key={ab.id} style={styles.abCard}>
                  <View style={styles.abHeader}>
                    <Text style={styles.abTitle}>{ab.name}</Text>
                    <Pressable style={styles.abRemoveBtn} onPress={() => onRemoveAb(ab.id)}>
                      <Text style={styles.abRemoveTxt}>Remover</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.meta}>
                    Modo: {ABD_MODES.find((m) => m.key === ab.mode)?.label ?? ab.mode}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Exercícios */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Exercícios</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {doneExercises.length > 0 && (
              <Pressable style={styles.doneBtn} onPress={() => setShowDone((v) => !v)}>
                <Text style={styles.doneTxt}>
                  Concluídos ({doneExercises.length}) {showDone ? '▲' : '▼'}
                </Text>
              </Pressable>
            )}

            <Pressable style={styles.secondaryBtnMini} onPress={startAddExercise}>
              <Text style={styles.secondaryTxt}>+ Exercício</Text>
            </Pressable>
          </View>
        </View>

        {/* Painel de adicionar exercício */}
        {showAddPanel && (
          <View style={styles.addPanel}>
            <Pressable style={styles.primaryBtnSmall} onPress={createNewExercise}>
              <Text style={styles.primaryTxt}>Novo exercício</Text>
            </Pressable>

            {archivedExercises.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={styles.meta}>Re-adicionar removidos</Text>

                {archivedExercises.slice(0, 12).map((ex) => (
                  <Pressable
                    key={ex.id}
                    style={styles.archItem}
                    onPress={() => restoreExercise(ex.id)}
                  >
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

        {renamingId && (
          <View style={styles.renameBox}>
            <Text style={styles.renameTitle}>Nome do exercício</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="Digite o nome"
                autoFocus
              />
              <Pressable style={styles.smallBtn} onPress={confirmRename}>
                <Text style={styles.smallBtnTxt}>OK</Text>
              </Pressable>
            </View>
            <Text style={styles.meta}>Depois de renomear, ele abre para editar.</Text>
          </View>
        )}

        {/* Pendentes */}
        <View style={{ gap: 12 }}>
          {pendingExercises.length === 0 ? (
            <Text style={styles.meta}>
              {doneExercises.length > 0
                ? 'Todos os exercícios desta sessão já foram concluídos.'
                : 'Nenhum exercício. Use “+ Exercício”.'}
            </Text>
          ) : (
            pendingExercises.map((ex) => {
              const st = getLoadStatusFromExercise(ex);
              const stUI = statusStyles(st);

              return (
                <View
                  key={ex.id}
                  style={[
                    styles.card,
                    { borderColor: stUI.borderColor, backgroundColor: stUI.backgroundColor },
                  ]}
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('Exercise', { routineId, exerciseId: ex.id })}
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

                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => askRemoveExercise(ex.id, ex.name)}
                  >
                    <Text style={styles.removeTxt}>Remover</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* Concluídos */}
        {showDone && doneExercises.length > 0 && (
          <View style={styles.donePanel}>
            {doneExercises.map((ex) => (
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

  renameBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#111',
    padding: 12,
    gap: 10,
  },
  renameTitle: { fontWeight: '900', color: '#111' },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
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

  createBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },

  modeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  modeBtnOn: { borderColor: '#111' },
  modeTxt: { fontWeight: '900', color: '#111', fontSize: 12 },
  modeTxtOn: { color: '#111' },

  secondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },

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

  abCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 14,
    padding: 12,
    gap: 8,
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
});