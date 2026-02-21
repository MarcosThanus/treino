// src/screens/HomeScreen.tsx
import React, { useState } from 'react';
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
  listActiveRoutines,
  listArchivedRoutines,
  archiveRoutine,
  unarchiveRoutine,
  scheduleSave,
} from '../state/store';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [, force] = useState(0);

  const active = listActiveRoutines();
  const archived = listArchivedRoutines();

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
    const name = nameDraft.trim();
    const r = addRoutine(name);
    scheduleSave();
    setCreating(false);
    setNameDraft('');
    force((x) => x + 1);
    openRoutine(r.id);
  }

  function cancelCreate() {
    setCreating(false);
    setNameDraft('');
  }

  function chooseRoutineToDelete() {
    if (active.length === 0) {
      Alert.alert('Nada para apagar', 'Não há rotinas ativas.');
      return;
    }

    Alert.alert(
      'Apagar rotina',
      'Escolha qual rotina quer apagar (arquivar).',
      [
        { text: 'Cancelar', style: 'cancel' },
        ...active.slice(0, 6).map((r) => ({
          text: r.name,
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert(
              'Confirmar',
              `Apagar "${r.name}"?\n\nNada será apagado do histórico. A rotina só será arquivada.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar',
                  style: 'destructive',
                  onPress: () => {
                    archiveRoutine(r.id);
                    scheduleSave();
                    force((x) => x + 1);
                  },
                },
              ]
            );
          },
        })),
        ...(active.length > 6
          ? [
              {
                text: 'Tenho mais rotinas…',
                onPress: () => {
                  // fallback simples: mostra outra lista (pode melhorar depois)
                  Alert.alert(
                    'Apagar rotina',
                    'Role e escolha pelo toque na rotina na lista (modo avançado no próximo passo).'
                  );
                },
              },
            ]
          : []),
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Treino</Text>

        <View style={styles.topRow}>
          {!creating ? (
            <Pressable style={styles.primaryBtn} onPress={startCreate}>
              <Text style={styles.primaryTxt}>+ Criar nova rotina</Text>
            </Pressable>
          ) : (
            <View style={styles.createBox}>
              <Text style={styles.label}>Nome da rotina</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Braço"
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
            </View>
          )}

          <Pressable style={styles.dangerBtn} onPress={chooseRoutineToDelete}>
            <Text style={styles.dangerTxt}>Apagar rotina</Text>
          </Pressable>
        </View>

        <View style={{ height: 12 }} />

        <Text style={styles.sectionTitle}>Rotinas</Text>
        <View style={{ gap: 12 }}>
          {active.length === 0 ? (
            <Text style={styles.meta}>Nenhuma rotina ativa.</Text>
          ) : (
            active.map((r) => (
              <Pressable key={r.id} style={styles.card} onPress={() => openRoutine(r.id)}>
                <Text style={styles.cardTitle}>{r.name}</Text>
                <Text style={styles.cardHint}>Toque para abrir</Text>
              </Pressable>
            ))
          )}
        </View>

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
                onPress={() => {
                  Alert.alert('Reativar', `Reativar "${r.name}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Reativar',
                      onPress: () => {
                        unarchiveRoutine(r.id);
                        scheduleSave();
                        force((x) => x + 1);
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.archivedTitle}>{r.name}</Text>
                <Text style={styles.archivedHint}>Toque para reativar</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '900', color: '#111' },

  topRow: { gap: 12 },

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

  dangerBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0b3b3',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerTxt: { fontWeight: '900', color: '#b00020' },

  createBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  cardHint: { fontSize: 12, color: '#666', marginTop: 4 },

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