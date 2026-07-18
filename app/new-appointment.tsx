import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { format } from "date-fns";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import type { Patient, Room } from "@/types/api";
import { addMinutesToDate, createLocalDate, formatCpf, formatPhone, onlyDigits } from "@/utils/format";
import { getErrorMessage } from "@/utils/errors";

type CreateStep = 1 | 2 | 3 | 4;
type RoomSelectionMode = "rotative" | "specific";
type ContractRecord = Record<string, unknown>;
type InlinePatientErrors = {
  name?: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
};

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
  if (!Array.isArray(contracts)) return false;

  return contracts.some((item) => {
    if (!item || typeof item !== "object") return false;
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

const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

LocaleConfig.locales["pt-br"] = {
  monthNames: ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  dayNames: ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"],
  dayNamesShort: ["D", "S", "T", "Q", "Q", "S", "S"],
  today: "Hoje",
};
LocaleConfig.defaultLocale = "pt-br";

export default function NewAppointmentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const today = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const birthDateDefault = React.useMemo(() => {
    const baseDate = new Date();
    baseDate.setFullYear(baseDate.getFullYear() - 30);
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }, []);

  const [createStep, setCreateStep] = React.useState<CreateStep>(1);
  const [roomSelectionMode, setRoomSelectionMode] = React.useState<RoomSelectionMode>("rotative");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState(30);
  const [roomId, setRoomId] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [withoutPatient, setWithoutPatient] = React.useState(true);
  const [showInlinePatientForm, setShowInlinePatientForm] = React.useState(false);
  const [inlinePatientName, setInlinePatientName] = React.useState("");
  const [inlinePatientCpf, setInlinePatientCpf] = React.useState("");
  const [inlinePatientBirthDate, setInlinePatientBirthDate] = React.useState("");
  const [inlinePatientPhone, setInlinePatientPhone] = React.useState("");
  const [inlinePatientErrors, setInlinePatientErrors] = React.useState<InlinePatientErrors>({});

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

  const roomsForTimeQuery = useQuery({
    queryKey: queryKeys.roomsForTime(date, time, duration),
    enabled: Boolean(time) && duration > 0,
    queryFn: () =>
      trpcClient.appointment.getAvailableRoomsForTime.query({
        date: createLocalDate(date),
        time,
        duration,
      }) as Promise<Room[]>,
  });

  const availableTimesQuery = useQuery({
    queryKey: ["available-times", date, duration],
    enabled: Boolean(date) && duration > 0,
    queryFn: async () => {
      const workStartMinutes = 8 * 60;
      const workEndMinutes = 18 * 60;
      const validTimeOptions = timeOptions.filter((option) => {
        const startMinutes = toMinutes(option);
        const endMinutes = startMinutes + duration;
        return startMinutes >= workStartMinutes && endMinutes <= workEndMinutes;
      });

      const checks = await Promise.all(
        validTimeOptions.map(async (option) => {
          try {
            const rooms = (await trpcClient.appointment.getAvailableRoomsForTime.query({
              date: createLocalDate(date),
              time: option,
              duration,
            })) as Room[];

            return rooms.length > 0 ? option : null;
          } catch {
            return null;
          }
        }),
      );

      return checks.filter((option): option is string => Boolean(option));
    },
  });

  const createAppointment = useMutation({
    mutationFn: ({ overridePatientId }: { overridePatientId?: string } = {}) => {
      const startTime = createLocalDate(date, time);
      const resolvedRoomId = isAutoRotationRoomId(roomId)
        ? roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID
          ? gynecologyRoomsForTime[0]?.id
          : selectableRoomsForTime.find((room) => !isRoomGynecology(room))?.id
        : roomId;

      if (!resolvedRoomId) {
        throw new Error("Nao ha sala disponivel para o rotativo neste horario.");
      }

      return trpcClient.appointment.createAppointment.mutate({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        startTime,
        endTime: addMinutesToDate(startTime, duration),
        roomId: resolvedRoomId,
        patientId: withoutPatient ? undefined : overridePatientId ?? patientId,
        withoutPatient,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms-for-time"] }),
        queryClient.invalidateQueries({ queryKey: ["available-times"] }),
      ]);
      queryClient.removeQueries({ queryKey: ["rooms-for-time"] });
      queryClient.removeQueries({ queryKey: ["available-times"] });
      router.back();
    },
    onError: (error) => Alert.alert("Erro ao criar agendamento", getErrorMessage(error)),
  });

  const resetInlinePatientForm = () => {
    setInlinePatientName("");
    setInlinePatientCpf("");
    setInlinePatientBirthDate("");
    setInlinePatientPhone("");
    setInlinePatientErrors({});
  };

  const createInlinePatient = useMutation({
    mutationFn: () =>
      trpcClient.patient.create.mutate({
        name: inlinePatientName.trim(),
        cpf: onlyDigits(inlinePatientCpf),
        birthDate: new Date(`${inlinePatientBirthDate}T00:00:00`),
        phone: onlyDigits(inlinePatientPhone),
      }) as Promise<Patient>,
    onError: (error) => Alert.alert("Erro ao cadastrar paciente", getErrorMessage(error)),
  });

  const patients = patientsQuery.data ?? [];
  const isGynecologyDoctor = isGynecologySpecialty(user?.specialty);
  const isGoldPlan = React.useMemo(() => hasGoldPlan(contractsQuery.data?.data), [contractsQuery.data?.data]);
  const isNonGoldPlan = !contractsQuery.isLoading && !isGoldPlan;
  const canSelectRoom = !isNonGoldPlan;

  const roomsForTime = roomsForTimeQuery.data ?? [];
  const selectableRoomsForTime = React.useMemo(
    () => (isGoldPlan && !isGynecologyDoctor ? roomsForTime.filter((room) => !isRoomGynecology(room)) : roomsForTime),
    [roomsForTime, isGoldPlan, isGynecologyDoctor],
  );
  const gynecologyRoomsForTime = React.useMemo(() => roomsForTime.filter((room) => isRoomGynecology(room)), [roomsForTime]);

  React.useEffect(() => {
    if (!canSelectRoom) {
      setRoomSelectionMode("rotative");
      if (!roomId || !isAutoRotationRoomId(roomId)) {
        setRoomId(isGynecologyDoctor ? AUTO_SELECT_GYNECOLOGY_ROOM_ID : AUTO_SELECT_ROOM_ID);
      }
    }
  }, [canSelectRoom, isGynecologyDoctor, roomId]);

  const canGoNextStep =
    (createStep === 1 && duration >= 30) ||
    (createStep === 2 && Boolean(date) && Boolean(time)) ||
    (createStep === 3 && Boolean(roomId)) ||
    createStep === 4;

  const canCreateWithInlinePatient = !withoutPatient && showInlinePatientForm;

  const canSubmit =
    date &&
    time &&
    duration >= 30 &&
    duration <= 120 &&
    roomId &&
    (withoutPatient || patientId || canCreateWithInlinePatient) &&
    (!isAutoRotationRoomId(roomId) ||
      Boolean(
        roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID
          ? gynecologyRoomsForTime[0]?.id
          : selectableRoomsForTime.find((room) => !isRoomGynecology(room))?.id,
      ));

  const chooseAutoRoom = (autoRoomId: string) => {
    if (autoRoomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && gynecologyRoomsForTime.length === 0 && time) {
      return;
    }
    setRoomId(autoRoomId);
  };

  const setCreateRoomMode = (mode: RoomSelectionMode) => {
    setRoomSelectionMode(mode);
    if (mode === "rotative") {
      chooseAutoRoom(isGynecologyDoctor ? AUTO_SELECT_GYNECOLOGY_ROOM_ID : AUTO_SELECT_ROOM_ID);
      return;
    }
    if (isAutoRotationRoomId(roomId)) {
      setRoomId("");
    }
  };

  const goNextStep = () => {
    if (!canGoNextStep) return;
    if (createStep < 4) {
      setCreateStep((createStep + 1) as CreateStep);
    }
  };

  const validateInlinePatient = () => {
    const nextErrors: InlinePatientErrors = {};

    if (inlinePatientName.trim().length < 3) {
      nextErrors.name = "Nome deve ter pelo menos 3 caracteres.";
    }

    if (onlyDigits(inlinePatientCpf).length !== 11) {
      nextErrors.cpf = "CPF deve conter 11 digitos.";
    }

    if (!inlinePatientBirthDate) {
      nextErrors.birthDate = "Informe a data de nascimento.";
    } else if (createLocalDate(inlinePatientBirthDate) > today) {
      nextErrors.birthDate = "Data de nascimento nao pode ser futura.";
    }

    const phoneDigits = onlyDigits(inlinePatientPhone);
    if (phoneDigits.length < 8 || phoneDigits.length > 11) {
      nextErrors.phone = "Telefone deve ter entre 8 e 11 digitos.";
    }

    setInlinePatientErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert("Campos obrigatorios", "Preencha data, horario, duracao, sala e paciente antes de finalizar.");
      return;
    }

    if (createLocalDate(date) < today) {
      Alert.alert("Data invalida", "Nao e permitido criar agendamento com data anterior a hoje.");
      return;
    }

    if (canCreateWithInlinePatient && !patientId) {
      if (!validateInlinePatient()) {
        return;
      }

      const createdPatient = await createInlinePatient.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients("") });
      createAppointment.mutate({ overridePatientId: createdPatient.id });
      return;
    }

    createAppointment.mutate();
  };

  const createProgress = (createStep / 4) * 100;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.page}>
          <View style={styles.createHeaderRow}>
            <View style={styles.createHeaderLeft}>
              <Pressable onPress={() => (createStep > 1 ? setCreateStep((createStep - 1) as CreateStep) : router.back())} style={styles.createHeaderBackButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.createHeaderTitle}>AGENDAMENTO</Text>
            </View>
            {createStep > 1 ? (
              <Pressable onPress={() => router.back()} style={styles.createHeaderAction}>
                <Text style={styles.createHeaderCancel}>Cancelar</Text>
              </Pressable>
            ) : (
              <View style={styles.createHeaderAction} />
            )}
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <Card>
              <View style={styles.form}>
            {createStep === 1 ? (
              <>
                <TextField label="Titulo (opcional)" value={title} onChangeText={setTitle} />
                <TextField label="Descricao (opcional)" value={description} onChangeText={setDescription} multiline />

                <Text style={styles.sectionTitle}>Tempo da consulta</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
                  {durationOptions.map((optionDuration) => (
                    <Pressable
                      key={optionDuration}
                      onPress={() => {
                        setDuration(optionDuration);
                      }}
                      style={[styles.timeChip, duration === optionDuration && styles.timeChipActive]}
                    >
                      <Text style={[styles.timeChipText, duration === optionDuration && styles.timeChipTextActive]}>{optionDuration} min</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {createStep === 2 ? (
              <>
                <Text style={styles.sectionTitle}>Selecione a data</Text>
                <View style={styles.calendarCard}>
                  <Calendar
                    current={date || undefined}
                    minDate={format(today, "yyyy-MM-dd")}
                    monthFormat="MMMM 'de' yyyy"
                    firstDay={0}
                    markedDates={
                      date
                        ? {
                            [date]: {
                              selected: true,
                              selectedColor: colors.primary,
                            },
                          }
                        : undefined
                    }
                    onDayPress={(day) => {
                      const nextDate = day.dateString;
                      if (nextDate !== date) {
                        setDate(nextDate);
                        setTime("");
                        setRoomId("");
                      }
                    }}
                    theme={{
                      calendarBackground: colors.surface,
                      textSectionTitleColor: colors.muted,
                      dayTextColor: colors.text,
                      monthTextColor: colors.text,
                      todayTextColor: colors.primaryLight,
                      selectedDayBackgroundColor: colors.primary,
                      selectedDayTextColor: "#ffffff",
                      arrowColor: colors.primary,
                      textDayFontWeight: "600",
                      textMonthFontWeight: "800",
                    }}
                  />
                </View>

                <Text style={styles.sectionTitle}>Em qual horario?</Text>
                {!date ? <Text style={styles.emptyHint}>Selecione uma data para ver os horarios disponiveis.</Text> : null}
                {date && availableTimesQuery.isLoading ? <LoadingState label="Carregando horarios..." /> : null}
                {date && !availableTimesQuery.isLoading && (availableTimesQuery.data ?? []).length === 0 ? (
                  <Text style={styles.emptyHint}>Nao ha horarios disponiveis para a data selecionada.</Text>
                ) : null}
                {date && !availableTimesQuery.isLoading && (availableTimesQuery.data ?? []).length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
                    {(availableTimesQuery.data ?? []).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => {
                          setTime(item);
                          setRoomId("");
                        }}
                        style={[styles.timeChip, time === item && styles.timeChipActive]}
                      >
                        <Text style={[styles.timeChipText, time === item && styles.timeChipTextActive]}>{item}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </>
            ) : null}

            {createStep === 3 ? (
              <>
                <View style={styles.segment}>
                  <Button
                    title="Rotativo"
                    variant={roomSelectionMode === "rotative" ? "primary" : "secondary"}
                    onPress={() => setCreateRoomMode("rotative")}
                    style={styles.segmentButton}
                  />
                  <Button
                    title="Sala especifica"
                    variant={roomSelectionMode === "specific" ? "primary" : "secondary"}
                    onPress={() => setCreateRoomMode("specific")}
                    style={styles.segmentButton}
                    disabled={!canSelectRoom}
                  />
                </View>

                {roomSelectionMode === "rotative" ? (
                  <View style={styles.optionGrid}>
                    {isGynecologyDoctor ? (
                      <Pressable
                        onPress={() => chooseAutoRoom(AUTO_SELECT_GYNECOLOGY_ROOM_ID)}
                        style={[styles.option, roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && styles.optionActive, time && gynecologyRoomsForTime.length === 0 && styles.optionDisabled]}
                      >
                        <Text style={[styles.optionTitle, roomId === AUTO_SELECT_GYNECOLOGY_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala de ginecologia</Text>
                        <Text style={styles.optionMeta}>Disponivel quando existir sala de ginecologia no horario selecionado.</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => chooseAutoRoom(AUTO_SELECT_ROOM_ID)} style={[styles.option, roomId === AUTO_SELECT_ROOM_ID && styles.optionActive]}>
                      <Text style={[styles.optionTitle, roomId === AUTO_SELECT_ROOM_ID && styles.optionTitleActive]}>Rotativo de sala comum</Text>
                      <Text style={styles.optionMeta}>Sala definida automaticamente pelo sistema.</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.optionGrid}>
                    {roomsForTimeQuery.isFetching ? <LoadingState label="Buscando salas..." /> : null}
                    {selectableRoomsForTime.map((room) => (
                      <Pressable key={room.id} onPress={() => setRoomId(room.id)} style={[styles.option, roomId === room.id && styles.optionActive]}>
                        <Text style={[styles.optionTitle, roomId === room.id && styles.optionTitleActive]}>{room.name}</Text>
                        <Text style={styles.optionMeta}>{room.description?.trim() || "Sem descricao"}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {createStep === 4 ? (
              <>
                <View style={styles.switchRow}>
                  <View style={styles.switchText}>
                    <Text style={styles.sectionTitle}>Agendar sem paciente</Text>
                    <Text style={styles.detail}>Ative esta opcao para criar um horario sem vincular paciente.</Text>
                  </View>
                  <Switch
                    value={withoutPatient}
                    onValueChange={(nextValue) => {
                      setWithoutPatient(nextValue);
                      if (nextValue) {
                        setPatientId("");
                        setShowInlinePatientForm(false);
                        setInlinePatientErrors({});
                      }
                    }}
                  />
                </View>

                {!withoutPatient ? (
                  <>
                    <Text style={styles.sectionTitle}>{showInlinePatientForm ? "Novo paciente" : "Selecione o paciente"}</Text>

                    {!showInlinePatientForm ? (
                      <>
                        {patientsQuery.isLoading ? <LoadingState label="Carregando pacientes..." /> : null}
                        {!patientsQuery.isLoading && patients.length === 0 ? (
                          <Text style={styles.emptyHint}>Nenhum paciente cadastrado. Use o botao abaixo para criar um novo paciente.</Text>
                        ) : null}

                        <View style={styles.optionGrid}>
                          {patients.map((patient) => (
                            <Pressable
                              key={patient.id}
                              onPress={() => {
                                setPatientId(patient.id);
                                setShowInlinePatientForm(false);
                                setInlinePatientErrors({});
                              }}
                              style={[styles.option, patientId === patient.id && styles.optionActive]}
                            >
                              <Text style={[styles.optionTitle, patientId === patient.id && styles.optionTitleActive]}>{patient.name}</Text>
                              <Text style={styles.optionMeta}>{formatCpf(patient.cpf)}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    ) : null}

                    <View style={styles.inlinePatientActions}>
                      <Button
                        title={showInlinePatientForm ? "Cancelar cadastro" : "Cadastrar novo paciente"}
                        variant="secondary"
                        onPress={() => {
                          if (showInlinePatientForm) {
                            setShowInlinePatientForm(false);
                            setInlinePatientErrors({});
                            return;
                          }
                          setPatientId("");
                          setShowInlinePatientForm(true);
                        }}
                      />
                    </View>

                    {showInlinePatientForm ? (
                      <View style={styles.inlinePatientForm}>
                        <Text style={styles.inlinePatientHint}>Os dados do paciente serao salvos automaticamente ao finalizar o agendamento.</Text>
                        <TextField
                          label="Nome completo"
                          value={inlinePatientName}
                          onChangeText={(value) => {
                            setInlinePatientName(value);
                            if (inlinePatientErrors.name) {
                              setInlinePatientErrors((current) => ({ ...current, name: undefined }));
                            }
                          }}
                          error={inlinePatientErrors.name}
                        />
                        <TextField
                          label="CPF"
                          keyboardType="number-pad"
                          value={formatCpf(inlinePatientCpf)}
                          onChangeText={(value) => {
                            setInlinePatientCpf(formatCpf(value));
                            if (inlinePatientErrors.cpf) {
                              setInlinePatientErrors((current) => ({ ...current, cpf: undefined }));
                            }
                          }}
                          error={inlinePatientErrors.cpf}
                        />
                        <DateTimeField
                          label="Data de nascimento"
                          mode="date"
                          value={inlinePatientBirthDate}
                          onChange={(value) => {
                            setInlinePatientBirthDate(value);
                            if (inlinePatientErrors.birthDate) {
                              setInlinePatientErrors((current) => ({ ...current, birthDate: undefined }));
                            }
                          }}
                          error={inlinePatientErrors.birthDate}
                          maximumDate={today}
                          defaultPickerDate={birthDateDefault}
                          iosDateDisplay="spinner"
                        />
                        <TextField
                          label="Telefone"
                          keyboardType="phone-pad"
                          value={formatPhone(inlinePatientPhone)}
                          onChangeText={(value) => {
                            setInlinePatientPhone(formatPhone(value));
                            if (inlinePatientErrors.phone) {
                              setInlinePatientErrors((current) => ({ ...current, phone: undefined }));
                            }
                          }}
                          error={inlinePatientErrors.phone}
                        />
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.emptyHint}>Agendamento sem paciente selecionado.</Text>
                )}
              </>
            ) : null}

              </View>
            </Card>
          </ScrollView>

          <View style={styles.footerFixed}>
            <View style={styles.createProgressTrack}>
              <View style={[styles.createProgressFill, { width: `${createProgress}%` }]} />
            </View>
            <Button
              title={createStep === 4 ? "Finalizar agendamento" : "Continuar"}
              onPress={createStep === 4 ? submit : goNextStep}
              disabled={createStep === 4 ? !canSubmit : !canGoNextStep}
              loading={createAppointment.isPending || createInlinePatient.isPending}
              style={styles.createPrimaryButton}
            />
          </View>
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
  createHeaderCancel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "right",
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
  calendarCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  timeRow: {
    gap: 10,
    paddingRight: 8,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: "#1A1A1A",
    backgroundColor: colors.surface,
    borderRadius: 14,
    minWidth: 84,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  timeChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#FCE9F1",
  },
  timeChipText: {
    color: "#2B2B2B",
    fontSize: 18,
    fontWeight: "700",
  },
  timeChipTextActive: {
    color: colors.primary,
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
  inlinePatientActions: {
    marginTop: 4,
  },
  inlinePatientForm: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    backgroundColor: colors.surface,
  },
  inlinePatientHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
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
  emptyHint: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
});
