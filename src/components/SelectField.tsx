import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [iosModalOpen, setIosModalOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const closeIosModal = () => setIosModalOpen(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "ios" ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
            accessibilityState={{ disabled: !enabled, expanded: iosModalOpen }}
            disabled={!enabled}
            onPress={() => setIosModalOpen(true)}
            style={({ pressed }) => [
              styles.iosSelect,
              error && styles.selectBoxError,
              !enabled && styles.selectBoxDisabled,
              pressed && enabled && styles.iosSelectPressed,
            ]}
          >
            <Text numberOfLines={1} style={[styles.iosSelectText, !selectedOption && styles.placeholderText]}>
              {selectedOption?.label ?? placeholder}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </Pressable>

          <Modal visible={iosModalOpen} transparent animationType="slide" onRequestClose={closeIosModal}>
            <View style={styles.modalContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar seletor"
                onPress={closeIosModal}
                style={styles.modalBackdrop}
              />
              <SafeAreaView edges={["bottom"]} style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    hitSlop={10}
                    onPress={closeIosModal}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>

                <FlatList
                  data={options}
                  keyExtractor={(option) => option.value}
                  contentContainerStyle={styles.optionsList}
                  ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma opcao disponivel.</Text>}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => {
                          onValueChange(item.value);
                          closeIosModal();
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && styles.optionPressed,
                        ]}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</Text>
                        {isSelected ? <Ionicons name="checkmark" size={22} color={colors.primaryLight} /> : null}
                      </Pressable>
                    );
                  }}
                />
              </SafeAreaView>
            </View>
          </Modal>
        </>
      ) : (
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
      )}
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
    minHeight: 48,
    color: colors.text,
    marginVertical: -2,
  },
  iosSelect: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iosSelectPressed: {
    opacity: 0.9,
  },
  iosSelectText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  placeholderText: {
    color: "#98A2B3",
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
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 34, 53, 0.35)",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    overflow: "hidden",
  },
  modalHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: colors.background,
  },
  optionsList: {
    paddingVertical: 8,
  },
  option: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionSelected: {
    backgroundColor: colors.background,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  optionTextSelected: {
    color: colors.primaryLight,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    textAlign: "center",
  },
});
