import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors } from "@/theme/colors";

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primaryLight} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
