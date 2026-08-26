import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { AuthProvider } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.configContainer}>
        <StatusBar style="light" />
        <Text style={styles.configTitle}>Configuração pendente</Text>
        <Text style={styles.configText}>
          Crie o arquivo apps/mobile/.env com EXPO_PUBLIC_SUPABASE_URL e
          EXPO_PUBLIC_SUPABASE_ANON_KEY (veja o .env.example) e reinicie o app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="workout/[id]"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg900 },
              headerTintColor: colors.text,
              headerTitle: "Treino",
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configContainer: {
    flex: 1,
    backgroundColor: "#0a0a0d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  configTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  configText: { color: "#8b8b96", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
