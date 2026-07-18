import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

export default function PreferencesScreen() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const deleteAccount = useMutation({
    mutationFn: () => trpcClient.settings.deleteAccount.mutate(),
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
    },
    onError: (error) => Alert.alert("Erro ao excluir conta", getErrorMessage(error)),
  });

  const handleDeleteAccount = React.useCallback(() => {
    Alert.alert(
      "Excluir conta",
      "Essa acao remove permanentemente sua conta no app e no banco de dados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmacao final",
              "Tem certeza? Esta acao nao pode ser desfeita.",
              [
                { text: "Voltar", style: "cancel" },
                {
                  text: "Excluir conta",
                  style: "destructive",
                  onPress: () => deleteAccount.mutate(),
                },
              ],
            );
          },
        },
      ],
    );
  }, [deleteAccount]);

  return (
    <Screen>
      <AppTopBar />

      <Card>
        <Text style={styles.sectionTitle}>Configurações</Text>
        <Text style={styles.detail}>No momento, nao ha configurações adicionais disponiveis no aplicativo.</Text>

        <Text style={styles.deleteTitle}>Zona de risco</Text>
        <Text style={styles.deleteDescription}>
          Ao excluir sua conta, todos os seus dados serao removidos de forma definitiva.
        </Text>
        <Pressable onPress={handleDeleteAccount} disabled={deleteAccount.isPending} style={styles.deleteAction}>
          <Text style={[styles.deleteActionText, deleteAccount.isPending && styles.deleteActionTextDisabled]}>
            {deleteAccount.isPending ? "Excluindo..." : "Excluir minha conta"}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteTitle: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  deleteDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteAction: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  deleteActionText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  deleteActionTextDisabled: {
    opacity: 0.6,
  },
});
