import { Stack } from 'expo-router';
import { C } from '../../constants/colors';

export default function FlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.base800 },
        animation: 'fade',
      }}
    />
  );
}
