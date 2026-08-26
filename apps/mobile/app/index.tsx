import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function Index() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && session && profile && profile.role !== "student") {
      supabase.auth.signOut();
    }
  }, [loading, session, profile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (profile && profile.role !== "student") return <Redirect href="/login" />;

  return <Redirect href="/(tabs)/home" />;
}
