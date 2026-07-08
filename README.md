# Agenda Medica Mobile

App mobile Expo para medicos agendarem consultas usando o backend Next.js/tRPC existente.

## Arquitetura

- Cliente mobile apenas com Expo, React Native e TypeScript.
- Regras de negocio continuam no backend.
- O app chama somente `/api/trpc` e `/api/auth`.
- Conexa continua indireta pelo backend. O app nunca recebe credenciais Conexa.
- O cron `/api/cron/conexa-checkin` e de uso servidor e nao e chamado pelo app.
- Nao existe area administrativa no mobile.

## Ambientes

Copie `.env.example` para `.env` e ajuste:

```bash
APP_ENV=dev
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Para Android em emulador, use normalmente `http://10.0.2.2:3000` se o backend estiver na maquina host.

Ambientes aceitos:

- `APP_ENV=dev`
- `APP_ENV=homolog`
- `APP_ENV=prod`

`EXPO_PUBLIC_API_URL` sempre deve apontar para a origem do backend Next.js, sem `/api/trpc` no final.

## Execucao local

Instale dependencias:

```bash
npm install
```

Rode o backend web em outro terminal:

```bash
cd ../agendamento-medico-web
npm run dev
```

Rode o app:

```bash
npm run start
```

Android:

```bash
npm run android
```

iOS:

```bash
npm run ios
```

No iOS e necessario macOS com Xcode. Para Expo Go, garanta que o telefone consiga acessar a URL do backend configurada em `EXPO_PUBLIC_API_URL`.

## Build com EAS

Autentique e vincule o projeto:

```bash
npx eas login
npx eas init
```

Atualize `extra.eas.projectId` em `app.config.ts` se necessario.

Build interno:

```bash
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

Build de producao:

```bash
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

Submit:

```bash
npx eas submit --profile production --platform android
npx eas submit --profile production --platform ios
```

Antes da publicacao, configure icones/splash definitivos, bundle id/package definitivos, certificados Apple e credenciais Play Console.

## Fluxos incluidos

- Login por email e senha via NextAuth credentials.
- Primeiro acesso com validacao previa em `auth.checkUserStatus`.
- Solicitacao de redefinicao de senha via `auth.requestPasswordReset`.
- Persistencia segura do cookie de sessao com `expo-secure-store`.
- Rotas privadas protegidas.
- Lista, criacao, edicao e exclusao de pacientes.
- Lista, criacao, edicao e cancelamento de agendamentos.
- Disponibilidade por sala com `appointment.getAvailableSlots`.
- Disponibilidade por horario com `appointment.getAvailableRoomsForTime`.
- Status de check-in Conexa exibido a partir do retorno do backend.
- Ajustes do medico: antecedencia minima, especialidade, tipos de consulta e horarios de atendimento.

## Validacao tecnica

```bash
npm run typecheck
npm run lint
```

Se a autenticacao falhar no dispositivo fisico, confira:

- `EXPO_PUBLIC_API_URL` acessivel pelo aparelho.
- `NEXTAUTH_URL` no backend apontando para a mesma origem.
- Uso de HTTPS em homolog/prod para cookies seguros.
- CORS/proxy/reverse proxy preservando `Set-Cookie` e `Cookie`.
