import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { AppTopBar } from "@/components/AppTopBar";
import { Screen } from "@/components/Screen";
import { EmptyState, LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import type { Patient } from "@/types/api";
import { formatCpf, formatDate, formatPhone } from "@/utils/format";

export default function PatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  const patientsQuery = useQuery({
    queryKey: queryKeys.patients(search),
    queryFn: () => trpcClient.patient.list.query({ search: search.trim() || undefined }) as Promise<Patient[]>,
  });

  const openCreate = () => {
    router.push("/new-patient");
  };

  const openEdit = (patient: Patient) => {
    router.push({
      pathname: "/edit-patient",
      params: { patientId: patient.id },
    });
  };

  const patients = patientsQuery.data ?? [];

  return (
    <Screen>
      <AppTopBar />
      <View style={styles.toolbar}>
        <TextField label="Buscar" placeholder="Nome, CPF ou telefone" value={search} onChangeText={setSearch} />
        <Button title="Novo paciente" onPress={openCreate} />
      </View>

      {patientsQuery.isLoading ? <LoadingState label="Carregando pacientes..." /> : null}
      {!patientsQuery.isLoading && patients.length === 0 ? (
        <EmptyState
          title={search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          description={search ? "Tente outro termo de busca." : "Cadastre o primeiro paciente para usar nos agendamentos."}
          actionLabel="Novo paciente"
          onAction={openCreate}
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
});
