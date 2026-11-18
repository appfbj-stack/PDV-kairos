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

O Kairós PDV pode ser usado de **duas formas**:

**A) Instalado no Windows (offline, recommended para o balcão)** — duas versões executáveis:

1. **Instalador Oficial (`KairosPDV-Setup-1.0.0.exe`):**
   - Cria atalhos na Área de Trabalho e no Menu Iniciar do Windows.
   - Instalação no perfil do usuário (`%LOCALAPPDATA%\Programs\KairosPDV`), não exigindo permissões de administrador.
   - Os dados de vendas ficam gravados localmente no computador, em `%APPDATA%\Kairós PDV\Local Storage\` (armazenamento local do navegador embarcado). Atualizações do programa **nunca** apagam ou substituem esses dados — e o botão **Backup** permite salvá-los em arquivo `.kpdv`.

2. **Versão Portátil (`KairosPDV-1.0.0-Portable.exe`):**
   - Não requer instalação.
   - Pode ser executada diretamente de um pendrive em qualquer computador com Windows.

**B) Como aplicativo web (PWA) — sem instalar nada:**

- **Link:** https://appfbj-stack.github.io/PDV-kairos/
- Abra o link no Chrome ou Edge (computador ou celular) e use o menu do navegador para **"Instalar aplicativo"**. O Kairós PDV passa a ter ícone próprio na área de trabalho / tela inicial e abre em janela própria.
- Funciona **offline** depois da primeira visita (o app fica em cache no aparelho).
- ⚠️ **A PWA é uma versão de teste/demo**: ela **não** pede chave de licença (a trava de licença fica no aplicativo instalado no Windows). Para o balcão, use a versão instalada.
- ⚠️ **Os dados da PWA ficam no `localStorage` do navegador** e são **separados** da versão instalada no Windows. Para levar os dados de uma versão para a outra, use **Backup** (arquivo `.kpdv`) e restaure no destino.
- A PWA é a forma mais rápida de testar o sistema antes de instalar no PC do balcão.

---

## 3. Passo a Passo de Instalação

1. Dê um duplo clique no arquivo `KairosPDV-Setup-1.0.0.exe`.
2. Se o Windows Defender SmartScreen exibir um aviso de "Aplicativo desconhecido", clique em **Mais informações** e depois em **Executar assim mesmo**.
3. Escolha o local de instalação (ou mantenha o padrão recomendado).
4. Marque a opção **Criar atalho na Área de Trabalho**.
5. Clique em **Instalar** e aguarde alguns segundos.
6. Ao finalizar, clique em **Concluir**. O Kairós PDV será aberto automaticamente.

---

## 4. Ativação da Licença

A versão instalada no Windows é **licenciada**: ela abre somente depois que a Kairós libera o uso.

1. Ao abrir pela primeira vez, o Kairós PDV mostra a tela **"Ative seu Kairós PDV"** (o app ainda não abre).
2. Cole a chave de licença recebida da Kairós (começa com `KAIROS-`) e clique em **Ativar licença**.
3. Pronto: o Kairós PDV abre normalmente.

**Códigos de computador (importante)**

- A tela de ativação mostra o código do aparelho, no formato `EQP-XXXXXXXXXXXX`.
- A licença fica **vinculada a esse computador**: copiar o instalador (ou a pasta inteira) para outro PC **não abre** — a tela de ativação volta a aparecer.
- Se a Kairós te mandar uma chave já presa a um aparelho específico, informe o `EQP-…` que aparece na sua tela para ela gerar a chave certa.
- Cada licença vale em **um computador só**. Se você precisar trocar de máquina, fale com a Kairós para liberar a sua.

**Sem internet na hora da ativação**

- O PDV foi feito para funcionar **offline**. Se o computador estiver sem internet no momento da ativação, a chave é aceita localmente e o app abre normalmente.
- A Kairós registra a ativação na **Central Kairós** assim que o app voltar a ter internet (na próxima abertura do programa). É por lá que a licença pode ser suspensa, se necessário.

---

## 5. Primeiro Uso e Configuração Inicial

1. Ao abrir pela primeira vez, o Kairós PDV prepara o armazenamento local e já carrega produtos essenciais de demonstração.
2. Acesse a aba **Configurações**:
   - Digite o **Nome Fantasia** da sua loja.
   - Insira o **CNPJ** (opcional) e endereço para constar no topo dos comprovantes.
   - Escolha a largura do seu papel térmico (**80 mm** ou **58 mm**).
   - Defina se o comprovante deve ser impresso automaticamente ao finalizar a venda.
3. Clique em **Salvar Todas as Configurações**.
4. Acesse a aba **Caixa** e informe o valor em dinheiro do seu **fundo de troco inicial** (ex: R$ 100,00).
5. Pronto! O sistema está preparado para vendas.
