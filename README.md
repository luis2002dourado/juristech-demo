# JurisTech — Demonstração

Versão de demonstração do JurisTech, sistema de gestão para escritórios de
advocacia.

**Acesse:** https://luis2002dourado.github.io/juristech-demo/

## O que é

Uma versão navegável da interface, para apresentar o sistema a clientes.
Não há servidor: os dados são fictícios e ficam no seu próprio navegador.
Você pode cadastrar, editar e excluir à vontade — o botão *Reiniciar
demonstração* devolve tudo ao estado inicial.

## O que dá para mostrar

- Painel com indicadores do escritório
- Clientes e funil de leads (CRM)
- Processos, prazos e andamentos
- Atividades com cronômetro (timesheet)
- Financeiro: honorários, despesas e inadimplência
- Controle de acesso por perfil e trilha de auditoria

Recursos que dependem de servidor — envio de arquivos, backup, verificação
em duas etapas e consulta real ao CNJ — aparecem, mas ficam desativados.

## Versão completa

O sistema real roda com backend próprio, banco de dados por escritório,
integração com a API pública do DataJud (CNJ) e 208 testes automatizados.

Este repositório contém **apenas** a interface de demonstração.
