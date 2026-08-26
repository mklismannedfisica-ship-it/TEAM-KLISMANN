import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>P</Text>
      </View>
      <Text style={styles.title}>Meu Personal</Text>
      <Text style={styles.subtitle}>Entre com o e-mail e senha que seu personal te enviou.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@exemplo.com"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color={colors.voltDark} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg950,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.volt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 24, fontWeight: "900", color: colors.voltDark },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 32,
  },
  form: { width: "100%", maxWidth: 360 },
  label: { fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.voltDark, fontWeight: "700", fontSize: 15 },
});
