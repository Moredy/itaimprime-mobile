import React from "react";
import { StyleSheet, Text } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <AppTopBar />

      <Card>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.detail}>As configuracoes foram movidas para o menu lateral do hamburguer.</Text>
        <Text style={styles.detail}>Usuario: {user?.name ?? "Medico"}</Text>
        <Text style={styles.detail}>Email: {user?.email ?? "-"}</Text>
        <Button title="Sair" variant="secondary" onPress={signOut} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
