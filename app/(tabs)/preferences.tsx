import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
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

export default function PreferencesScreen() {
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const [minimumAdvanceHours, setMinimumAdvanceHours] = React.useState("24");
  const [specialty, setSpecialty] = React.useState(user?.specialty ?? "");

  const specialtyOptionsQuery = useQuery({
    queryKey: queryKeys.specialtyOptions,
    queryFn: () => trpcClient.settings.getSpecialtyOptions.query() as Promise<Array<{ id: string; name: string }>>,
  });

  const userSettingsQuery = useQuery({
    queryKey: queryKeys.userSettings,
    queryFn: () => trpcClient.settings.getUserSettings.query() as Promise<{ minimumAdvanceHours: number }>,
  });

  React.useEffect(() => {
    if (userSettingsQuery.data) {
      setMinimumAdvanceHours(String(userSettingsQuery.data.minimumAdvanceHours));
    }
  }, [userSettingsQuery.data]);

  const minimumAdvanceHourOptions = React.useMemo(() => {
    const baseOptions = [1, 2, 4, 6, 8, 12, 24, 48, 72];
    const selectedValue = Number(minimumAdvanceHours);
    const options = Number.isFinite(selectedValue) && selectedValue > 0 ? Array.from(new Set([...baseOptions, selectedValue])).sort((a, b) => a - b) : baseOptions;

    return options.map((hours) => ({
      label: `${hours} hora${hours === 1 ? "" : "s"}`,
      value: String(hours),
    }));
  }, [minimumAdvanceHours]);

  const specialtyOptions = React.useMemo(
    () => (specialtyOptionsQuery.data ?? []).map((option) => ({ label: option.name, value: option.name })),
    [specialtyOptionsQuery.data],
  );

  const isSelectedSpecialtyValid = !specialty || specialtyOptions.some((option) => option.value === specialty);

  const savePreferences = useMutation({
    mutationFn: async () => {
      const parsedMinimumAdvanceHours = Number(minimumAdvanceHours);
      if (!Number.isFinite(parsedMinimumAdvanceHours) || parsedMinimumAdvanceHours < 1) {
        throw new Error("Selecione uma antecedencia minima valida.");
      }

      if (!isSelectedSpecialtyValid) {
        throw new Error("Selecione uma especialidade valida da lista.");
      }

      await Promise.all([
        trpcClient.settings.updateUserSettings.mutate({
          minimumAdvanceHours: parsedMinimumAdvanceHours,
        }),
        trpcClient.settings.updateSpecialty.mutate({ specialty: specialty || null }),
      ]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.specialtyOptions }),
      ]);
      await refreshSession();

      const message = "Preferencias salvas com sucesso.";
      if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert("Sucesso", message);
      }
    },
    onError: (error) => Alert.alert("Erro ao salvar preferencias", getErrorMessage(error)),
  });

  return (
    <Screen>
      <AppTopBar />

      <Card>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        {userSettingsQuery.isLoading || specialtyOptionsQuery.isLoading ? <LoadingState label="Carregando configuracoes..." /> : null}

        <SelectField
          label="Antecedencia minima (horas)"
          value={minimumAdvanceHours}
          onValueChange={setMinimumAdvanceHours}
          options={minimumAdvanceHourOptions}
          placeholder="Selecione a antecedencia"
        />

        <SelectField
          label="Especialidade"
          value={specialty}
          onValueChange={setSpecialty}
          options={specialtyOptions}
          placeholder="Sem especialidade"
          enabled={specialtyOptions.length > 0}
        />

        {specialty && !isSelectedSpecialtyValid ? (
          <Text style={styles.warningText}>A especialidade atual nao esta no dominio. Selecione uma opcao valida para salvar.</Text>
        ) : null}

        <Button title="Salvar preferencias" loading={savePreferences.isPending} onPress={() => savePreferences.mutate()} />
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
  warningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
});
