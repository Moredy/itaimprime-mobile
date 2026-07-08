import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Protected } from "@/components/Protected";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  return (
    <Protected>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryLight,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        }}
      >
        <Tabs.Screen
          name="appointments"
          options={{
            title: "Agenda",
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: "Pacientes",
            tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: "Meu plano",
            tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </Protected>
  );
}
