# Fluxos operacionais detalhados (rotas tRPC)

## Fluxo 1: Agendar nova consulta

- Objetivo: criar um agendamento valido com ou sem paciente (fluxo preferencial: sem paciente).

- Ordem exata dos steps no app:

1. Step 1 - Tempo da consulta: titulo (opcional), descricao (opcional), duracao.
2. Step 2 - Data e horario: selecionar data e depois horario disponivel.
3. Step 3 - Sala: escolher modo rotativo ou sala especifica e definir `roomId`.
4. Step 4 - Paciente: escolher sem paciente, paciente existente, ou cadastrar novo paciente inline.
5. Finalizar: executar criacao do agendamento.

- Procedures por step:

1. Step 1: sem chamada obrigatoria.
2. Step 2: `appointment.getAvailableRoomsForTime` (utilizado para calcular quais horarios possuem disponibilidade).
3. Step 3:
  - `contract.getContracts` (identificar restricoes de plano para selecao de sala).
  - `appointment.getAvailableRoomsForTime` (confirmar salas disponiveis no horario escolhido).
4. Step 4: `patient.list` e, se necessario, `patient.create`.
5. Finalizar: `appointment.createAppointment`.

### Procedures do fluxo

1. `appointment.getAvailableRoomsForTime`

- Entrada:

```json
{
  "date": "Date",
  "time": "HH:mm",
  "duration": 30
}
```

- Saida:

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string | null",
    "specialties": ["string"]
  }
]
```

2. `contract.getContracts`

- Entrada:

```json
{
  "limit": 20,
  "offset": 0
}
```

- Saida:

```json
{
  "data": [
    {
      "contractId": "number | string",
      "id": "number | string",
      "contractSummary": "string",
      "isActive": "boolean | string"
    }
  ],
  "pagination": {
    "total": "number"
  }
}
```

3. `patient.list`

- Entrada:

```json
{}
```

- Saida:

```json
[
  {
    "id": "string",
    "name": "string",
    "cpf": "string",
    "birthDate": "Date | string",
    "phone": "string"
  }
]
```

4. `patient.create` (quando for paciente novo)

- Entrada:

```json
{
  "name": "string",
  "cpf": "string (11 digitos)",
  "birthDate": "Date",
  "phone": "string (8-11 digitos)"
}
```

- Saida:

```json
{
  "id": "string",
  "name": "string",
  "cpf": "string",
  "birthDate": "Date | string",
  "phone": "string"
}
```

5. `appointment.createAppointment`

- Entrada:

```json
{
  "title": "string | undefined",
  "description": "string | undefined",
  "startTime": "Date",
  "endTime": "Date",
  "roomId": "string",
  "patientId": "string | undefined",
  "withoutPatient": "boolean"
}
```

- Saida esperada:

```json
{
  "id": "string",
  "status": "SCHEDULED | COMPLETED | CANCELED",
  "startTime": "Date | string",
  "endTime": "Date | string",
  "roomId": "string",
  "patientId": "string | null"
}
```

- Observacoes de regra no fluxo:

- Duracao valida: 30 a 120 minutos.
- Data nao pode ser anterior a hoje.
- Horario depende de disponibilidade.
- Se sem paciente, enviar `withoutPatient=true` e `patientId` vazio/undefined.
- Regras de sala dependem do plano (`contract.getContracts`) e da especialidade.

## Fluxo 2: Alterar especialidade

- Objetivo: atualizar especialidade do medico logado.

- Sequencia recomendada:

1. Buscar opcoes de especialidade.
2. Validar se a escolha esta na lista.
3. Persistir alteracao.

- Procedures do fluxo:

1. `settings.getSpecialtyOptions`

- Entrada:

```json
{}
```

- Saida:

```json
[
  {
    "id": "string",
    "name": "string"
  }
]
```

2. `settings.updateSpecialty`

- Entrada:

```json
{
  "specialty": "string | null"
}
```

- Saida esperada:

```json
{
  "success": true
}
```

Ou retorno sem payload relevante para UI.

## Fluxo 3: Ver meu plano

- Objetivo: listar contratos e detalhar contrato selecionado.

- Sequencia recomendada:

1. Listar contratos do usuario.
2. Selecionar `contractId` valido.
3. Buscar detalhes do contrato.

- Procedures do fluxo:

1. `contract.getContracts`

- Entrada:

```json
{
  "limit": 10,
  "offset": 0
}
```

- Saida:

```json
{
  "data": [
    {
      "contractId": "number | string",
      "id": "number | string",
      "contractSummary": "string",
      "isActive": "boolean | string"
    }
  ],
  "pagination": {
    "total": "number"
  }
}
```

2. `contract.getContractDetails`

- Entrada:

```json
{
  "contractId": "number"
}
```

- Saida:

```json
{
  "contractId": "number | string",
  "customerId": "number | string",
  "planId": "number | string",
  "paymentFrequency": "string",
  "startDate": "string",
  "endDate": "string",
  "dueDay": "number | string",
  "amount": "number | string",
  "isActive": "boolean | string",
  "contractSummary": "string"
}
```

- Regra de apresentacao no fluxo:

- Traduzir frequencia para pt-BR quando possivel (ex.: `monthly` -> `Mensal`).
- Formatar valor em BRL e datas em pt-BR.

## Fluxo 4: Listar consultas

- Objetivo: retornar consultas do medico com ou sem filtro de status.

- Sequencia recomendada:

1. Identificar se o usuario quer filtro (agendadas, concluidas, canceladas ou todas).
2. Buscar consultas com o status selecionado.
3. Exibir lista resumida (data/hora, paciente, sala, status).

- Procedure do fluxo:

1. `appointment.getUserAppointments`

- Entrada:

```json
{
  "status": "SCHEDULED | COMPLETED | CANCELED | undefined"
}
```

- Saida:

```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string | null",
    "startTime": "Date | string",
    "endTime": "Date | string",
    "status": "SCHEDULED | COMPLETED | CANCELED",
    "roomId": "string",
    "patientId": "string | null"
  }
]
```

- Regra de apresentacao no fluxo:

- Traduzir status para pt-BR (`SCHEDULED=Agendada`, `COMPLETED=Concluida`, `CANCELED=Cancelada`).
- Se nao houver resultado, informar claramente que nao existem consultas para o filtro.

## Fluxo 5: Cancelar consulta

- Objetivo: cancelar uma consulta existente elegivel.

- Sequencia recomendada:

1. Identificar consulta alvo (por id ou por contexto da listagem).
2. Validar se a consulta esta com status `SCHEDULED`.
3. Validar se a consulta ainda nao iniciou.
4. Confirmar intencao de cancelamento.
5. Executar cancelamento.

- Procedures do fluxo:

1. `appointment.getUserAppointments` (apoio para localizar consulta)

- Entrada:

```json
{
  "status": "SCHEDULED | COMPLETED | CANCELED | undefined"
}
```

- Saida:

```json
[
  {
    "id": "string",
    "title": "string",
    "startTime": "Date | string",
    "endTime": "Date | string",
    "status": "SCHEDULED | COMPLETED | CANCELED"
  }
]
```

2. `appointment.cancelAppointment`

- Entrada:

```json
{
  "id": "string"
}
```

- Saida esperada:

```json
{
  "success": true
}
```

## Fluxo 6: Checkout de consulta

- Objetivo: finalizar (checkout) uma consulta elegivel.

- Sequencia recomendada:

1. Identificar consulta alvo (normalmente da listagem de agendamentos).
2. Validar elegibilidade para checkout.
3. Confirmar intencao de finalizacao.
4. Executar checkout.

- Regras de elegibilidade no app:

- Status da consulta deve ser `SCHEDULED`.
- `conexaCheckInStatus` deve ser `COMPLETED`.
- Consulta precisa ter `conexaPersonId` e `conexaWorkspaceId` preenchidos.

- Procedures do fluxo:

1. `appointment.getUserAppointments` (apoio para localizar consulta elegivel)

- Entrada:

```json
{
  "status": "SCHEDULED | COMPLETED | CANCELED | undefined"
}
```

- Saida: mesma estrutura do Fluxo 4.

2. `appointment.checkoutAppointment`

- Entrada:

```json
{
  "id": "string"
}
```

- Saida esperada:

```json
{
  "success": true
}
```

Ou retorno de agendamento atualizado com status finalizado no backend.
