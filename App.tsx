import 'react-native-gesture-handler';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ExerciseScreen } from './src/screens/ExerciseScreen';

export type RootStackParamList = {
  Home: undefined;
  Session: { type: string };
  Exercise: { sessionType: string; exerciseName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: '900' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Treino' }}
        />

        <Stack.Screen
          name="Session"
          component={SessionScreen}
          options={({ route }) => ({
            title: `Sessão de ${route.params.type}`
          })}
        />

        <Stack.Screen
          name="Exercise"
          component={ExerciseScreen}
          options={({ route }) => ({
            title: route.params.exerciseName
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
