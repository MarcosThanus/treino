// App.tsx
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ExerciseScreen } from './src/screens/ExerciseScreen';

import { hydrateStore } from './src/state/store';

export type RootStackParamList = {
  Home: undefined;
  Session: { routineId: string };
  Exercise: { routineId: string; exerciseId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      await hydrateStore();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Treino' }} />
        <Stack.Screen name="Session" component={SessionScreen} options={{ title: 'Sessão' }} />
        <Stack.Screen name="Exercise" component={ExerciseScreen} options={{ title: 'Exercício' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}