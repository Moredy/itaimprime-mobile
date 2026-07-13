import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SelectField } from "@/components/SelectField";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateView";
import { TextField } from "@/components/TextField";
import { queryKeys } from "@/lib/queryKeys";
import { trpcClient } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const signupSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
    specialty: z.string(),
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

  const specialtyOptionsQuery = useQuery({
    queryKey: queryKeys.specialtyOptions,
    queryFn: () => trpcClient.auth.getSignupSpecialtyOptions.query() as Promise<Array<{ id: string; name: string }>>,
  });

  const specialtyOptions = (specialtyOptionsQuery.data ?? []).map((option) => ({ label: option.name, value: option.name }));
  const isSelectedSpecialtyValid = (value: string) => specialtyOptions.some((option) => option.value === value);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: params.name ?? "",
      specialty: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const specialtyFromParams = params.specialty ?? "";
    if (specialtyFromParams && isSelectedSpecialtyValid(specialtyFromParams)) {
      form.setValue("specialty", specialtyFromParams, { shouldValidate: true });
      return;
    }

    form.setValue("specialty", "", { shouldValidate: false });
  }, [form, isSelectedSpecialtyValid, params.specialty]);

  const signupMutation = useMutation({
    mutationFn: (data: z.infer<typeof signupSchema>) => {
      if (data.specialty && !isSelectedSpecialtyValid(data.specialty)) {
        throw new Error("Selecione uma especialidade valida da lista.");
      }

      return trpcClient.auth.signup.mutate({
        email,
        name: data.name.trim(),
        specialty: data.specialty || null,
        password: data.password,
      });
    },
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
              <View style={styles.fieldBlock}>
                {specialtyOptionsQuery.isLoading ? <LoadingState label="Carregando especialidades..." /> : null}
                <SelectField
                  label="Especialidade"
                  value={isSelectedSpecialtyValid(field.value) ? field.value : ""}
                  onValueChange={field.onChange}
                  options={specialtyOptions}
                  placeholder="Sem especialidade"
                  enabled={specialtyOptions.length > 0}
                  error={fieldState.error?.message}
                />
              </View>
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
  fieldBlock: {
    gap: 6,
  },
});
