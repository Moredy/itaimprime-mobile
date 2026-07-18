import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateTimeField } from "@/components/DateTimeField";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import { formatCpf, formatPhone, onlyDigits } from "@/utils/format";
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

export default function NewPatientScreen() {
  const router = useRouter();
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

  const form = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
    },
  });

  const createPatient = useMutation({
    mutationFn: (data: PatientForm) =>
      trpcClient.patient.create.mutate({
        name: data.name.trim(),
        cpf: onlyDigits(data.cpf),
        birthDate: new Date(`${data.birthDate}T00:00:00`),
        phone: onlyDigits(data.phone),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      router.back();
    },
    onError: (error) => Alert.alert("Erro ao cadastrar", getErrorMessage(error)),
  });

  const submit = form.handleSubmit((data) => {
    createPatient.mutate(data);
  });

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
              <Text style={styles.createHeaderTitle}>PACIENTE</Text>
            </View>
            <View style={styles.createHeaderAction} />
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
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
              </View>
            </Card>
          </ScrollView>

          <View style={styles.footerFixed}>
            <View style={styles.createProgressTrack}>
              <View style={[styles.createProgressFill, { width: "100%" }]} />
            </View>
            <Button title="Salvar" loading={createPatient.isPending} onPress={submit} style={styles.createPrimaryButton} />
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
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 12,
  },
  form: {
    gap: 14,
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