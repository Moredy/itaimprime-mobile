import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const signupSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
    specialty: z.string().min(2, "Especialidade deve ter pelo menos 2 caracteres."),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem.",
    path: ["confirmPassword"],
  });

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string; name?: string; specialty?: string }>();
  const email = params.email ?? "";
  const { signIn } = useAuth();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: params.name ?? "",
      specialty: params.specialty ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: z.infer<typeof signupSchema>) =>
      trpcClient.auth.signup.mutate({
        email,
        name: data.name.trim(),
        specialty: data.specialty.trim(),
        password: data.password,
      }),
    onSuccess: async (_, data) => {
      await signIn(email, data.password);
      router.replace("/appointments");
    },
    onError: (error) => Alert.alert("Cadastro nao realizado", getErrorMessage(error)),
  });

  if (!email) {
    return (
      <Screen>
        <Header title="Primeiro acesso" subtitle="Volte ao login e valide seu email antes de criar a conta." />
        <Button title="Voltar para login" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Primeiro acesso" subtitle="Complete seu cadastro para acessar sua agenda." />
      <Card>
        <Text style={styles.email}>Email: {email}</Text>
        <View style={styles.form}>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField label="Nome completo" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={form.control}
            name="specialty"
            render={({ field, fieldState }) => (
              <TextField label="Especialidade" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField label="Senha" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField label="Confirmar senha" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Button
            title="Criar conta"
            loading={signupMutation.isPending}
            onPress={form.handleSubmit((data) => signupMutation.mutate(data))}
          />
          <Button title="Voltar" variant="secondary" onPress={() => router.replace("/login")} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  form: {
    gap: 14,
  },
});
