import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Header } from "@/components/Header";
import { SelectField } from "@/components/SelectField";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import type { ConsultationType, DoctorWorkingHoursDay } from "@/types/api";
import { getErrorMessage } from "@/utils/errors";

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { user, signOut, refreshSession } = useAuth();
  const [minimumAdvanceHours, setMinimumAdvanceHours] = React.useState("24");
  const [specialty, setSpecialty] = React.useState(user?.specialty ?? "");
  const [typeName, setTypeName] = React.useState("");
  const [typeDuration, setTypeDuration] = React.useState("30");
  const [workingHours, setWorkingHours] = React.useState<DoctorWorkingHoursDay[]>([]);

  const specialtyOptionsQuery = useQuery({
    queryKey: queryKeys.specialtyOptions,
    queryFn: () => trpcClient.settings.getSpecialtyOptions.query() as Promise<Array<{ id: string; name: string }>>,
  });

  const specialtyOptions = React.useMemo(
    () => (specialtyOptionsQuery.data ?? []).map((option) => ({ label: option.name, value: option.name })),
    [specialtyOptionsQuery.data],
  );

  const minimumAdvanceHourOptions = React.useMemo(() => {
    const baseOptions = [1, 2, 4, 6, 8, 12, 24, 48, 72];
    const selectedValue = Number(minimumAdvanceHours);
    const options = Number.isFinite(selectedValue) && selectedValue > 0 ? Array.from(new Set([...baseOptions, selectedValue])).sort((a, b) => a - b) : baseOptions;

    return options.map((hours) => ({
      label: `${hours} hora${hours === 1 ? "" : "s"}`,
      value: String(hours),
    }));
  }, [minimumAdvanceHours]);

  const consultationDurationOptions = React.useMemo(() => {
    const baseOptions = [15, 20, 30, 40, 45, 50, 60, 90, 120];
    const selectedValue = Number(typeDuration);
    const options = Number.isFinite(selectedValue) && selectedValue >= 15 ? Array.from(new Set([...baseOptions, selectedValue])).sort((a, b) => a - b) : baseOptions;

    return options.map((minutes) => ({
      label: `${minutes} min`,
      value: String(minutes),
    }));
  }, [typeDuration]);

  const isSelectedSpecialtyValid = !specialty || specialtyOptions.some((option) => option.value === specialty);

  const userSettingsQuery = useQuery({
    queryKey: queryKeys.userSettings,
    queryFn: () => trpcClient.settings.getUserSettings.query() as Promise<{ minimumAdvanceHours: number }>,
  });

  const consultationTypesQuery = useQuery({
    queryKey: queryKeys.consultationTypes,
    queryFn: () => trpcClient.settings.getConsultationTypes.query() as Promise<ConsultationType[]>,
  });

  const workingHoursQuery = useQuery({
    queryKey: queryKeys.doctorWorkingHours,
    queryFn: () => trpcClient.settings.getDoctorWorkingHours.query() as Promise<DoctorWorkingHoursDay[]>,
  });

  React.useEffect(() => {
    if (userSettingsQuery.data) {
      setMinimumAdvanceHours(String(userSettingsQuery.data.minimumAdvanceHours));
    }
  }, [userSettingsQuery.data]);

  React.useEffect(() => {
    if (workingHoursQuery.data) {
      setWorkingHours(workingHoursQuery.data);
    }
  }, [workingHoursQuery.data]);

  const invalidateSettings = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userSettings });
    void queryClient.invalidateQueries({ queryKey: queryKeys.consultationTypes });
    void queryClient.invalidateQueries({ queryKey: queryKeys.doctorWorkingHours });
  };

  const savePreferences = useMutation({
    mutationFn: async () => {
      if (!isSelectedSpecialtyValid) {
        throw new Error("Selecione uma especialidade valida da lista.");
      }

      const parsedMinimumAdvanceHours = Number(minimumAdvanceHours);
      if (!Number.isFinite(parsedMinimumAdvanceHours) || parsedMinimumAdvanceHours < 1) {
        throw new Error("Selecione uma antecedencia minima valida.");
      }

      await Promise.all([
        trpcClient.settings.updateUserSettings.mutate({
          minimumAdvanceHours: parsedMinimumAdvanceHours,
        }),
        trpcClient.settings.updateSpecialty.mutate({ specialty: specialty || null }),
      ]);
    },
    onSuccess: async () => {
      invalidateSettings();
      await refreshSession();
      const message = "Preferencias salvas com sucesso.";
      if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT);
        return;
      }
      Alert.alert("Sucesso", message);
    },
    onError: (error) => Alert.alert("Erro ao salvar preferencias", getErrorMessage(error)),
  });

  const createConsultationType = useMutation({
    mutationFn: () =>
      trpcClient.settings.createConsultationType.mutate({
        name: typeName.trim(),
        duration: Number(typeDuration),
      }),
    onSuccess: () => {
      setTypeName("");
      setTypeDuration("30");
      invalidateSettings();
    },
    onError: (error) => Alert.alert("Erro ao criar tipo", getErrorMessage(error)),
  });

  const deleteConsultationType = useMutation({
    mutationFn: (id: string) => trpcClient.settings.deleteConsultationType.mutate({ id }),
    onSuccess: invalidateSettings,
    onError: (error) => Alert.alert("Erro ao remover tipo", getErrorMessage(error)),
  });

  const saveWorkingHours = useMutation({
    mutationFn: () =>
      trpcClient.settings.saveDoctorWorkingHours.mutate({
        days: workingHours.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isActive: day.isActive,
          intervals: day.isActive ? day.intervals.map((interval) => ({ startTime: interval.startTime, endTime: interval.endTime })) : [],
        })),
      }),
    onSuccess: invalidateSettings,
    onError: (error) => Alert.alert("Erro ao salvar horarios", getErrorMessage(error)),
  });

  const toggleDay = (dayOfWeek: number) => {
    setWorkingHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              isActive: !day.isActive,
              intervals: day.intervals.length ? day.intervals : [{ startTime: "08:00", endTime: "18:00" }],
            }
          : day,
      ),
    );
  };

  const updateInterval = (dayOfWeek: number, key: "startTime" | "endTime", value: string) => {
    setWorkingHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              intervals: [{ startTime: day.intervals[0]?.startTime ?? "08:00", endTime: day.intervals[0]?.endTime ?? "18:00", [key]: value }],
            }
          : day,
      ),
    );
  };

  const removeType = (type: ConsultationType) => {
    Alert.alert("Remover tipo", `Deseja remover ${type.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteConsultationType.mutate(type.id) },
    ]);
  };

  return (
    <Screen>
      <Header title="Ajustes" subtitle="Configure somente dados do medico logado. Nao ha area administrativa no app." />
      <Card>
        <Text style={styles.userName}>{user?.name ?? "Medico"}</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        <Button title="Sair" variant="secondary" onPress={signOut} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <SelectField
          label="Antecedencia minima (horas)"
          value={minimumAdvanceHours}
          onValueChange={setMinimumAdvanceHours}
          options={minimumAdvanceHourOptions}
          placeholder="Selecione a antecedencia"
        />
        {specialtyOptionsQuery.isLoading ? <LoadingState label="Carregando especialidades..." /> : null}
        <SelectField
          label="Especialidade"
          value={specialty}
          onValueChange={setSpecialty}
          options={specialtyOptions}
          placeholder="Sem especialidade"
          enabled={specialtyOptions.length > 0}
        />
        {specialty && !isSelectedSpecialtyValid ? <Text style={styles.warningText}>A especialidade atual nao esta no dominio. Selecione uma opcao valida para salvar.</Text> : null}
        <Button title="Salvar preferencias" loading={savePreferences.isPending} onPress={() => savePreferences.mutate()} />
      </Card>

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

      <Card>
        <Text style={styles.sectionTitle}>Horarios de atendimento</Text>
        {workingHoursQuery.isLoading ? <LoadingState label="Carregando horarios..." /> : null}
        {workingHours.map((day) => {
          const interval = day.intervals[0] ?? { startTime: "08:00", endTime: "18:00" };
          return (
            <View key={day.dayOfWeek} style={styles.dayBlock}>
              <Pressable onPress={() => toggleDay(day.dayOfWeek)} style={[styles.dayHeader, day.isActive && styles.dayHeaderActive]}>
                <Text style={[styles.dayTitle, day.isActive && styles.dayTitleActive]}>{days[day.dayOfWeek]}</Text>
                <Text style={[styles.detail, day.isActive && styles.dayTitleActive]}>{day.isActive ? "Ativo" : "Inativo"}</Text>
              </Pressable>
              {day.isActive ? (
                <View style={styles.row}>
                  <View style={styles.timeInput}>
                    <DateTimeField label="Inicio" mode="time" value={interval.startTime} onChange={(value) => updateInterval(day.dayOfWeek, "startTime", value)} />
                  </View>
                  <View style={styles.timeInput}>
                    <DateTimeField label="Fim" mode="time" value={interval.endTime} onChange={(value) => updateInterval(day.dayOfWeek, "endTime", value)} />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        <Button title="Salvar horarios" loading={saveWorkingHours.isPending} onPress={() => saveWorkingHours.mutate()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  userName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    gap: 10,
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
  dayBlock: {
    gap: 8,
  },
  dayHeader: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayHeaderActive: {
    borderColor: colors.primaryLight,
    backgroundColor: "#EAF8FC",
  },
  dayTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  dayTitleActive: {
    color: colors.primaryLight,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
  timeInput: {
    flex: 1,
  },
});
