import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { EmptyState, LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { Patient } from "@/types/api";
import { dateInputValue, formatCpf, formatDate, formatPhone, onlyDigits } from "@/utils/format";
import { getErrorMessage } from "@/utils/errors";

const patientSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  cpf: z.string().refine((value) => onlyDigits(value).length === 11, "CPF deve conter 11 digitos."),
  birthDate: z.string().min(10, "Informe a data de nascimento."),
  phone: z.string().refine((value) => {
    const digits = onlyDigits(value);
    return digits.length >= 8 && digits.length <= 11;
  }, "Telefone deve ter entre 8 e 11 digitos."),
});

type PatientForm = z.infer<typeof patientSchema>;

export default function PatientsScreen() {
  const queryClient = useQueryClient();
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
  const [search, setSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(null);

  const patientsQuery = useQuery({
    queryKey: queryKeys.patients(search),
    queryFn: () => trpcClient.patient.list.query({ search: search.trim() || undefined }) as Promise<Patient[]>,
  });

  const form = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingPatient(null);
    form.reset({ name: "", cpf: "", birthDate: "", phone: "" });
  };

  const openCreate = () => {
    setEditingPatient(null);
    form.reset({ name: "", cpf: "", birthDate: "", phone: "" });
    setModalOpen(true);
  };

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient);
    form.reset({
      name: patient.name,
      cpf: formatCpf(patient.cpf),
      birthDate: dateInputValue(patient.birthDate),
      phone: formatPhone(patient.phone),
    });
    setModalOpen(true);
  };

  const invalidatePatients = () => queryClient.invalidateQueries({ queryKey: ["patients"] });

  const createPatient = useMutation({
    mutationFn: (data: PatientForm) =>
      trpcClient.patient.create.mutate({
        name: data.name.trim(),
        cpf: onlyDigits(data.cpf),
        birthDate: new Date(`${data.birthDate}T00:00:00`),
        phone: onlyDigits(data.phone),
      }),
    onSuccess: () => {
      void invalidatePatients();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao cadastrar", getErrorMessage(error)),
  });

  const updatePatient = useMutation({
    mutationFn: (data: PatientForm) =>
      trpcClient.patient.update.mutate({
        id: editingPatient?.id,
        name: data.name.trim(),
        cpf: onlyDigits(data.cpf),
        birthDate: new Date(`${data.birthDate}T00:00:00`),
        phone: onlyDigits(data.phone),
      }),
    onSuccess: () => {
      void invalidatePatients();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao atualizar", getErrorMessage(error)),
  });

  const deletePatient = useMutation({
    mutationFn: (id: string) => trpcClient.patient.delete.mutate({ id }),
    onSuccess: () => {
      void invalidatePatients();
      closeModal();
    },
    onError: (error) => Alert.alert("Erro ao excluir", getErrorMessage(error)),
  });

  const submit = form.handleSubmit((data) => {
    if (editingPatient) updatePatient.mutate(data);
    else createPatient.mutate(data);
  });

  const confirmDelete = () => {
    if (!editingPatient) return;
    Alert.alert("Excluir paciente", `Deseja excluir ${editingPatient.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deletePatient.mutate(editingPatient.id) },
    ]);
  };

  const patients = patientsQuery.data ?? [];

  return (
    <Screen>
      <Header title="Pacientes" subtitle="Gerencie os pacientes vinculados ao seu perfil medico." />
      <View style={styles.toolbar}>
        <TextField label="Buscar" placeholder="Nome, CPF ou telefone" value={search} onChangeText={setSearch} />
        <Button title="Novo paciente" onPress={openCreate} />
      </View>

      {patientsQuery.isLoading ? <LoadingState label="Carregando pacientes..." /> : null}
      {!patientsQuery.isLoading && patients.length === 0 ? (
        <EmptyState
          title={search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          description={search ? "Tente outro termo de busca." : "Cadastre o primeiro paciente para usar nos agendamentos."}
        />
      ) : null}

      <View style={styles.list}>
        {patients.map((patient) => (
          <Pressable key={patient.id} onPress={() => openEdit(patient)}>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.edit}>Editar</Text>
              </View>
              <Text style={styles.detail}>CPF {formatCpf(patient.cpf)}</Text>
              <Text style={styles.detail}>Telefone {formatPhone(patient.phone)}</Text>
              <Text style={styles.detail}>Nascimento {formatDate(patient.birthDate)}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal} presentationStyle="pageSheet">
        <Screen>
          <Header title={editingPatient ? "Editar paciente" : "Novo paciente"} />
          <Card>
            <View style={styles.form}>
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField label="Nome completo" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={form.control}
                name="cpf"
                render={({ field, fieldState }) => (
                  <TextField
                    label="CPF"
                    keyboardType="number-pad"
                    value={formatCpf(field.value)}
                    onChangeText={(value) => field.onChange(formatCpf(value))}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="birthDate"
                render={({ field, fieldState }) => (
                  <DateTimeField
                    label="Data de nascimento"
                    mode="date"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    maximumDate={today}
                    defaultPickerDate={birthDateDefault}
                    iosDateDisplay="spinner"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Telefone"
                    keyboardType="phone-pad"
                    value={formatPhone(field.value)}
                    onChangeText={(value) => field.onChange(formatPhone(value))}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Button title={editingPatient ? "Atualizar paciente" : "Salvar paciente"} loading={createPatient.isPending || updatePatient.isPending} onPress={submit} />
              {editingPatient ? <Button title="Excluir paciente" variant="danger" loading={deletePatient.isPending} onPress={confirmDelete} /> : null}
              <Button title="Cancelar" variant="secondary" onPress={closeModal} />
            </View>
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    gap: 12,
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
  patientName: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  edit: {
    color: colors.primaryLight,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
  },
  form: {
    gap: 14,
  },
});
