import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const buttons = ['Perna', 'Puxadas', 'Empurradas', 'Aeróbico', 'Criar treino'];

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecione o treino</Text>
      {buttons.map((label) => (
        <Pressable key={label} style={styles.button}>
          <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1c1c1c'
  },
  button: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1f6feb',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
