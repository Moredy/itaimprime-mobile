import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTopBar } from "@/components/AppTopBar";
import { Card } from "@/components/Card";
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

function renderDetailLine(label: string, value: string, isLast = false) {
  return (
    <View style={[styles.detailRow, isLast ? styles.detailRowLast : undefined]}>
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

  const contractDetails = contractDetailsQuery.data;
  const isContractActive = formatBooleanPtBr(contractDetails?.isActive) === "Sim";

  return (
    <Screen>
      <AppTopBar />

      <>
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

        {selectedContractId !== null && contractDetails ? (
          <View style={styles.membershipCard}>


            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTextBox}>
                <Text style={styles.cardEyebrow}>Detalhes do plano</Text>
                <Text style={styles.cardContractText}>
               
                   {String(contractDetails.contractSummary ?? "-")}
                </Text>
              </View>

            </View>

            <View style={styles.cardBody}>
              {renderDetailLine("Frequencia", formatFrequencyPtBr(contractDetails.paymentFrequency))}
              {renderDetailLine("Inicio", formatDateValue(contractDetails.startDate))}
              {renderDetailLine("Fim", formatDateValue(contractDetails.endDate))}
              {renderDetailLine("Vencimento (dia)", String(contractDetails.dueDay ?? "-"))}
              {renderDetailLine("Valor", formatCurrencyPtBr(contractDetails.amount), true)}
            </View>


          </View>
        ) : null}
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  membershipCard: {
    borderWidth: 1,
    borderColor: "#D9D6C2",
    borderRadius: 16,
    backgroundColor: "#FDFCf8",
    overflow: "hidden",
    shadowColor: "#141B34",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  brandStrip: {
    backgroundColor: "#141B34",
    borderBottomWidth: 1,
    borderBottomColor: "#2F4F88",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  brandStripText: {
    color: "#D9D6C2",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardHeader: {
    backgroundColor: "#141B34",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderTextBox: {
    flex: 1,
    gap: 3,
  },
  cardEyebrow: {
    color: "#D9D6C2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardContractText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "#E7EFE5",
    borderColor: "#B7CDAE",
  },
  statusBadgeInactive: {
    backgroundColor: "#F4E2E0",
    borderColor: "#E0BBB5",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: "#2F5132",
  },
  statusBadgeTextInactive: {
    color: "#843E37",
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FDFCF8",
    gap: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#E2DED1",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: "#797984",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    color: "#141B34",
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  summaryBlock: {
    borderTopWidth: 1,
    borderColor: "#D9D6C2",
    backgroundColor: "#ECE8D8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryLabel: {
    color: "#4A4F63",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    color: "#141B34",
    fontSize: 15,
    fontWeight: "900",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
