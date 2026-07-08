import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { trpcClient } from "@/lib/trpc";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const resetSchema = z
  .object({
    email: z.string().email("Informe um email valido."),
    newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas nao coincidem.",
    path: ["confirmPassword"],
  });

export default function ResetPasswordScreen() {
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: (data: z.infer<typeof resetSchema>) =>
      trpcClient.auth.requestPasswordReset.mutate({
        email: data.email.trim(),
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      Alert.alert(
        "Solicitacao enviada",
        "Um administrador ira revisar seu pedido. Apos a aprovacao, use a nova senha para entrar.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    },
    onError: (error) => Alert.alert("Nao foi possivel enviar", getErrorMessage(error)),
  });

  return (
    <Screen>
      <Header title="Redefinir senha" subtitle="A alteracao fica pendente para aprovacao administrativa." />
      <Card>
        <Text style={styles.notice}>O app nao altera sua senha diretamente. Ele envia a solicitacao ao backend atual.</Text>
        <View style={styles.form}>
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <TextField label="Nova senha" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField label="Confirmar nova senha" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Button
            title="Enviar solicitacao"
            loading={resetMutation.isPending}
            onPress={form.handleSubmit((data) => resetMutation.mutate(data))}
          />
          <Button title="Voltar" variant="secondary" onPress={() => router.back()} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.muted,
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
});
