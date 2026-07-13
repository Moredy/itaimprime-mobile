import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { ConsultationType } from "@/types/api";
import { getErrorMessage } from "@/utils/errors";

export default function ConsultationTypesScreen() {
  const queryClient = useQueryClient();
  const [typeName, setTypeName] = React.useState("");
  const [typeDuration, setTypeDuration] = React.useState("30");

  const consultationTypesQuery = useQuery({
    queryKey: queryKeys.consultationTypes,
    queryFn: () => trpcClient.settings.getConsultationTypes.query() as Promise<ConsultationType[]>,
  });

  const consultationDurationOptions = React.useMemo(() => {
    const baseOptions = [15, 20, 30, 40, 45, 50, 60, 90, 120];
    const selectedValue = Number(typeDuration);
    const options = Number.isFinite(selectedValue) && selectedValue >= 15 ? Array.from(new Set([...baseOptions, selectedValue])).sort((a, b) => a - b) : baseOptions;

    return options.map((minutes) => ({
      label: `${minutes} min`,
      value: String(minutes),
    }));
  }, [typeDuration]);

  const invalidateTypes = () => queryClient.invalidateQueries({ queryKey: queryKeys.consultationTypes });

  const createConsultationType = useMutation({
    mutationFn: () =>
      trpcClient.settings.createConsultationType.mutate({
        name: typeName.trim(),
        duration: Number(typeDuration),
      }),
    onSuccess: () => {
      setTypeName("");
      setTypeDuration("30");
      void invalidateTypes();
    },
    onError: (error) => Alert.alert("Erro ao criar tipo", getErrorMessage(error)),
  });

  const deleteConsultationType = useMutation({
    mutationFn: (id: string) => trpcClient.settings.deleteConsultationType.mutate({ id }),
    onSuccess: () => {
      void invalidateTypes();
    },
    onError: (error) => Alert.alert("Erro ao remover tipo", getErrorMessage(error)),
  });

  const removeType = (type: ConsultationType) => {
    Alert.alert("Remover tipo", `Deseja remover ${type.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteConsultationType.mutate(type.id) },
    ]);
  };

  return (
    <Screen>
      <AppTopBar />

      <Card>
        <Text style={styles.sectionTitle}>Tipos de consulta</Text>

        {consultationTypesQuery.isLoading ? <LoadingState label="Carregando tipos..." /> : null}

        {(consultationTypesQuery.data ?? []).map((type) => (
          <Pressable key={type.id} onPress={() => removeType(type)} style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>{type.name}</Text>
              <Text style={styles.detail}>{type.duration} minutos</Text>
            </View>
            <Text style={styles.deleteText}>Remover</Text>
          </Pressable>
        ))}

        <TextField label="Nome do tipo" value={typeName} onChangeText={setTypeName} />
        <SelectField
          label="Duracao em minutos"
          value={typeDuration}
          onValueChange={setTypeDuration}
          options={consultationDurationOptions}
          placeholder="Selecione a duracao"
        />

        <Button
          title="Adicionar tipo"
          loading={createConsultationType.isPending}
          onPress={() => {
            if (!typeName.trim() || Number(typeDuration) < 15) {
              Alert.alert("Dados invalidos", "Informe nome e duracao minima de 15 minutos.");
              return;
            }
            createConsultationType.mutate();
          }}
        />
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
    fontSize: 13,
  },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "800",
  },
});
