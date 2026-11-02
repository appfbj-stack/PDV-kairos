# Manual Rápido do Operador de Caixa — Kairós PDV 1.0

Este guia reúne as instruções essenciais para a operação diária no ponto de venda.

---

## 1. Tabela de Atalhos de Teclado

O Kairós PDV foi desenvolvido para operar quase inteiramente pelo teclado, sem exigir o mouse para cada produto:

| Tecla de Atalho | Ação Executada |
| :--- | :--- |
| **F1** | Retorna imediatamente à **Tela de Vendas (PDV)** |
| **F2** | Abre a janela **Localizar Produto** por nome ou categoria |
| **F3** | Abre o **Cadastro Rápido de Novo Produto** |
| **F4** | Foca no campo de **Desconto** (em R$ ou %) |
| **F5** | Abre a tela de **Pagamento e Finalização** da venda |
| **F6** | **Reimprime o comprovante** da última venda |
| **ESC** | Fecha janelas abertas ou **cancela a venda em andamento** |
| **Delete** | **Remove o item selecionado** do carrinho de compras |
| **Enter** | Confirma a leitura do código ou finaliza o pagamento |

---

## 2. Como Registrar uma Venda

1. Certifique-se de que o cursor está no campo de código de barras (o sistema mantém o foco automaticamente).
2. Aponte o leitor de código de barras para a embalagem do produto.
3. Ao bipar:
   - Um bipe sonoro confirma o item.
   - O produto é adicionado na lista com quantidade **1**.
   - Se o mesmo produto for lido novamente, a quantidade aumenta para **2**, recalculando o total na hora.
4. Para alterar a quantidade manualmente, use os botões **+** e **-** ou digite a quantidade desejada.
5. Se o cliente tiver desconto autorizado:
   - Pressione **F4**.
   - Digite o valor em reais (ex: `5,00`) ou a porcentagem (ex: `10%`).
6. Pressione **F5** para abrir as opções de pagamento.

---

## 3. Recebimento do Pagamento

Na tela de pagamento (**F5**):
- **Dinheiro:**
  - O sistema calcula o total. Digite o valor entregue pelo cliente ou use os botões rápidos de cédulas (+R$ 10, +R$ 20, +R$ 50, +R$ 100).
  - O **Troco a devolver** é exibido em verde com fonte muito grande.
  - Se o valor recebido for insuficiente, o sistema impede a confirmação para evitar perdas financeiras.
- **Pix:**
  - O sistema exibe a chave Pix e o QR Code na tela. O operador deve verificar a confirmação no celular ou banco antes de confirmar.
- **Cartão de Débito / Crédito:**
  - Solicite a aproximação ou inserção do cartão na maquininha física (POS). Confirme após a aprovação da maquininha.
- Pressione **Enter** para gravar a venda.
- O estoque é baixado automaticamente e o comprovante é impresso.

---

## 4. Abertura e Fechamento de Caixa

### Abertura (Início do Turno):
1. Acesse a aba **Caixa**.
2. Clique em **Abrir Caixa**.
3. Informe o valor do **fundo de troco** em dinheiro presente na gaveta e clique em **Confirmar**.

### Sangria e Suprimento:
- **Sangria:** Quando houver muito dinheiro na gaveta, faça uma sangria para retirar notas e guardar no cofre. Informe o valor e o motivo.
- **Suprimento:** Quando faltar troco e for adicionado mais dinheiro à gaveta, registre um suprimento com o valor e a justificativa.

### Fechamento (Fim do Turno):
1. Clique em **Fechar Caixa**.
2. Conte fisicamente todo o dinheiro em cédulas e moedas na gaveta.
3. Digite o valor contado no campo **Valor Contado Fisicamente**.
4. O sistema compara o valor físico com o saldo calculado pelo sistema e aponta se houve **Conferência Exata**, **Sobra** ou **Falta**.
5. Clique em **Confirmar Fechamento** e imprima o **Comprovante de Fechamento de Caixa** para assinar e arquivar.
