// App.tsx

import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ExerciseScreen } from './src/screens/ExerciseScreen';
import { hydrateStore, SessionType } from './src/state/store';

export type RootStackParamList = {
  Home: undefined;
  Session: { type: SessionType };
  Exercise: { sessionType: SessionType; exerciseName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      await hydrateStore();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Carregando…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Treino' }} />
        <Stack.Screen name="Session" component={SessionScreen} options={{ title: 'Sessão' }} />
        <Stack.Screen name="Exercise" component={ExerciseScreen} options={{ title: 'Exercício' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}