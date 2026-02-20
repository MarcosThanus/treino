import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { store, uid } from '../state/store';

type R = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function ensureSession(type: string) {
  if (!store.sessions[type]) {
    const presets: Record<string, string[]> = {
      Perna: ['Leg Press', 'Mesa Flexora', 'Panturrilha Máquina'],
      Puxadas: ['Puxada na Barra', 'Remada Máquina'],
      Empurradas: []
    };

    const exercises =
      presets[type]?.map((name) => ({
        name,
        status: 'pending' as const,
        sets: [
          {
            id: uid('warm'),
            kind: 'warmup' as const,
            weight: undefined,
            reps: undefined
          },
          {
            id: uid('work'),
            kind: 'work' as const,
            weight: undefined,
            reps: undefined
          },
          {
            id: uid('work'),
            kind: 'work' as const,
            weight: undefined,
            reps: undefined
          },
          {
            id: uid('work'),
            kind: 'work' as const,
            weight: undefined,
            reps: undefined
          }
        ]
      })) ?? [];

    store.sessions[type] = {
      type,
      hideRir: false,
      exercises
    };
  }

  return store.sessions[type];
}

export function SessionScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { type } = route.params;

  // inicializa antes de renderizar
  const session = ensureSession(type);

  const [, force] = useState(0);

  function addExercise() {
    const name = `Exercício ${session.exercises.length + 1}`;
    session.exercises.push({
      name,
      status: 'pending',
      sets: [
        {
          id: uid('warm'),
          kind: 'warmup',
          weight: undefined,
          reps: undefined
        },
        {
          id: uid('work'),
          kind: 'work',
          weight: undefined,
          reps: undefined
        },
        {
          id: uid('work'),
          kind: 'work',
          weight: undefined,
          reps: undefined
        }
      ]
    });
    force((x) => x + 1);
  }

  function concludeSession() {
    const now = new Date();
    console.log('Sessão concluída em', now.toISOString());
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessão de {type}</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 140, gap: 12 }}>
        {session.exercises.length === 0 && (
          <Text style={styles.empty}>
            Nenhum exercício cadastrado.
          </Text>
        )}

        {session.exercises.map((ex, index) => (
          <Pressable
            key={index}
            style={[
              styles.card,
              ex.status === 'done' && styles.cardDone
            ]}
            onPress={() =>
              navigation.navigate('Exercise', {
                sessionType: type,
                exerciseName: ex.name
              })
            }
          >
            <Text style={styles.cardTitle}>{ex.name}</Text>
            <Text style={styles.cardSub}>
              {ex.status === 'done'
                ? '✔ Concluído'
                : `${ex.sets.length} séries`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.secondaryBtn} onPress={addExercise}>
          <Text style={styles.secondaryTxt}>+ Exercício</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} onPress={concludeSession}>
          <Text style={styles.primaryTxt}>Concluir Sessão</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12
  },
  empty: {
    color: '#666'
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6'
  },
  cardDone: {
    backgroundColor: '#e7f7ed',
    borderColor: '#c7e9d2'
  },
  cardTitle: {
    fontWeight: '900',
    fontSize: 16
  },
  cardSub: {
    marginTop: 4,
    color: '#666'
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 12
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  primaryTxt: {
    color: '#fff',
    fontWeight: '900'
  },
  secondaryBtn: {
    width: 140,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  secondaryTxt: {
    color: '#111',
    fontWeight: '900'
  }
});