# Manual de Instalação no Windows — Kairós PDV 1.0

## 1. Requisitos do Sistema

- **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit ou 32-bit).
- **Processador:** Intel Celeron / Core i3 ou AMD equivalente (ou superior).
- **Memória RAM:** Mínimo de 2 GB (recomendado 4 GB).
- **Espaço em Disco:** 250 MB livres.
- **Internet:** **Não obrigatória**. O sistema opera 100% offline.
- **Periféricos Suportados:**
  - Leitores de código de barras USB (funciona como teclado HID).
  - Impressoras térmicas não fiscais (bobinas de 58 mm e 80 mm) e impressoras jato de tinta / laser comuns.
  - Gavetas de dinheiro automáticas ou manuais.

---

## 2. Tipos de Instaladores Disponíveis

O Kairós PDV é fornecido em duas versões executáveis:

1. **Instalador Oficial (`KairosPDV-Setup-1.0.0.exe`):**
   - Cria atalhos na Área de Trabalho e no Menu Iniciar do Windows.
   - Instalação no perfil do usuário (`%LOCALAPPDATA%\Programs\KairosPDV`), não exigindo permissões de administrador.
   - O banco de dados SQLite é mantido em `%APPDATA%\KairosPDV\kairos_pdv.sqlite`. Atualizações do programa **nunca** apagam ou substituem seu banco de dados de vendas.

2. **Versão Portátil (`KairosPDV-1.0.0-Portable.exe`):**
   - Não requer instalação.
   - Pode ser executada diretamente de um pendrive em qualquer computador com Windows.

---

## 3. Passo a Passo de Instalação

1. Dê um duplo clique no arquivo `KairosPDV-Setup-1.0.0.exe`.
2. Se o Windows Defender SmartScreen exibir um aviso de "Aplicativo desconhecido", clique em **Mais informações** e depois em **Executar assim mesmo**.
3. Escolha o local de instalação (ou mantenha o padrão recomendado).
4. Marque a opção **Criar atalho na Área de Trabalho**.
5. Clique em **Instalar** e aguarde alguns segundos.
6. Ao finalizar, clique em **Concluir**. O Kairós PDV será aberto automaticamente.

---

## 4. Primeiro Uso e Configuração Inicial

1. Ao abrir pela primeira vez, o Kairós PDV criará automaticamente seu banco SQLite local com produtos essenciais de demonstração.
2. Acesse a aba **Configurações**:
   - Digite o **Nome Fantasia** da sua loja.
   - Insira o **CNPJ** (opcional) e endereço para constar no topo dos comprovantes.
   - Escolha a largura do seu papel térmico (**80 mm** ou **58 mm**).
   - Defina se o comprovante deve ser impresso automaticamente ao finalizar a venda.
3. Clique em **Salvar Todas as Configurações**.
4. Acesse a aba **Caixa** e informe o valor em dinheiro do seu **fundo de troco inicial** (ex: R$ 100,00).
5. Pronto! O sistema está preparado para vendas.
