import { Picker } from "@react-native-picker/picker";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  enabled?: boolean;
  error?: string;
};

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  enabled = true,
  error,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.selectBox, error && styles.selectBoxError, !enabled && styles.selectBoxDisabled]}>
        <Picker
          selectedValue={value}
          onValueChange={(nextValue) => onValueChange(String(nextValue ?? ""))}
          enabled={enabled}
          style={styles.picker}
          dropdownIconColor={colors.muted}
        >
          <Picker.Item label={placeholder} value="" color={colors.muted} />
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  selectBox: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  picker: {
    minHeight: Platform.OS === "ios" ? 180 : 48,
    color: colors.text,
    marginVertical: Platform.OS === "ios" ? -64 : -2,
  },
  selectBoxError: {
    borderColor: colors.danger,
  },
  selectBoxDisabled: {
    opacity: 0.6,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
