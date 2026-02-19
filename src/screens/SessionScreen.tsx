import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import { RootStackParamList } from '../../App';

type R = RouteProp<RootStackParamList, 'Session'>;

type SetRow = {
  kind: 'warmup' | 'work';
  weight?: number;
  reps?: number;
  note?: string;
};

type ExerciseSeed = {
  name: string;
  sets: SetRow[];
};

// Seed inicial baseado no seu TXT (normalizado)
const SEED: Record<string, ExerciseSeed[]> = {
  Perna: [
    {
      name: 'Press',
      sets: [
        { kind: 'warmup', weight: 20, reps: 15 },
        { kind: 'work', weight: 42.5, reps: 15 },
        { kind: 'work', weight: 65, reps: 15 },
        { kind: 'work', weight: 80, reps: 15 },
        { kind: 'work', weight: 82.5, reps: 15, note: 'última um pouco difícil / mas tá leve' }
      ]
    },
    {
      name: 'Cadeira adutora',
      sets: [
        { kind: 'warmup', weight: 35, reps: 15 },
        { kind: 'work', weight: 72.5, reps: 15, note: 'poderia ir mais 3' },
        { kind: 'work', weight: 80, reps: 15, note: 'peq falha técnica' },
        { kind: 'work', weight: 85.5, reps: 12, note: 'poderia mais 2' }
      ]
    },
    {
      name: 'Extensora',
      sets: [
        { kind: 'work', weight: 42.5, reps: 15 },
        { kind: 'work', weight: 50, reps: 15 },
        { kind: 'work', weight: 57.5, reps: 11, note: 'poderia ir mais 2' }
      ]
    },
    {
      name: 'Mesa flexora',
      sets: [
        { kind: 'work', weight: 35, reps: 12 },
        { kind: 'work', weight: 42.5, reps: 12 },
        { kind: 'work', weight: 50, reps: 8 }
      ]
    },
    {
      name: 'Cadeira flexora',
      sets: [
        { kind: 'work', weight: 35, reps: 15 },
        { kind: 'work', weight: 42.5, reps: 15 },
        { kind: 'work', weight: 50, reps: 12, note: 'última no limite' }
      ]
    },
    {
      name: 'Cadeira abdutora',
      sets: [
        { kind: 'work', weight: 72.5, reps: 15 },
        { kind: 'work', weight: 80, reps: 15 },
        { kind: 'work', weight: 87.5, reps: 14, note: 'mais um no máximo' }
      ]
    },
    {
      name: 'Panturrilha (halteres)',
      sets: [
        { kind: 'work', weight: 10, reps: 22 },
        { kind: 'work', weight: 12, reps: 15 },
        { kind: 'work', weight: 14, reps: 17, note: 'poderia mais 3' }
      ]
    }
  ],
  Puxadas: [
    {
      name: 'Remada baixa com triângulo',
      sets: [
        { kind: 'warmup', weight: 10, reps: 15 },
        { kind: 'work', weight: 20, reps: 15 },
        { kind: 'work', weight: 25, reps: 15 },
        { kind: 'work', weight: 30, reps: 14, note: 'poderia fazer mais duas' }
      ]
    },
    {
      name: 'Puxada alta com triângulo',
      sets: [
        { kind: 'warmup', weight: 15, reps: 15 },
        { kind: 'work', weight: 25, reps: 15 },
        { kind: 'work', weight: 30, reps: 12, note: 'falha técnica leve no penúltimo' },
        { kind: 'work', weight: 35, reps: 10 }
      ]
    },
    {
      name: 'Voador costas',
      sets: [
        { kind: 'work', weight: 27.5, reps: 10 },
        { kind: 'work', weight: 30, reps: 10 },
        { kind: 'work', weight: 32.5, reps: 6, note: 'falha técnica' }
      ]
    },
    {
      name: 'Bíceps cabo corda',
      sets: [
        { kind: 'work', weight: 7.5, reps: 15 },
        { kind: 'work', weight: 10, reps: 10 },
        { kind: 'work', weight: 12.5, reps: 8, note: 'acho que eu fazia mais uma' }
      ]
    },
    {
      name: 'Bíceps máquina',
      sets: [
        { kind: 'work', weight: 20, reps: 10 },
        { kind: 'work', weight: 22.5, reps: 8 },
        { kind: 'work', weight: 25, reps: 8 }
      ]
    },
    {
      name: 'Abdominal (máquina)',
      sets: [
        { kind: 'work', weight: 27.5, reps: 15 },
        { kind: 'work', weight: 42.5, reps: 15 },
        { kind: 'work', weight: 50, reps: 12, note: 'dava mais 2?' }
      ]
    },
    {
      name: 'Extensão costas',
      sets: [{ kind: 'work', weight: 42.5, reps: 15, note: 'foi fácil. pouco descanso' }]
    }
  ],
  Empurradas: []
};

export function SessionScreen() {
  const route = useRoute<R>();
  const type = route.params.type; // "Perna" / "Puxadas" / "Empurradas"
  const exercises = SEED[type] ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessão de {type}</Text>

      {exercises.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Sem exercícios</Text>
          <Text style={styles.emptySub}>
            Para Empurradas, por enquanto você vai adicionar exercícios manualmente (próximo passo).
          </Text>
          <Pressable style={styles.btn}>
            <Text style={styles.btnTxt}>+ Incluir exercício</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {exercises.map((ex) => (
            <View key={ex.name} style={styles.card}>
              <Text style={styles.cardTitle}>{ex.name}</Text>
              {ex.sets.map((s, i) => (
                <Text key={i} style={styles.setLine}>
                  {s.kind === 'warmup' ? 'Aquec.' : 'Trab.'} — {s.weight ?? '-'} x {s.reps ?? '-'}
                  {s.note ? `  •  ${s.note}` : ''}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#111' },
  list: { paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6'
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111', marginBottom: 8 },
  setLine: { color: '#444', marginTop: 2 },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    gap: 10
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  emptySub: { color: '#555' },
  btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '900' }
});
