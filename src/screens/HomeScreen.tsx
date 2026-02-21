// src/screens/HomeScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import {
  addRoutine,
  archiveRoutine,
  listActiveRoutines,
  listArchivedRoutines,
  unarchiveRoutine,
  resetRoutineTemplate,
  scheduleSave,
} from '../state/store';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [, force] = useState(0);

  const active = useMemo(() => listActiveRoutines(), [/* store in-memory */]);
  const archived = useMemo(() => listArchivedRoutines(), [/* store in-memory */]);

  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  function openRoutine(routineId: string) {
    navigation.navigate('Session', { routineId });
  }

  function startCreate() {
    setCreating(true);
    setNameDraft('');
  }

  function confirmCreate() {
    const r = addRoutine(nameDraft);
    scheduleSave();
    setCreating(false);
    setNameDraft('');
    force((x) => x + 1);
    navigation.navigate('Session', { routineId: r.id });
  }

  function cancelCreate() {
    setCreating(false);
    setNameDraft('');
  }

  function askArchive(routineId: string, routineName: string) {
    Alert.alert(
      'Arquivar rotina',
      `Arquivar "${routineName}"? (Nada será apagado)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Arquivar',
          style: 'destructive',
          onPress: () => {
            archiveRoutine(routineId);
            scheduleSave();
            force((x) => x + 1);
          },
        },
      ]
    );
  }

  function askResetTemplate(routineId: string, routineName: string) {
    Alert.alert(
      'Criar rotina do zero',
      `Zerar a base de "${routineName}"? (Histórico não será apagado)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Zerar',
          style: 'destructive',
          onPress: () => {
            resetRoutineTemplate(routineId);
            scheduleSave();
            force((x) => x + 1);
            navigation.navigate('Session', { routineId });
          },
        },
      ]
    );
  }

  function askUnarchive(routineId: string, routineName: string) {
    Alert.alert(
      'Reativar rotina',
      `Reativar "${routineName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reativar',
          onPress: () => {
            unarchiveRoutine(routineId);
            scheduleSave();
            force((x) => x + 1);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Treino</Text>
        <Text style={styles.subtitle}>Escolha ou crie uma rotina</Text>

        {/* Criar rotina */}
        {!creating ? (
          <Pressable style={styles.primaryBtn} onPress={startCreate}>
            <Text style={styles.primaryTxt}>+ Criar nova rotina</Text>
          </Pressable>
        ) : (
          <View style={styles.createBox}>
            <Text style={styles.label}>Nome da rotina</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Braço, Peito e Tríceps..."
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
            />
            <View style={styles.row}>
              <Pressable style={styles.secondaryBtn} onPress={cancelCreate}>
                <Text style={styles.secondaryTxt}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.primaryBtnSmall} onPress={confirmCreate}>
                <Text style={styles.primaryTxt}>Criar</Text>
              </Pressable>
            </View>
            <Text style={styles.meta}>
              Dica: depois você pode arquivar/reativar rotinas quando quiser.
            </Text>
          </View>
        )}

        <View style={{ height: 16 }} />

        {/* Rotinas ativas */}
        <Text style={styles.sectionTitle}>Rotinas</Text>
        <View style={{ gap: 12 }}>
          {active.length === 0 ? (
            <Text style={styles.meta}>Nenhuma rotina ativa. Crie uma acima.</Text>
          ) : (
            active.map((r) => (
              <View key={r.id} style={styles.card}>
                <Pressable onPress={() => openRoutine(r.id)} style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.name}</Text>
                  <Text style={styles.cardHint}>Abrir sessão</Text>
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => askResetTemplate(r.id, r.name)}
                  >
                    <Text style={styles.smallBtnTxt}>Zerar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallBtnDanger}
                    onPress={() => askArchive(r.id, r.name)}
                  >
                    <Text style={styles.smallBtnTxtDanger}>Arquivar</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Arquivadas (opcional) */}
        <View style={{ height: 18 }} />
        <Text style={styles.sectionTitle}>Arquivadas</Text>
        <View style={{ gap: 10 }}>
          {archived.length === 0 ? (
            <Text style={styles.meta}>Nenhuma rotina arquivada.</Text>
          ) : (
            archived.map((r) => (
              <Pressable
                key={r.id}
                style={styles.archivedCard}
                onPress={() => askUnarchive(r.id, r.name)}
              >
                <Text style={styles.archivedTitle}>{r.name}</Text>
                <Text style={styles.archivedHint}>Toque para reativar</Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 16, gap: 12 },

  title: { fontSize: 28, fontWeight: '900', color: '#111' },
  subtitle: { fontSize: 14, color: '#444', marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#111' },
  label: { fontSize: 13, fontWeight: '900', color: '#111' },
  meta: { fontSize: 12, color: '#666' },

  row: { flexDirection: 'row', gap: 12 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  primaryBtn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnSmall: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '900' },

  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryTxt: { color: '#111', fontWeight: '900' },

  createBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },

  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  cardHint: { fontSize: 12, color: '#666', marginTop: 4 },

  cardActions: { gap: 10, alignItems: 'flex-end' },

  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  smallBtnTxt: { fontWeight: '900', color: '#111', fontSize: 12 },

  smallBtnDanger: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0b3b3',
    backgroundColor: '#fff',
  },
  smallBtnTxtDanger: { fontWeight: '900', color: '#b00020', fontSize: 12 },

  archivedCard: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 16,
    padding: 14,
  },
  archivedTitle: { fontWeight: '900', color: '#111' },
  archivedHint: { fontSize: 12, color: '#666', marginTop: 4 },
});