import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type MenuPath =
  | "/"
  | "/(tabs)/appointments"
  | "/(tabs)/patients"
  | "/(tabs)/plan"
  | "/(tabs)/preferences"
  | "/(tabs)/consultation-types"
  | "/(tabs)/working-hours"
  | "/(tabs)/settings";

export function AppTopBar() {
  const router = useRouter();
  const [sideMenuOpen, setSideMenuOpen] = React.useState(false);

  const navigateFromSideMenu = (path: MenuPath) => {
    setSideMenuOpen(false);
    router.push(path);
  };

  return (
    <>
      <Modal visible={sideMenuOpen} transparent animationType="fade" onRequestClose={() => setSideMenuOpen(false)}>
        <View style={styles.sideMenuOverlay}>
          <Pressable style={styles.sideMenuBackdrop} onPress={() => setSideMenuOpen(false)} />
          <View style={styles.sideMenuPanel}>
            <Pressable style={styles.sideMenuCloseButton} onPress={() => setSideMenuOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Pressable style={styles.sideMenuItem} onPress={() => navigateFromSideMenu("/(tabs)/settings")}>
              <View style={styles.sideMenuItemContent}>
                <Ionicons name="person-outline" size={18} color={colors.primaryLight} />
                <Text style={styles.sideMenuItemText}>Perfil</Text>
              </View>
            </Pressable>
            <Pressable style={styles.sideMenuItem} onPress={() => navigateFromSideMenu("/(tabs)/consultation-types")}>
              <View style={styles.sideMenuItemContent}>
                <Ionicons name="document-text-outline" size={18} color={colors.primaryLight} />
                <Text style={styles.sideMenuItemText}>Tipos de consulta</Text>
              </View>
            </Pressable>
            <Pressable style={styles.sideMenuItem} onPress={() => navigateFromSideMenu("/(tabs)/working-hours")}>
              <View style={styles.sideMenuItemContent}>
                <Ionicons name="time-outline" size={18} color={colors.primaryLight} />
                <Text style={styles.sideMenuItemText}>Horarios de atendimento</Text>
              </View>
            </Pressable>
            <Pressable style={styles.sideMenuItem} onPress={() => navigateFromSideMenu("/(tabs)/preferences")}>
              <View style={styles.sideMenuItemContent}>
                <Ionicons name="options-outline" size={18} color={colors.primaryLight} />
                <Text style={styles.sideMenuItemText}>Preferencias</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          <Pressable style={styles.topNavIconButton} onPress={() => setSideMenuOpen(true)}>
            <Ionicons name="menu" size={30} color={colors.text} />
          </Pressable>
        </View>

        <Image source={require("../../assets/logo/logo-fundo-branco.png")} style={styles.topNavLogo} resizeMode="contain" />

        <View style={styles.topNavIconButton} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sideMenuOverlay: {
    flex: 1,
    flexDirection: "row-reverse",
  },
  sideMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 34, 53, 0.32)",
  },
  sideMenuPanel: {
    width: 260,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 56,
    paddingHorizontal: 16,
    gap: 6,
  },
  sideMenuCloseButton: {
    alignSelf: "flex-end",
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sideMenuCloseText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  sideMenuTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  sideMenuItem: {
    minHeight: 44,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sideMenuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sideMenuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  topNav: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    marginHorizontal: -20,
    marginTop: -20,
    paddingTop: 6,
    marginBottom: 12,
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  topNavIconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavLogo: {
    width: 128,
    height: 54,
  },
});
