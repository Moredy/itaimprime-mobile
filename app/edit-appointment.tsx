import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { differenceInMinutes, format } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Screen } from "@/components/Screen";
import { SelectField } from "@/components/SelectField";
import { EmptyState, LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { Appointment, AvailableSlot, Patient, Room } from "@/types/api";
import { addMinutesToDate, createLocalDate, formatCpf, formatTime, toDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/errors";

type ScheduleMode = "by-room" | "by-time";
type ContractRecord = Record<string, unknown>;

const AUTO_SELECT_ROOM_ID = "AUTO_SELECT";
const AUTO_SELECT_GYNECOLOGY_ROOM_ID = "AUTO_SELECT_GYNECOLOGY";

const isAutoRotationRoomId = (value?: string | null) => value === AUTO_SELECT_ROOM_ID || value === AUTO_SELECT_GYNECOLOGY_ROOM_ID;
const isAppointmentEditable = (appointment: Appointment) => appointment.status === "SCHEDULED";

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isGynecologySpecialty = (value?: string | null) => {
  if (!value) return false;
  const normalized = normalizeText(value);
  return ["ginecologia", "gineco", "obstetricia", "go"].some((token) => normalized.includes(token));
};

const isRoomGynecology = (room: Room) => room.specialties.some((specialty) => isGynecologySpecialty(specialty));

const hasGoldPlan = (contracts: unknown): boolean => {
  if (!Array.isArray(contracts)) {
    return false;
  }

  return contracts.some((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const contract = item as ContractRecord;
    const isActive = typeof contract.isActive === "boolean" ? contract.isActive : true;
    const candidateNames = [contract.contractSummary, contract.planName, contract.name];

    return isActive && candidateNames.some((candidate) => typeof candidate === "string" && normalizeText(candidate).includes("gold"));
  });
};

const timeOptions = Array.from({ length: 40 }, (_, index) => {
  const hour = 8 + Math.floor((index * 15) / 60);
  const minute = (index * 15) % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

const durationOptions = Array.from({ length: 19 }, (_, index) => 30 + index * 5);

export default function EditAppointmentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const appointmentId = typeof params.appointmentId === "string" ? params.appointmentId : "";

  const [scheduleMode, setScheduleMode] = React.useState<ScheduleMode>("by-room");
  const [title, setTitle] = React.useState("Consulta");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState(30);
  const [roomId, setRoomId] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [withoutPatient, setWithoutPatient] = React.useState(false);
  const [initializedAppointmentId, setInitializedAppointmentId] = React.useState<string | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments(),
    queryFn: () => trpcClient.appointment.getUserAppointments.query({}) as Promise<Appointment[]>,
  });

  const editingAppointment = React.useMemo(
    () => (appointmentsQuery.data ?? []).find((appointment) => appointment.id === appointmentId) ?? null,
    [appointmentsQuery.data, appointmentId],
  );

  React.useEffect(() => {
    if (!editingAppointment || initializedAppointmentId === editingAppointment.id) {
      return;
    }

    const start = toDate(editingAppointment.startTime);
    const end = toDate(editingAppointment.endTime);
    setTitle(editingAppointment.title);
    setDescription(editingAppointment.description ?? "");
    setDate(format(start, "yyyy-MM-dd"));
    setTime(format(start, "HH:mm"));
    setDuration(differenceInMinutes(end, start));
    setRoomId(editingAppointment.roomId);
    setPatientId(editingAppointment.patientId ?? "");
    setWithoutPatient(!editingAppointment.patientId);
    setScheduleMode(isAutoRotationRoomId(editingAppointment.roomId) ? "by-time" : "by-room");
    setInitializedAppointmentId(editingAppointment.id);
  }, [editingAppointment, initializedAppointmentId]);

  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: () => trpcClient.room.getAllRooms.query() as Promise<Room[]>,
  });

  const patientsQuery = useQuery({
    queryKey: queryKeys.patients(""),
    queryFn: () => trpcClient.patient.list.query({}) as Promise<Patient[]>,
  });

  const contractsQuery = useQuery({
    queryKey: queryKeys.contracts(20, 0),
    queryFn: () =>
      trpcClient.contract.getContracts.query({
        limit: 20,
        offset: 0,
      }) as Promise<{ data?: unknown }>,
  });

  const slotsQuery = useQuery({
    queryKey: queryKeys.slots(date, roomId, duration),
    enabled: scheduleMode === "by-room" && Boolean(roomId) && duration > 0,
    queryFn: () =>
      trpcClient.appointment.getAvailableSlots.query({
        date: createLocalDate(date),
        roomId,
        duration,
        excludeAppointmentId: editingAppointment?.id,
      }) as Promise<AvailableSlot[]>,
  });

  const roomsForTimeQuery = useQuery({
    queryKey: queryKeys.roomsForTime(date, time, duration),
    enabled: scheduleMode === "by-time" && Boolean(time) && duration > 0,
    queryFn: () =>
      trpcClient.appointment.getAvailableRoomsForTime.query({
        date: createLocalDate(date),
        time,
        duration,
        excludeAppointmentId: editingAppointment?.id,
      }) as Promise<Room[]>,
  });

  const rooms = roomsQuery.data ?? [];
  const roomsForTime = roomsForTimeQuery.data ?? [];
  const patients = patientsQuery.data ?? [];

  const isGoldPlan = React.useMemo(() => hasGoldPlan(contractsQuery.data?.data), [contractsQuery.data?.data]);
  const isNonGoldPlan = !contractsQuery.isLoading && !isGoldPlan;
  const isRoomLockedOnEdit = isNonGoldPlan;
  const shouldShowAutoRotationSelection = !isNonGoldPlan;

  const selectedRoomForLockedEdit = React.useMemo(() => rooms.find((room) => room.id === roomId), [roomId, rooms]);
  const gynecologyRoomsForTime = React.useMemo(() => roomsForTime.filter((room) => isRoomGynecology(room)), [roomsForTime]);
  const selectedAutoRoomCandidateId = React.useMemo(() => {
    if (roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID) {
      return gynecologyRoomsForTime[0]?.id;
    }

    if (roomId === AUTO_SELECT_ROOM_ID) {
      return roomsForTime.find((room) => !isRoomGynecology(room))?.id ?? roomsForTime[0]?.id;
    }

    return undefined;
  }, [gynecologyRoomsForTime, roomId, roomsForTime]);

  React.useEffect(() => {
    if (isRoomLockedOnEdit && scheduleMode !== "by-room") {
      setScheduleMode("by-room");
    }
  }, [isRoomLockedOnEdit, scheduleMode]);

  React.useEffect(() => {
    if (!editingAppointment || !isRoomLockedOnEdit) {
      return;
    }

    if (roomId !== editingAppointment.roomId) {
      setRoomId(editingAppointment.roomId);
    }
  }, [editingAppointment, isRoomLockedOnEdit, roomId]);

  const updateAppointment = useMutation({
    mutationFn: () => {
      if (!editingAppointment) {
        throw new Error("Agendamento nao selecionado.");
      }

      const startTime = createLocalDate(date, time);
      const resolvedRoomId = isAutoRotationRoomId(roomId) ? selectedAutoRoomCandidateId : roomId;
      if (!resolvedRoomId) {
        throw new Error("Nao ha sala disponivel para o rotativo neste horario.");
      }

      return trpcClient.appointment.updateAppointment.mutate({
        id: editingAppointment.id,
        title: title.trim() || "Consulta",
        description: description.trim() || undefined,
        startTime,
        endTime: addMinutesToDate(startTime, duration),
        roomId: resolvedRoomId,
        patientId: withoutPatient ? undefined : patientId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.back();
    },
    onError: (error) => Alert.alert("Erro ao atualizar agendamento", getErrorMessage(error)),
  });

  const cancelAppointment = useMutation({
    mutationFn: (id: string) => trpcClient.appointment.cancelAppointment.mutate({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.back();
    },
    onError: (error) => Alert.alert("Erro ao cancelar", getErrorMessage(error)),
  });

  const setMode = (mode: ScheduleMode) => {
    if (isRoomLockedOnEdit && mode !== "by-room") {
      Alert.alert("Sala bloqueada", "Sem plano nao e permitido trocar a sala da consulta.");
      return;
    }

    setScheduleMode(mode);
    setRoomId("");
    setTime("");
  };

  const chooseAutoRoom = (autoRoomId: string) => {
    setRoomId(autoRoomId);
  };

  const canSubmit =
    date &&
    time &&
    duration >= 30 &&
    duration <= 120 &&
    roomId &&
    (withoutPatient || patientId) &&
    (!isAutoRotationRoomId(roomId) || Boolean(selectedAutoRoomCandidateId));

  const submit = () => {
    if (!editingAppointment || !isAppointmentEditable(editingAppointment)) {
      Alert.alert("Edicao indisponivel", "Somente agendamentos com status Agendada podem ser alterados.");
      return;
    }

    if (!canSubmit) {
      Alert.alert("Campos obrigatorios", "Preencha data, horario, duracao, sala e paciente.");
      return;
    }

    if (isAutoRotationRoomId(roomId) && !selectedAutoRoomCandidateId) {
      Alert.alert("Sem disponibilidade", "Nao ha sala disponivel para o rotativo no horario selecionado.");
      return;
    }

    updateAppointment.mutate();
  };

  const confirmCancel = () => {
    if (!editingAppointment || !isAppointmentEditable(editingAppointment)) {
      return;
    }

    Alert.alert("Cancelar agendamento", "Deseja cancelar este agendamento?", [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar agendamento", style: "destructive", onPress: () => cancelAppointment.mutate(editingAppointment.id) },
    ]);
  };

  const selectedPatient = patients.find((patient) => patient.id === patientId);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.page}>
          <View style={styles.createHeaderRow}>
            <View style={styles.createHeaderLeft}>
              <Pressable onPress={() => router.back()} style={styles.createHeaderBackButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.createHeaderTitle}>AGENDAMENTO</Text>
            </View>
            <View style={styles.createHeaderAction} />
          </View>

          {!appointmentId ? (
            <EmptyState
              title="Agendamento nao encontrado"
              description="Nao foi possivel abrir a edicao porque o identificador nao foi informado."
              actionLabel="Voltar"
              onAction={() => router.back()}
            />
          ) : null}

          {appointmentId && appointmentsQuery.isLoading ? <LoadingState label="Carregando agendamento..." /> : null}

          {appointmentId && !appointmentsQuery.isLoading && !editingAppointment ? (
            <EmptyState
              title="Agendamento nao encontrado"
              description="Esse agendamento pode ter sido alterado ou removido."
              actionLabel="Voltar"
              onAction={() => router.back()}
            />
          ) : null}

          {editingAppointment ? (
            <>
              <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <Card>
                  <View style={styles.form}>

                    <DateTimeField label="Data" mode="date" value={date} onChange={setDate} />

                    <View style={styles.segment}>
                      <Button
                        title="Por sala"
                        variant={scheduleMode === "by-room" ? "primary" : "secondary"}
                        onPress={() => setMode("by-room")}
                        style={styles.segmentButton}
                      />
                      <Button
                        title="Por horario"
                        variant={scheduleMode === "by-time" ? "primary" : "secondary"}
                        onPress={() => setMode("by-time")}
                        style={styles.segmentButton}
                        disabled={isRoomLockedOnEdit}
                      />
                    </View>




                    {scheduleMode === "by-room" ? (
                      <>
                        <Text style={styles.sectionTitle}>Sala</Text>
                        <View style={styles.optionGrid}>
                          {isRoomLockedOnEdit ? (
                            roomId ? (
                              <Pressable style={[styles.option, styles.optionActive]}>
                                <Text style={[styles.optionTitle, styles.optionTitleActive]}>{selectedRoomForLockedEdit?.name ?? `Sala ${roomId}`}</Text>
                                <Text style={styles.optionMeta}>{selectedRoomForLockedEdit?.description?.trim() || "Sala bloqueada para edicao"}</Text>
                              </Pressable>
                            ) : (
                              <Text style={styles.emptyHint}>Nenhuma sala selecionada para esta consulta.</Text>
                            )
                          ) : (
                            rooms.map((room) => (
                              <Pressable key={room.id} onPress={() => setRoomId(room.id)} style={[styles.option, roomId === room.id && styles.optionActive]}>
                                <Text style={[styles.optionTitle, roomId === room.id && styles.optionTitleActive]}>{room.name}</Text>
                                <Text style={styles.optionMeta}>{room.description?.trim() || "Sem descricao"}</Text>
                              </Pressable>
                            ))
                          )}
                        </View>

                        {roomId ? (
                          <>
                            {!slotsQuery.isFetching && (slotsQuery.data ?? []).length === 0 ? (
                              <Text style={styles.sectionTitle}>Horários disponíveis</Text>) : null}
                            {slotsQuery.isFetching ? <LoadingState label="Buscando horários..." /> : null}
                            {!slotsQuery.isFetching && (slotsQuery.data ?? []).length === 0 ? (
                              <Text style={styles.emptyHint}>Não há horários disponíveis para esta data e sala.</Text>
                            ) : null}
                            {!slotsQuery.isFetching && (slotsQuery.data ?? []).length > 0 ? (
                              <SelectField
                                label="Horários disponíveis"
                                value={time}
                                onValueChange={setTime}
                                placeholder="Selecione um horário"
                                options={(slotsQuery.data ?? []).map((slot) => {
                                  const start = formatTime(slot.startTime);
                                  return {
                                    label: slot.formatted || start,
                                    value: start,
                                  };
                                })}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <SelectField
                          label="Horario"
                          value={time}
                          onValueChange={(selectedTime) => {
                            setTime(selectedTime);
                            if (!isRoomLockedOnEdit) {
                              setRoomId("");
                            }
                          }}
                          placeholder="Selecione um horario"
                          options={timeOptions.map((item) => ({ label: item, value: item }))}
                        />

                        <Text style={styles.sectionTitle}>Salas disponiveis</Text>
                        {roomsForTimeQuery.isFetching ? <LoadingState label="Buscando salas..." /> : null}

                        {shouldShowAutoRotationSelection ? (
                          <View style={styles.optionGrid}>
                            <Pressable onPress={() => chooseAutoRoom(AUTO_SELECT_ROOM_ID)} style={[styles.option, roomId === AUTO_SELECT_ROOM_ID && styles.optionActive]}>
                              <Text style={[styles.optionTitle, roomId === AUTO_SELECT_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala comum</Text>
                              <Text style={styles.optionMeta}>Usa salas convencionais no horario selecionado.</Text>
                            </Pressable>
                          </View>
                        ) : null}

                        <View style={styles.optionGrid}>
                          {roomsForTime.map((room) => (
                            <Pressable key={room.id} onPress={() => setRoomId(room.id)} style={[styles.option, roomId === room.id && styles.optionActive]}>
                              <Text style={[styles.optionTitle, roomId === room.id && styles.optionTitleActive]}>{room.name}</Text>
                              <Text style={styles.optionMeta}>{room.description?.trim() || "Sem descricao"}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}


                    <SelectField
                      label="Tempo da consulta"
                      value={String(duration)}
                      onValueChange={(selectedDuration) => {
                        const parsedDuration = Number(selectedDuration);
                        if (Number.isNaN(parsedDuration)) {
                          return;
                        }

                        setDuration(parsedDuration);
                      }}
                      placeholder="Selecione a duracao"
                      options={durationOptions.map((optionDuration) => ({
                        label: `${optionDuration} min`,
                        value: String(optionDuration),
                      }))}
                    />

                    {selectedPatient ? <Text style={styles.detail}>Paciente selecionado: {selectedPatient.name}</Text> : null}
                    <View style={styles.sectionDivider} />
                    <TextField label="Titulo (opcional)" value={title} onChangeText={setTitle} />
                    <TextField label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline />
                    <View style={styles.sectionDivider} />
                    {editingAppointment.status !== "CANCELED" ? (
                      <Pressable onPress={confirmCancel} disabled={cancelAppointment.isPending} style={styles.cancelTextAction}>

                        <Text style={[styles.cancelText, cancelAppointment.isPending && styles.cancelTextDisabled]}>
                          {cancelAppointment.isPending ? "Cancelando..." : "Cancelar agendamento"}
                        </Text>
                      </Pressable>
                    ) : null}

                  </View>
                </Card>
              </ScrollView>

              <View style={styles.footerFixed}>
                <View style={styles.createProgressTrack}>
                  <View style={[styles.createProgressFill, { width: "100%" }]} />
                </View>
                <Button
                  title="Salvar"
                  loading={updateAppointment.isPending}
                  onPress={submit}
                  disabled={!isAppointmentEditable(editingAppointment)}
                  style={styles.createPrimaryButton}
                />
              </View>
            </>
          ) : null}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 12,
  },
  createHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  createHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createHeaderBackButton: {
    minHeight: 32,
    justifyContent: "center",
  },
  createHeaderAction: {
    minWidth: 72,
    minHeight: 32,
    justifyContent: "center",
  },
  createHeaderTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "500",
  },
  form: {
    gap: 14,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
  },
  planHint: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EEF4FF",
    padding: 12,
    gap: 4,
  },
  planHintTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  planHintText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  optionGrid: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  optionActive: {
    borderColor: colors.primaryLight,
    backgroundColor: "#EAF8FC",
  },
  optionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  optionTitleActive: {
    color: colors.primaryLight,
  },
  optionMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  sectionDivider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchText: {
    flex: 1,
  },
  cancelTextAction: {
    alignSelf: "flex-start",

    paddingVertical: 6,
  },
  cancelText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  cancelTextDisabled: {
    opacity: 0.6,
  },
  footerFixed: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  createProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E6E6E6",
    overflow: "hidden",
  },
  createProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  createPrimaryButton: {
    borderRadius: 12,
    minHeight: 56,
  },
});