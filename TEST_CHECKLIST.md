# Checklist final de testes

## Autenticacao

- Validar email existente no Conexa e local.
- Validar email existente no Conexa e ausente local, abrindo primeiro acesso.
- Criar conta no primeiro acesso e entrar automaticamente.
- Fazer login, fechar e reabrir o app mantendo sessao.
- Fazer logout e confirmar bloqueio de abas privadas.
- Solicitar redefinicao de senha e conferir pedido pendente no painel admin web.
- Testar usuario inativo e confirmar bloqueio.

## Pacientes

- Listar pacientes do medico logado.
- Buscar por nome, CPF e telefone.
- Criar paciente com CPF e telefone formatados.
- Editar nome, CPF, telefone e data de nascimento.
- Excluir paciente sem agendamento futuro.
- Tentar excluir paciente com agendamento futuro e confirmar erro do backend.

## Agendamentos

- Listar agendamentos agendados, concluidos, cancelados e todos.
- Criar agendamento por sala selecionando slot disponivel.
- Criar agendamento por horario selecionando sala disponivel.
- Criar agendamento com paciente.
- Criar agendamento sem paciente quando permitido.
- Tentar criar conflito de sala e confirmar bloqueio.
- Tentar criar conflito de medico em salas diferentes e confirmar bloqueio.
- Tentar agendar fora do horario da clinica ou do medico.
- Editar data, horario, sala, titulo, descricao e paciente.
- Cancelar agendamento.
- Confirmar que o status Conexa/check-in exibido no app bate com o web.

## Ajustes do medico

- Atualizar especialidade.

## Publicacao

- Rodar `npm run typecheck`.
- Rodar `npm run lint`.
- Gerar build preview Android.
- Gerar build preview iOS.
- Testar login em build preview contra homolog.
- Conferir icone, splash, nome e identificadores.
- Gerar build production Android.
- Gerar build production iOS.
- Submeter para Play Store e App Store.
