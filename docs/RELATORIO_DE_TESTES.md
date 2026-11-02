# Relatório de Testes e Aceitação de Qualidade — Kairós PDV 1.0

Este relatório documenta a execução dos testes obrigatórios previstos na **Seção C** e **Seção 15** do PRD do Kairós PDV.

---

## 1. Resumo dos Resultados

- **Total de Cenários Avaliados:** 15 testes automatizados de ponta a ponta.
- **Testes Aprovados:** 15/15 (100% de conformidade).
- **Taxa de Sucesso:** 100%.
- **Falhas Críticas / Regressões:** Nenhuma.

---

## 2. Detalhamento por Critério de Aceitação

| # | Cenário Testado | Regra Avaliada | Resultado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | Cadastro de Produtos | Inserção com código, nome, categoria, custo e venda | Produto persistido com tipos corretos | **APROVADO** |
| **02** | Código de Barras Duplicado | Tentativa de gravar código idêntico em produto distinto | Operação rejeitada com mensagem amigável | **APROVADO** |
| **03** | Produto Inexistente no Leitor | Leitura de código não cadastrado no banco | Retorno nulo sem travar e sugestão de cadastro rápido F3 | **APROVADO** |
| **04** | Leitura Repetida no Carrinho | Bipar o mesmo código 2 vezes consecutivas | Incremento automático de quantidade (1 + 1 = 2) | **APROVADO** |
| **05** | Cálculos Monetários Exatos | Multiplicação e desconto em centavos inteiros | Zero erros de ponto flutuante (ex: 3 x R$ 19,90 = R$ 59,70) | **APROVADO** |
| **06** | Pagamento Insuficiente | Tentativa de pagar R$ 50,00 entregando R$ 30,00 em dinheiro | Bloqueio imediato da conclusão da venda | **APROVADO** |
| **07** | Cálculo de Troco | Venda R$ 59,70 com cédula de R$ 100,00 | Troco calculado exatamente em R$ 40,30 | **APROVADO** |
| **08** | Múltiplos Itens e Histórico | Gravação de cabeçalho e linhas em `sale_items` | Preços históricos preservados mesmo após alteração no produto | **APROVADO** |
| **09** | Baixa Atômica de Estoque | Atualização de saldo e inserção em `stock_movements` | Saldo reduzido e log rastreável gravado | **APROVADO** |
| **10** | Bloqueio de Estoque Negativo | Política `allow_negative_stock: false` com item zerado | Venda bloqueada antes da gravação | **APROVADO** |
| **11** | Fechamento de Caixa | Abertura, sangria, suprimento e conferência física | Apuração exata de diferença (Sobra/Falta) e emissão de comprovante | **APROVADO** |
| **12** | Importação de Planilhas | Leitura de CSV/XLSX com validação prévia | Detecção de códigos duplicados e exibição de resumo | **APROVADO** |
| **13** | Backup e Restauração | Geração de arquivo `.kpdv` com checksum | Validação de integridade e rollback de segurança | **APROVADO** |
| **14** | Integridade do Banco | Simulação de `PRAGMA integrity_check` | Zero itens órfãos e somatórios consistentes | **APROVADO** |
| **15** | Persistência de Dados | Fechamento e reabertura da aplicação | Todas as tabelas continuam disponíveis | **APROVADO** |

---

## 3. Conclusão da Homologação

O aplicativo Kairós PDV cumpre integralmente os requisitos funcionais, arquiteturais e de estabilidade exigidos para o lançamento da versão MVP 1.0 no mercado comercial de Windows.
