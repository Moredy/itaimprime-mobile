import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, isValid, parse } from "date-fns";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type DateTimeFieldMode = "date" | "time";
type IOSDateDisplay = "default" | "spinner" | "compact" | "inline";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: DateTimeFieldMode;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  defaultPickerDate?: Date;
  iosDateDisplay?: IOSDateDisplay;
};

const INPUT_DATE_FORMAT = "yyyy-MM-dd";
const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";
const INPUT_TIME_FORMAT = "HH:mm";

function parseInputValue(value: string, mode: DateTimeFieldMode, fallbackDate?: Date) {
  const now = fallbackDate ?? new Date();
  if (!value) return now;

  if (mode === "date") {
    const parsed = parse(value, INPUT_DATE_FORMAT, now);
    return isValid(parsed) ? parsed : now;
  }

  const parsed = parse(value, INPUT_TIME_FORMAT, now);
  return isValid(parsed) ? parsed : now;
}

function formatInputValue(value: Date, mode: DateTimeFieldMode) {
  return mode === "date" ? format(value, INPUT_DATE_FORMAT) : format(value, INPUT_TIME_FORMAT);
}

function formatDisplayValue(value: string, mode: DateTimeFieldMode) {
  if (!value) return "";
  const parsed = parseInputValue(value, mode);
  if (!isValid(parsed)) return value;
  return mode === "date" ? format(parsed, DISPLAY_DATE_FORMAT) : format(parsed, INPUT_TIME_FORMAT);
}

export function DateTimeField({
  label,
  value,
  onChange,
  mode,
  placeholder,
  error,
  disabled,
  minimumDate,
  maximumDate,
  defaultPickerDate,
  iosDateDisplay,
}: Props) {
  const [showAndroidPicker, setShowAndroidPicker] = React.useState(false);
  const [iosModalOpen, setIosModalOpen] = React.useState(false);
  const pickerValue = parseInputValue(value, mode, defaultPickerDate);
  const [iosTempValue, setIosTempValue] = React.useState<Date>(pickerValue);

  React.useEffect(() => {
    if (!iosModalOpen) {
      setIosTempValue(parseInputValue(value, mode, defaultPickerDate));
    }
  }, [iosModalOpen, mode, value, defaultPickerDate]);

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === "ios") {
      setIosTempValue(parseInputValue(value, mode, defaultPickerDate));
      setIosModalOpen(true);
      return;
    }
    setShowAndroidPicker(true);
  };

  const handleAndroidChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowAndroidPicker(false);
    if (!selectedDate) return;
    onChange(formatInputValue(selectedDate, mode));
  };

  const displayValue = formatDisplayValue(value, mode);
  const textToShow = displayValue || placeholder || (mode === "date" ? "Selecionar data" : "Selecionar horario");

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={({ pressed }) => [styles.input, error && styles.inputError, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
      >
        <Text style={[styles.valueText, !displayValue && styles.placeholder]}>{textToShow}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showAndroidPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          is24Hour
          minimumDate={mode === "date" ? minimumDate : undefined}
          maximumDate={mode === "date" ? maximumDate : undefined}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={iosModalOpen} transparent animationType="fade" onRequestClose={() => setIosModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{label}</Text>
              <DateTimePicker
                value={iosTempValue}
                mode={mode}
                is24Hour
                display={mode === "date" ? (iosDateDisplay ?? "inline") : "spinner"}
                minimumDate={mode === "date" ? minimumDate : undefined}
                maximumDate={mode === "date" ? maximumDate : undefined}
                onChange={(_event, selectedDate) => {
                  if (!selectedDate) return;
                  setIosTempValue(selectedDate);
                }}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setIosModalOpen(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(formatInputValue(iosTempValue, mode));
                    setIosModalOpen(false);
                  }}
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  valueText: {
    color: colors.text,
    fontSize: 16,
  },
  placeholder: {
    color: "#98A2B3",
  },
  inputError: {
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 34, 53, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  modalButtonTextPrimary: {
    color: "#fff",
  },
});