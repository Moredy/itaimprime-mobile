import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import type { CheckUserStatusResult } from "@/types/api";
import { getErrorMessage } from "@/utils/errors";

const emailSchema = z.object({
  email: z.string().email("Informe um email valido."),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
});

type LoginStep = "email" | "password" | "firstAccess";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [step, setStep] = React.useState<LoginStep>("email");
  const [email, setEmail] = React.useState("");
  const [conexaName, setConexaName] = React.useState<string | null>(null);
  const [specialty, setSpecialty] = React.useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const checkUser = useMutation({
    mutationFn: (input: { email: string }) =>
      trpcClient.auth.checkUserStatus.mutate(input) as Promise<CheckUserStatusResult>,
    onSuccess: (data, variables) => {
      if (data.existsInLocal && data.isActive === false) {
        Alert.alert("Acesso inativo", "Seu cadastro esta inativo. Entre em contato com o administrador.");
        return;
      }

      setEmail(variables.email);
      setConexaName(data.name ?? null);
      setSpecialty(data.specialty ?? null);
      setStep(data.existsInLocal ? "password" : "firstAccess");
    },
    onError: (error) => Alert.alert("Nao foi possivel validar", getErrorMessage(error)),
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => signIn(email, password),
    onSuccess: () => router.replace("/appointments"),
    onError: (error) => Alert.alert("Login nao realizado", getErrorMessage(error)),
  });

  const onBack = () => {
    setStep("email");
    setEmail("");
    setConexaName(null);
    setSpecialty(null);
    passwordForm.reset();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image source={require("../assets/logo/logo-fundo-branco.png")} style={styles.brandLogo} resizeMode="contain" />
        </View>

        <View style={styles.centerArea}>
          <View style={styles.authGroup}>
            <Text style={styles.subtitle}>Acesse sua agenda, pacientes e consultas pelo app.</Text>
            <Card style={styles.formCard}>
              {step === "email" ? (
                <View style={styles.form}>
                  <Controller
                    control={emailForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Button
                    title="Avancar"
                    loading={checkUser.isPending}
                    onPress={emailForm.handleSubmit((data) => checkUser.mutate({ email: data.email.trim() }))}
                  />
                </View>
              ) : null}

              {step === "password" ? (
                <View style={styles.form}>
                  <Text style={styles.context}>Entrando como {email}</Text>
                  <Controller
                    control={passwordForm.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Senha"
                        secureTextEntry
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Button
                    title="Entrar"
                    loading={loginMutation.isPending}
                    onPress={passwordForm.handleSubmit((data) => loginMutation.mutate(data.password))}
                  />
                  <Button title="Voltar" variant="secondary" onPress={onBack} />
                </View>
              ) : null}

              {step === "firstAccess" ? (
                <View style={styles.form}>
                  <Text style={styles.context}>Email verificado: {email}</Text>
                  {conexaName ? <Text style={styles.muted}>Nome cadastrado: {conexaName}</Text> : null}
                  <Text style={styles.muted}>Este e seu primeiro acesso. Complete seu cadastro para criar a senha.</Text>
                  <Button
                    title="Criar conta"
                    onPress={() =>
                      router.push({
                        pathname: "/signup",
                        params: {
                          email,
                          name: conexaName ?? "",
                          specialty: specialty ?? "",
                        },
                      })
                    }
                  />
                  <Button title="Voltar" variant="secondary" onPress={onBack} />
                </View>
              ) : null}
            </Card>

            {step !== "firstAccess" ? (
              <Button
                title="Esqueci minha senha"
                variant="ghost"
                style={styles.forgotButton}
                onPress={() => router.push("/reset-password")}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerArea: {
    flex: 1,
    justifyContent: "center",
  },
  authGroup: {
    alignSelf: "center",
    maxWidth: 420,
    width: "100%",
    gap: 8,
  },
  hero: {
    left: 20,
    position: "absolute",
    right: 20,
    top: "10%",
    gap: 12,
    alignItems: "center",
  },
  brandLogo: {
    height: 122,
    width: 420,
  },
  formCard: {
    width: "100%",
  },
  form: {
    gap: 14,
  },
  forgotButton: {
    width: "100%",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 420,
    textAlign: "center",
  },
  context: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
