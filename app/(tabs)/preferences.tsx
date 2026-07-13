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
  const { refreshSession } = useAuth();
  const [minimumAdvanceHours, setMinimumAdvanceHours] = React.useState("24");

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

  const savePreferences = useMutation({
    mutationFn: async () => {
      const parsedMinimumAdvanceHours = Number(minimumAdvanceHours);
      if (!Number.isFinite(parsedMinimumAdvanceHours) || parsedMinimumAdvanceHours < 1) {
        throw new Error("Selecione uma antecedencia minima valida.");
      }

      await trpcClient.settings.updateUserSettings.mutate({
        minimumAdvanceHours: parsedMinimumAdvanceHours,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userSettings }),
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
        {userSettingsQuery.isLoading ? <LoadingState label="Carregando configuracoes..." /> : null}

        <SelectField
          label="Antecedencia minima (horas)"
          value={minimumAdvanceHours}
          onValueChange={setMinimumAdvanceHours}
          options={minimumAdvanceHourOptions}
          placeholder="Selecione a antecedencia"
        />

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
});
