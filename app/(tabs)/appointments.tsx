import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, differenceInMinutes, format } from "date-fns";
import React from "react";
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { SelectField } from "@/components/SelectField";
import { EmptyState, LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/providers/AuthProvider";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { Appointment, AppointmentStatus, AvailableSlot, ConsultationType, Patient, Room } from "@/types/api";
import { addMinutesToDate, createLocalDate, formatAppointmentRange, formatCpf, formatDateTime, formatTime, toDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/errors";

type FormMode = "create" | "edit";
type ScheduleMode = "by-room" | "by-time";
type ContractRecord = Record<string, unknown>;

const AUTO_SELECT_ROOM_ID = "AUTO_SELECT";
const AUTO_SELECT_GYNECOLOGY_ROOM_ID = "AUTO_SELECT_GYNECOLOGY";

const isAutoRotationRoomId = (value?: string | null) => value === AUTO_SELECT_ROOM_ID || value === AUTO_SELECT_GYNECOLOGY_ROOM_ID;

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

const statusOptions: { label: string; value?: AppointmentStatus }[] = [
  { label: "Todas" },
  { label: "Agendadas", value: "SCHEDULED" },
  { label: "Concluidas", value: "COMPLETED" },
  { label: "Canceladas", value: "CANCELED" },
];

const timeOptions = Array.from({ length: 40 }, (_, index) => {
  const hour = 8 + Math.floor((index * 15) / 60);
  const minute = (index * 15) % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export default function AppointmentsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const [status, setStatus] = React.useState<AppointmentStatus | undefined>("SCHEDULED");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<FormMode>("create");
  const [scheduleMode, setScheduleMode] = React.useState<ScheduleMode>("by-room");
  const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);

  const [title, setTitle] = React.useState("Consulta");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(format(addMinutes(new Date(), 24 * 60), "yyyy-MM-dd"));
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState(30);
  const [roomId, setRoomId] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [withoutPatient, setWithoutPatient] = React.useState(false);
  const [needsAutoRoomRevalidation, setNeedsAutoRoomRevalidation] = React.useState(false);

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments(status),
    queryFn: () => trpcClient.appointment.getUserAppointments.query({ status }) as Promise<Appointment[]>,
  });

  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: () => trpcClient.room.getAllRooms.query() as Promise<Room[]>,
  });

  const patientsQuery = useQuery({
    queryKey: queryKeys.patients(""),
    queryFn: () => trpcClient.patient.list.query({}) as Promise<Patient[]>,
  });

  const consultationTypesQuery = useQuery({
    queryKey: queryKeys.consultationTypes,
    queryFn: () => trpcClient.settings.getConsultationTypes.query() as Promise<ConsultationType[]>,
  });

  const contractsQuery = useQuery({
    queryKey: queryKeys.contracts(20, 0),
    enabled: modalOpen,
    queryFn: () =>
      trpcClient.contract.getContracts.query({
        limit: 20,
        offset: 0,
      }) as Promise<{ data?: unknown }>,
  });

  const slotsQuery = useQuery({
    queryKey: queryKeys.slots(date, roomId, duration),
    enabled: modalOpen && scheduleMode === "by-room" && Boolean(roomId) && duration > 0,
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
    enabled: modalOpen && scheduleMode === "by-time" && Boolean(time) && duration > 0,
    queryFn: () =>
      trpcClient.appointment.getAvailableRoomsForTime.query({
        date: createLocalDate(date),
        time,
        duration,
        excludeAppointmentId: editingAppointment?.id,
      }) as Promise<Room[]>,
  });

  const invalidateAppointments = () => queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const isCreating = formMode === "create";
  const isGynecologyDoctor = isGynecologySpecialty(user?.specialty);
  const isGoldPlan = React.useMemo(() => hasGoldPlan(contractsQuery.data?.data), [contractsQuery.data?.data]);
  const isNonGoldPlan = !contractsQuery.isLoading && !isGoldPlan;
  const canSelectRoom = !isNonGoldPlan;
  const isRoomLockedOnEdit = formMode === "edit" && isNonGoldPlan;
  const shouldForceByTimeOnEdit = formMode === "edit" && isNonGoldPlan;
  const shouldUseAutoRotationOnEdit = formMode === "edit" && isNonGoldPlan;
  const shouldFilterGynecologyRooms = isCreating && isGoldPlan && !isGynecologyDoctor;

  const rooms = roomsQuery.data ?? [];
  const selectableRooms = React.useMemo(
    () => (shouldFilterGynecologyRooms ? rooms.filter((room) => !isRoomGynecology(room)) : rooms),
    [rooms, shouldFilterGynecologyRooms],
  );

  const roomsForTime = roomsForTimeQuery.data ?? [];
  const selectableRoomsForTime = React.useMemo(
    () => (shouldFilterGynecologyRooms ? roomsForTime.filter((room) => !isRoomGynecology(room)) : roomsForTime),
    [roomsForTime, shouldFilterGynecologyRooms],
  );
  const gynecologyRoomsForTime = React.useMemo(
    () => roomsForTime.filter((room) => isRoomGynecology(room)),
    [roomsForTime],
  );
  const selectedAutoRoomCandidateId = React.useMemo(() => {
    if (roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID) {
      return gynecologyRoomsForTime[0]?.id;
    }

    if (roomId === AUTO_SELECT_ROOM_ID) {
      const regularRoom = selectableRoomsForTime.find((room) => !isRoomGynecology(room));
      return regularRoom?.id;
    }

    return undefined;
  }, [gynecologyRoomsForTime, roomId, selectableRoomsForTime]);
  const shouldShowGynecologyAutoRotation = isNonGoldPlan && isGynecologyDoctor;
  const canPickGynecologyAutoRotation = !time || roomsForTimeQuery.isFetching || gynecologyRoomsForTime.length > 0;
  const shouldUseAutoRotationSelection = (isCreating && !canSelectRoom) || shouldUseAutoRotationOnEdit;

  React.useEffect(() => {
    if (isCreating && !canSelectRoom && scheduleMode === "by-room") {
      setScheduleMode("by-time");
      setRoomId("");
      setTime("");
    }
  }, [canSelectRoom, isCreating, scheduleMode]);

  React.useEffect(() => {
    if (isRoomLockedOnEdit && !shouldForceByTimeOnEdit && scheduleMode !== "by-room") {
      setScheduleMode("by-room");
    }
  }, [isRoomLockedOnEdit, scheduleMode, shouldForceByTimeOnEdit]);

  React.useEffect(() => {
    if (shouldForceByTimeOnEdit && scheduleMode !== "by-time") {
      setScheduleMode("by-time");
    }
  }, [scheduleMode, shouldForceByTimeOnEdit]);

  React.useEffect(() => {
    if (!editingAppointment || !isRoomLockedOnEdit || shouldUseAutoRotationOnEdit) {
      return;
    }

    if (roomId !== editingAppointment.roomId) {
      setRoomId(editingAppointment.roomId);
    }
  }, [editingAppointment, isRoomLockedOnEdit, roomId, shouldUseAutoRotationOnEdit]);

  React.useEffect(() => {
    if (!shouldUseAutoRotationOnEdit) {
      return;
    }

    if (roomId && !isAutoRotationRoomId(roomId)) {
      setRoomId("");
      setNeedsAutoRoomRevalidation(true);
    }
  }, [roomId, shouldUseAutoRotationOnEdit]);

  React.useEffect(() => {
    if (!roomId) {
      return;
    }

    if (isCreating && canSelectRoom && !selectableRooms.some((room) => room.id === roomId)) {
      setRoomId("");
    }
  }, [canSelectRoom, isCreating, roomId, selectableRooms]);

  const createAppointment = useMutation({
    mutationFn: () => {
      const startTime = createLocalDate(date, time);
      return trpcClient.appointment.createAppointment.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime: addMinutesToDate(startTime, duration),
        roomId,
        patientId: withoutPatient ? undefined : patientId,
        withoutPatient,
      });
    },
    onSuccess: () => {
      void invalidateAppointments();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao criar agendamento", getErrorMessage(error)),
  });

  const updateAppointment = useMutation({
    mutationFn: () => {
      if (!editingAppointment) throw new Error("Agendamento nao selecionado.");
      const startTime = createLocalDate(date, time);
      const resolvedRoomId = isAutoRotationRoomId(roomId) ? selectedAutoRoomCandidateId : roomId;
      if (!resolvedRoomId) {
        throw new Error("Nao ha sala disponivel para o rotativo neste horario.");
      }

      return trpcClient.appointment.updateAppointment.mutate({
        id: editingAppointment.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime: addMinutesToDate(startTime, duration),
        roomId: resolvedRoomId,
        patientId: withoutPatient ? undefined : patientId,
      });
    },
    onSuccess: () => {
      void invalidateAppointments();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao atualizar agendamento", getErrorMessage(error)),
  });

  const cancelAppointment = useMutation({
    mutationFn: (id: string) => trpcClient.appointment.cancelAppointment.mutate({ id }),
    onSuccess: () => {
      void invalidateAppointments();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao cancelar", getErrorMessage(error)),
  });

  const resetForm = () => {
    setTitle("Consulta");
    setDescription("");
    setDate(format(addMinutes(new Date(), 24 * 60), "yyyy-MM-dd"));
    setTime("");
    setDuration(30);
    setRoomId("");
    setPatientId("");
    setWithoutPatient(false);
    setScheduleMode("by-room");
    setEditingAppointment(null);
    setNeedsAutoRoomRevalidation(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setFormMode("create");
    setModalOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    const start = toDate(appointment.startTime);
    const end = toDate(appointment.endTime);
    setFormMode("edit");
    setEditingAppointment(appointment);
    setTitle(appointment.title);
    setDescription(appointment.description ?? "");
    setDate(format(start, "yyyy-MM-dd"));
    setTime(format(start, "HH:mm"));
    setDuration(differenceInMinutes(end, start));
    setRoomId(appointment.roomId);
    setPatientId(appointment.patientId ?? "");
    setWithoutPatient(!appointment.patientId);
    setScheduleMode(isAutoRotationRoomId(appointment.roomId) ? "by-time" : "by-room");
    setNeedsAutoRoomRevalidation(false);
    setModalOpen(true);
  };

  const setMode = (mode: ScheduleMode) => {
    if (shouldForceByTimeOnEdit && mode !== "by-time") {
      Alert.alert("Modo por horario", "Na edicao deste plano a consulta deve permanecer no modo por horario.");
      return;
    }

    if (isRoomLockedOnEdit && mode === "by-room") {
      Alert.alert("Sala bloqueada", "Sem plano nao e permitido editar a sala da consulta.");
      return;
    }

    if (isCreating && mode === "by-room" && isNonGoldPlan) {
      Alert.alert("Plano sem selecao de sala", "Sem plano a sala e definida automaticamente pelo sistema.");
      return;
    }

    setScheduleMode(mode);
    setRoomId("");
    setTime("");
  };

  const chooseAutoRoom = (autoRoomId: string) => {
    if (autoRoomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && !canPickGynecologyAutoRotation) {
      return;
    }

    if (shouldUseAutoRotationOnEdit && roomsForTimeQuery.isFetching) {
      return;
    }

    setRoomId(autoRoomId);
    setNeedsAutoRoomRevalidation(false);
  };

  const canSubmit =
    title.trim() &&
    date &&
    time &&
    duration >= 30 &&
    duration <= 120 &&
    roomId &&
    (withoutPatient || patientId) &&
    (!shouldUseAutoRotationOnEdit || (!needsAutoRoomRevalidation && isAutoRotationRoomId(roomId) && Boolean(selectedAutoRoomCandidateId)));

  const submit = () => {
    if (!canSubmit) {
      Alert.alert("Campos obrigatorios", "Preencha titulo, data, horario, duracao, sala e paciente.");
      return;
    }
    if (shouldUseAutoRotationOnEdit && needsAutoRoomRevalidation) {
      Alert.alert("Verifique a disponibilidade", "Ao alterar a data, confirme novamente o modo rotativo para validar a disponibilidade.");
      return;
    }
    if (shouldUseAutoRotationOnEdit && isAutoRotationRoomId(roomId) && !selectedAutoRoomCandidateId) {
      Alert.alert("Sem disponibilidade", "Nao ha sala disponivel para o rotativo no horario selecionado.");
      return;
    }
    if (formMode === "create" && createLocalDate(date) < today) {
      Alert.alert("Data invalida", "Nao e permitido criar agendamento com data anterior a hoje.");
      return;
    }
    if (formMode === "edit") updateAppointment.mutate();
    else createAppointment.mutate();
  };

  const confirmCancel = () => {
    if (!editingAppointment) return;
    Alert.alert("Cancelar agendamento", "Deseja cancelar este agendamento?", [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar agendamento", style: "destructive", onPress: () => cancelAppointment.mutate(editingAppointment.id) },
    ]);
  };

  const appointments = appointmentsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const consultationTypes = consultationTypesQuery.data ?? [];
  const showTopCreateButton = !appointmentsQuery.isLoading && appointments.length > 0;

  return (
    <Screen>
      <Header title="Agenda" subtitle="Consulte, crie e reprograme seus agendamentos." />
      <View style={styles.filters}>
        {statusOptions.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => setStatus(option.value)}
            style={[styles.chip, status === option.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, status === option.value && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {showTopCreateButton ? <Button title="Novo agendamento" onPress={openCreate} /> : null}

      {appointmentsQuery.isLoading ? <LoadingState label="Carregando agendamentos..." /> : null}
      {!appointmentsQuery.isLoading && appointments.length === 0 ? (
        <EmptyState title="Nenhum agendamento encontrado" description="Crie um novo agendamento quando houver horario disponivel." onAction={openCreate} actionLabel="Novo agendamento" />
      ) : null}

      <View style={styles.list}>
        {appointments.map((appointment) => (
          <Pressable key={appointment.id} onPress={() => openEdit(appointment)}>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.appointmentTitle}>{appointment.title}</Text>
                <StatusPill status={appointment.status} />
              </View>
              <Text style={styles.detail}>{formatAppointmentRange(appointment.startTime, appointment.endTime)}</Text>
              <Text style={styles.detail}>Sala {appointment.room?.name ?? appointment.roomId}</Text>
              <Text style={styles.detail}>Paciente {appointment.patient?.name ?? "Sem paciente"}</Text>
              <Text style={styles.conexa}>Conexa check-in: {appointment.conexaCheckInStatus ?? "Nao informado"}</Text>
              {appointment.conexaCheckInAt ? <Text style={styles.detail}>Check-in em {formatDateTime(appointment.conexaCheckInAt)}</Text> : null}
              {appointment.conexaCheckInError ? <Text style={styles.error}>Erro Conexa: {appointment.conexaCheckInError}</Text> : null}
            </Card>
          </Pressable>
        ))}
      </View>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <Screen>
          <Header title={formMode === "edit" ? "Editar agendamento" : "Novo agendamento"} />
          <Card>
            <View style={styles.form}>
              <TextField label="Titulo" value={title} onChangeText={setTitle} />
              <TextField label="Descricao" value={description} onChangeText={setDescription} multiline />
              <DateTimeField
                label="Data"
                mode="date"
                value={date}
                onChange={(nextDate) => {
                  setDate(nextDate);
                  if (shouldUseAutoRotationOnEdit && nextDate !== date) {
                    setNeedsAutoRoomRevalidation(true);
                    setRoomId("");
                  }
                }}
                minimumDate={formMode === "create" ? today : undefined}
              />

              <View style={styles.segment}>
                <Button
                  title="Por sala"
                  variant={scheduleMode === "by-room" ? "primary" : "secondary"}
                  onPress={() => setMode("by-room")}
                  style={styles.segmentButton}
                  disabled={(isCreating && isNonGoldPlan) || isRoomLockedOnEdit || shouldForceByTimeOnEdit}
                />
                <Button
                  title="Por horario"
                  variant={scheduleMode === "by-time" ? "primary" : "secondary"}
                  onPress={() => setMode("by-time")}
                  style={styles.segmentButton}
                />
              </View>

              {shouldForceByTimeOnEdit ? (
                <View style={styles.planHint}>
                  <Text style={styles.planHintTitle}>Sem plano (edicao)</Text>
                  <Text style={styles.planHintText}>Use o modo por horario e selecione rotativo. A consulta permanece sempre por horario.</Text>
                </View>
              ) : null}

              {isCreating ? (
                <View style={styles.planHint}>
                  <Text style={styles.planHintTitle}>Plano detectado: {isGoldPlan ? "Gold" : "Sem plano"}</Text>
                  <Text style={styles.planHintText}>
                    {isGoldPlan
                      ? isGynecologyDoctor
                        ? "Ginecologia Gold: pode escolher qualquer sala."
                        : "Gold: escolha uma sala especifica, exceto salas de ginecologia."
                      : isGynecologyDoctor
                        ? "Sem plano Ginecologia: escolha rotativo comum ou rotativo de ginecologia."
                        : "Sem plano: sala definida automaticamente em rotativo comum."}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Tipo de consulta</Text>
              <View style={styles.optionGrid}>
                {consultationTypes.map((type) => (
                  <Pressable key={type.id} onPress={() => setDuration(Math.min(type.duration, 120))} style={[styles.option, duration === Math.min(type.duration, 120) && styles.optionActive]}>
                    <Text style={[styles.optionTitle, duration === Math.min(type.duration, 120) && styles.optionTitleActive]}>{type.name}</Text>
                    <Text style={styles.optionMeta}>{type.duration} min</Text>
                  </Pressable>
                ))}
              </View>

              {scheduleMode === "by-room" ? (
                <>
                  <Text style={styles.sectionTitle}>Sala</Text>
                  <View style={styles.optionGrid}>
                    {selectableRooms.map((room) => (
                      <Pressable
                        key={room.id}
                        onPress={() => {
                          if (isRoomLockedOnEdit) return;
                          setRoomId(room.id);
                        }}
                        style={[styles.option, roomId === room.id && styles.optionActive, isRoomLockedOnEdit && roomId !== room.id && styles.optionDisabled]}
                      >
                        <Text style={[styles.optionTitle, roomId === room.id && styles.optionTitleActive]}>{room.name}</Text>
                        <Text style={styles.optionMeta}>{room.specialties?.join(", ") || "Sem especialidade"}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {roomId ? (
                    <>
                      <Text style={styles.sectionTitle}>Horarios disponiveis</Text>
                      {slotsQuery.isFetching ? <LoadingState label="Buscando horarios..." /> : null}
                      {!slotsQuery.isFetching && (slotsQuery.data ?? []).length === 0 ? (
                        <Text style={styles.emptyHint}>Nao ha horarios disponiveis para esta data e sala.</Text>
                      ) : null}
                      {!slotsQuery.isFetching && (slotsQuery.data ?? []).length > 0 ? (
                        <SelectField
                          label="Horario"
                          value={time}
                          onValueChange={setTime}
                          placeholder="Selecione um horario"
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
                      if (shouldUseAutoRotationOnEdit) {
                        setNeedsAutoRoomRevalidation(true);
                        setRoomId("");
                      }
                      if (!isRoomLockedOnEdit) {
                        setRoomId("");
                      }
                    }}
                    placeholder="Selecione um horario"
                    options={timeOptions.map((item) => ({ label: item, value: item }))}
                  />
                  <Text style={styles.sectionTitle}>Salas disponiveis</Text>
                  {roomsForTimeQuery.isFetching ? <LoadingState label="Buscando salas..." /> : null}
                  {shouldUseAutoRotationSelection ? (
                    <View style={styles.optionGrid}>
                      {shouldShowGynecologyAutoRotation ? (
                        <>
                          <Pressable
                            onPress={() => {
                              if (!canPickGynecologyAutoRotation) return;
                              chooseAutoRoom(AUTO_SELECT_GYNECOLOGY_ROOM_ID);
                            }}
                            style={[styles.option, roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && styles.optionActive, !canPickGynecologyAutoRotation && styles.optionDisabled]}
                          >
                            <Text style={[styles.optionTitle, roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala de ginecologia</Text>
                            <Text style={styles.optionMeta}>
                              {!time
                                ? "Selecione um horario para validar disponibilidade"
                                : roomsForTimeQuery.isFetching
                                  ? "Validando disponibilidade..."
                                  : gynecologyRoomsForTime.length > 0
                                    ? `${gynecologyRoomsForTime.length} sala(s) de ginecologia disponivel(is)`
                                    : "Sem sala de ginecologia disponivel neste horario"}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => chooseAutoRoom(AUTO_SELECT_ROOM_ID)} style={[styles.option, roomId === AUTO_SELECT_ROOM_ID && styles.optionActive]}>
                            <Text style={[styles.optionTitle, roomId === AUTO_SELECT_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala comum</Text>
                            <Text style={styles.optionMeta}>Usa salas convencionais no horario selecionado</Text>
                          </Pressable>
                          {!roomsForTimeQuery.isFetching && time && gynecologyRoomsForTime.length === 0 ? (
                            <Text style={styles.emptyHint}>Nenhuma sala de ginecologia disponivel neste horario. Voce ainda pode usar o rotativo comum.</Text>
                          ) : null}
                          {needsAutoRoomRevalidation ? <Text style={styles.emptyHint}>Confirme o rotativo novamente apos alterar data/horario.</Text> : null}
                        </>
                      ) : (
                        <>
                          <Pressable onPress={() => chooseAutoRoom(AUTO_SELECT_ROOM_ID)} style={[styles.option, roomId === AUTO_SELECT_ROOM_ID && styles.optionActive]}>
                            <Text style={[styles.optionTitle, roomId === AUTO_SELECT_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala comum</Text>
                            <Text style={styles.optionMeta}>Sala definida automaticamente pelo sistema</Text>
                          </Pressable>
                          {needsAutoRoomRevalidation ? <Text style={styles.emptyHint}>Confirme o rotativo novamente apos alterar data/horario.</Text> : null}
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={styles.optionGrid}>
                      {selectableRoomsForTime.map((room) => (
                        <Pressable
                          key={room.id}
                          onPress={() => {
                            if (isRoomLockedOnEdit) return;
                            setRoomId(room.id);
                          }}
                          style={[styles.option, roomId === room.id && styles.optionActive, isRoomLockedOnEdit && roomId !== room.id && styles.optionDisabled]}
                        >
                          <Text style={[styles.optionTitle, roomId === room.id && styles.optionTitleActive]}>{room.name}</Text>
                          <Text style={styles.optionMeta}>{room.specialties?.join(", ") || "Sem especialidade"}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.sectionTitle}>Agendar sem paciente</Text>
                  <Text style={styles.detail}>Use somente quando o backend permitir esse fluxo.</Text>
                </View>
                <Switch value={withoutPatient} onValueChange={setWithoutPatient} />
              </View>

              {!withoutPatient ? (
                <>
                  <Text style={styles.sectionTitle}>Paciente</Text>
                  {patientsQuery.isLoading ? <LoadingState label="Carregando pacientes..." /> : null}
                  {patientsQuery.isError ? <Text style={styles.emptyHint}>Nao foi possivel carregar os pacientes. Tente novamente.</Text> : null}
                  {!patientsQuery.isLoading && !patientsQuery.isError && patients.length === 0 ? (
                    <Text style={styles.emptyHint}>Nenhum paciente cadastrado. Cadastre um paciente na aba Pacientes para concluir o agendamento.</Text>
                  ) : null}
                  {!patientsQuery.isLoading && !patientsQuery.isError && patients.length > 0 ? (
                    <View style={styles.optionGrid}>
                      {patients.map((patient) => (
                        <Pressable key={patient.id} onPress={() => setPatientId(patient.id)} style={[styles.option, patientId === patient.id && styles.optionActive]}>
                          <Text style={[styles.optionTitle, patientId === patient.id && styles.optionTitleActive]}>{patient.name}</Text>
                          <Text style={styles.optionMeta}>{formatCpf(patient.cpf)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              <Button title={formMode === "edit" ? "Atualizar agendamento" : "Criar agendamento"} loading={createAppointment.isPending || updateAppointment.isPending} onPress={submit} />
              {formMode === "edit" && editingAppointment?.status !== "CANCELED" ? (
                <Button title="Cancelar agendamento" variant="danger" loading={cancelAppointment.isPending} onPress={confirmCancel} />
              ) : null}
              <Button title="Fechar" variant="secondary" onPress={closeModal} />
            </View>
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const label = status === "SCHEDULED" ? "Agendada" : status === "COMPLETED" ? "Concluida" : "Cancelada";
  return (
    <View style={[styles.status, status === "CANCELED" && styles.statusDanger, status === "COMPLETED" && styles.statusSuccess]}>
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#fff",
  },
  list: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  appointmentTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  conexa: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  status: {
    backgroundColor: "#EEF4FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDanger: {
    backgroundColor: "#FEE2E2",
  },
  statusSuccess: {
    backgroundColor: "#DCFCE7",
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  form: {
    gap: 14,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
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
  optionDisabled: {
    opacity: 0.45,
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
  emptyHint: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  timeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
});
