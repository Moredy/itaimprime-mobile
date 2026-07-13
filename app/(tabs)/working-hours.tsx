import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { DoctorWorkingHoursDay } from "@/types/api";
import { getErrorMessage } from "@/utils/errors";

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export default function WorkingHoursScreen() {
  const queryClient = useQueryClient();
  const [workingHours, setWorkingHours] = React.useState<DoctorWorkingHoursDay[]>([]);

  const workingHoursQuery = useQuery({
    queryKey: queryKeys.doctorWorkingHours,
    queryFn: () => trpcClient.settings.getDoctorWorkingHours.query() as Promise<DoctorWorkingHoursDay[]>,
  });

  React.useEffect(() => {
    if (workingHoursQuery.data) {
      setWorkingHours(workingHoursQuery.data);
    }
  }, [workingHoursQuery.data]);

  const saveWorkingHours = useMutation({
    mutationFn: () =>
      trpcClient.settings.saveDoctorWorkingHours.mutate({
        days: workingHours.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isActive: day.isActive,
          intervals: day.isActive ? day.intervals.map((interval) => ({ startTime: interval.startTime, endTime: interval.endTime })) : [],
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.doctorWorkingHours });
    },
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

  return (
    <Screen>
      <AppTopBar />

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
  sectionTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    gap: 10,
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
  timeInput: {
    flex: 1,
  },
});
