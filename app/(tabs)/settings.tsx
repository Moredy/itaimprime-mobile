import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Platform, StyleSheet, Text, ToastAndroid } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { SelectField } from "@/components/SelectField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const formatNameToTitleCase = (value?: string | null) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "Medico";
  }

  return trimmedValue
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { user, refreshSession, signOut } = useAuth();
  const [specialty, setSpecialty] = React.useState(user?.specialty ?? "");

  React.useEffect(() => {
    setSpecialty(user?.specialty ?? "");
  }, [user?.specialty]);

  const specialtyOptionsQuery = useQuery({
    queryKey: queryKeys.specialtyOptions,
    queryFn: () => trpcClient.settings.getSpecialtyOptions.query() as Promise<{ id: string; name: string }[]>,
  });

  const specialtyOptions = React.useMemo(
    () => (specialtyOptionsQuery.data ?? []).map((option) => ({ label: option.name, value: option.name })),
    [specialtyOptionsQuery.data],
  );

  const normalizedSpecialty = specialty.trim();
  const isSelectedSpecialtyValid = specialtyOptions.some((option) => option.value === normalizedSpecialty);

  const saveSpecialty = useMutation({
    mutationFn: async () => {
      if (!normalizedSpecialty) {
        throw new Error("Especialidade e obrigatoria.");
      }

      if (!isSelectedSpecialtyValid) {
        throw new Error("Selecione uma especialidade valida da lista.");
      }

      await trpcClient.settings.updateSpecialty.mutate({ specialty: normalizedSpecialty });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.specialtyOptions });
      await refreshSession();

      const message = "Especialidade salva com sucesso.";
      if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert("Sucesso", message);
      }
    },
    onError: (error) => Alert.alert("Erro ao salvar especialidade", getErrorMessage(error)),
  });

  return (
    <Screen>
      <AppTopBar />

      <Card>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.detail}>Nome: {formatNameToTitleCase(user?.name)}</Text>
        <Text style={styles.detail}>Email: {user?.email ?? "-"}</Text>

        {specialtyOptionsQuery.isLoading ? <LoadingState label="Carregando especialidades..." /> : null}

        <SelectField
          label="Especialidade"
          value={specialty}
          onValueChange={setSpecialty}
          options={specialtyOptions}
          placeholder="Selecione uma especialidade"
          enabled={specialtyOptions.length > 0}
        />

        {!normalizedSpecialty ? <Text style={styles.warningText}>Especialidade obrigatoria para salvar o perfil.</Text> : null}

        {specialty && !isSelectedSpecialtyValid ? (
          <Text style={styles.warningText}>A especialidade atual nao esta no dominio. Selecione uma opcao valida para salvar.</Text>
        ) : null}

        <Button
          title="Salvar especialidade"
          loading={saveSpecialty.isPending}
          disabled={specialtyOptions.length === 0}
          onPress={() => saveSpecialty.mutate()}
        />
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
  warningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
});
