import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() ?? "?"}</Text>
      </View>
      <Text style={styles.name}>{profile?.full_name}</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      {profile?.phone ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefone</Text>
          <Text style={styles.infoValue}>{profile.phone}</Text>
        </View>
      ) : null}

      <Pressable style={styles.signOutButton} onPress={confirmSignOut}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", padding: 24, paddingTop: 40 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.volt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.voltDark },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  email: { fontSize: 13, color: colors.muted, marginTop: 4 },
  infoRow: {
    width: "100%",
    marginTop: 24,
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: { color: colors.muted, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "600" },
  signOutButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  signOutText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
});
