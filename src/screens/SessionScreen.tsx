import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Switch } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { store, uid, ExerciseState } from '../state/store';

type R = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function seed(type: string): ExerciseState[] {
  if (type === 'Perna') {
    return [
      { name: 'Press', status: 'pending', sets: [{ id: uid(), kind: 'work', weight: 42.5, reps: 15 }] },
      { name: 'Cadeira adutora', status: 'pending', sets: [{ id: uid(), kind: 'work', weight: 72.5, reps: 15 }] }
    ];
  }
  if (type === 'Puxadas') {
    return [
      { name: 'Remada baixa', status: 'pending', sets: [{ id: uid(), kind: 'work', weight: 20, reps: 15 }] },
      { name: 'Puxada alta', status: 'pending', sets: [{ id: uid(), kind: 'work', weight: 25, reps: 15 }] }
    ];
  }
  return [];
}

export function SessionScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const type = route.params.type;
  const [, force] = useState(0);

  useEffect(() => {
    if (!store.sessions[type]) {
      store.sessions[type] = {
        type,
        hideRir: true,
        exercises: seed(type)
      };
    }
  }, [type]);

  const session = store.sessions[type];
  const pending = session.exercises.filter((e) => e.status === 'pending');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessão de {type}</Text>

        <View style={styles.rirRow}>
          <Text style={styles.rirLabel}>Hide RIR</Text>
          <Switch
            value={session.hideRir}
            onValueChange={(v) => {
              session.hideRir = v;
              force((x) => x + 1);
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140, gap: 10 }}>
        {pending.map((ex) => (
          <Pressable
            key={ex.name}
            style={styles.card}
            onPress={() =>
              nav.navigate('Exercise', {
                sessionType: type,
                exerciseName: ex.name
              })
            }
          >
            <Text style={styles.cardTitle}>{ex.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryTxt}>Concluir sessão</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16, gap: 12 },
  header: { gap: 10 },
  title: { fontSize: 22, fontWeight: '900' },
  rirRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rirLabel: { fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12 },
  cardTitle: { fontWeight: '900' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  primaryBtn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontWeight: '900' }
});
