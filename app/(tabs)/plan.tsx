import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { EmptyState, LoadingState } from "@/components/StateView";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

type ContractRecord = Record<string, unknown>;
type ContractListResponse = {
  data: ContractRecord[];
  pagination?: { total?: number };
};

type ContractDetails = {
  contractId?: number | string;
  customerId?: number | string;
  planId?: number | string;
  paymentFrequency?: string;
  startDate?: string;
  endDate?: string;
  dueDay?: number | string;
  amount?: number | string;
  isActive?: boolean | string;
  contractSummary?: string;
};

function getContractId(record: ContractRecord): number | null {
  const candidates = [record.contractId, record.id];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function formatDateValue(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }

  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function formatFrequencyPtBr(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "monthly") return "Mensal";
  if (normalized === "bimonthly") return "Bimestral";
  if (normalized === "quarterly") return "Trimestral";
  if (normalized === "semester" || normalized === "semiannual") return "Semestral";
  if (normalized === "yearly" || normalized === "annual") return "Anual";
  if (normalized === "weekly") return "Semanal";
  if (normalized === "daily") return "Diario";

  return value;
}

function formatCurrencyPtBr(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(parsed);
    }
  }

  return "-";
}

function formatBooleanPtBr(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return "Sim";
    if (normalized === "false") return "Nao";
  }

  return "-";
}

function renderDetailLine(label: string, value: string) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function PlanScreen() {
  const [selectedContractId, setSelectedContractId] = React.useState<number | null>(null);

  const contractsQuery = useQuery({
    queryKey: queryKeys.contracts(10, 0),
    queryFn: () =>
      trpcClient.contract.getContracts.query({
        limit: 10,
        offset: 0,
      }) as Promise<ContractListResponse>,
    retry: false,
  });

  const contractRecords = React.useMemo(() => {
    return Array.isArray(contractsQuery.data?.data) ? contractsQuery.data.data : [];
  }, [contractsQuery.data?.data]);

  React.useEffect(() => {
    if (contractRecords.length === 0) {
      setSelectedContractId(null);
      return;
    }

    const exists = selectedContractId
      ? contractRecords.some((record) => getContractId(record) === selectedContractId)
      : false;

    if (!exists) {
      setSelectedContractId(getContractId(contractRecords[0]));
    }
  }, [contractRecords, selectedContractId]);

  const contractDetailsQuery = useQuery({
    queryKey: queryKeys.contractDetails(selectedContractId),
    queryFn: () =>
      trpcClient.contract.getContractDetails.query({
        contractId: selectedContractId ?? 0,
      }) as Promise<ContractDetails>,
    enabled: selectedContractId !== null,
    retry: false,
  });

  return (
    <Screen>
      <Header title="Meu plano" subtitle="Acompanhe os detalhes do contrato vinculado ao seu usuario." />

      <Card>
        <Text style={styles.sectionTitle}>Plano contratado</Text>

        {contractsQuery.isLoading ? <LoadingState label="Carregando planos contratados..." /> : null}

        {contractsQuery.error ? (
          <Text style={styles.errorText}>{getErrorMessage(contractsQuery.error)}</Text>
        ) : null}

        {!contractsQuery.isLoading && selectedContractId === null ? (
          <EmptyState
            title="Nenhum contrato encontrado"
            description="Nao existem planos vinculados ao usuario logado no momento."
          />
        ) : null}

        {selectedContractId !== null && contractDetailsQuery.isLoading ? (
          <LoadingState label={`Carregando detalhamento do contrato ${selectedContractId}...`} />
        ) : null}

        {selectedContractId !== null && contractDetailsQuery.error ? (
          <Text style={styles.errorText}>{getErrorMessage(contractDetailsQuery.error)}</Text>
        ) : null}

        {selectedContractId !== null && contractDetailsQuery.data ? (
          <View style={styles.detailList}>
            {renderDetailLine("Contrato", String(contractDetailsQuery.data.contractId ?? selectedContractId))}
            {renderDetailLine("Cliente", String(contractDetailsQuery.data.customerId ?? "-"))}
            {renderDetailLine("Plano", String(contractDetailsQuery.data.planId ?? "-"))}
            {renderDetailLine("Frequencia", formatFrequencyPtBr(contractDetailsQuery.data.paymentFrequency))}
            {renderDetailLine("Inicio", formatDateValue(contractDetailsQuery.data.startDate))}
            {renderDetailLine("Fim", formatDateValue(contractDetailsQuery.data.endDate))}
            {renderDetailLine("Vencimento (dia)", String(contractDetailsQuery.data.dueDay ?? "-"))}
            {renderDetailLine("Valor", formatCurrencyPtBr(contractDetailsQuery.data.amount))}
            {renderDetailLine("Ativo", formatBooleanPtBr(contractDetailsQuery.data.isActive))}
            {renderDetailLine("Resumo", String(contractDetailsQuery.data.contractSummary ?? "-"))}
          </View>
        ) : null}
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
  detailRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  detailList: {
    gap: 8,
  },
  detailLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
