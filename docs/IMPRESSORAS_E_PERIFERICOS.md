# Guia de Impressoras e Periféricos Homologados — Kairós PDV 1.0

O Kairós PDV utiliza o subsistema de impressão nativo do Windows e bibliotecas de decodificação de periféricos padrão HID. Isso garante máxima compatibilidade com equipamentos amplamente encontrados no varejo brasileiro.

---

## 1. Impressoras Térmicas Homologadas

O sistema possui formatação dedicada para bobinas de **80 mm** e **58 mm**, além de impressoras comuns A4.

### Modelos de 80 mm (Recomendados para Comércio em Geral):
- **Epson:**
  - Epson TM-T20X
  - Epson TM-T88V / TM-T88VI
- **Elgin:**
  - Elgin i9
  - Elgin i8
  - Elgin i7
- **Bematech:**
  - Bematech MP-4200 TH
  - Bematech MP-100S TH
- **Daruma:**
  - Daruma DR800
- **Modelos Genéricos POS-80:**
  - Xprinter XP-N160II / XP-Q90EC
  - Mini Impressoras USB/Rede 80mm

### Modelos de 58 mm (Bobina Estreita / Mini PDV):
- Elgin Mini PDV M8 / M10
- Xprinter XP-58IIH
- POS-58 USB / Bluetooth
- Impressoras térmicas portáteis de recibo

### Impressoras Convencionais:
- Qualquer impressora Jato de Tinta ou Laser instalada no Windows (HP, Epson EcoTank, Canon, Brother).

---

## 2. Configuração de Margens e Papel

Para obter a melhor impressão térmica no Windows:
1. Acesse o **Painel de Controle** > **Dispositivos e Impressoras**.
2. Clique com o botão direito na sua impressora térmica e selecione **Preferências de Impressão**.
3. Defina o tamanho do papel como **80 x 297 mm** ou **58 x 297 mm** (ou papel contínuo `Roll Paper`).
4. Nas **Configurações do Kairós PDV**, selecione a mesma largura escolhida (**80mm** ou **58mm**).
5. Clique em **Testar Impressão** para validar o alinhamento.

---

## 3. Leitores de Código de Barras Compatíveis

O Kairós PDV é compatível com qualquer leitor de código de barras que funcione no modo **Emulação de Teclado (USB HID)**:

- **Leitores Manuais Laser / CCD:**
  - Bematech BR-400 / BR-500
  - Elgin Flash / Quick
  - Honeywell Voyager 1250g / 1200g
  - Datalogic QuickScan Lite QW2100
  - Leitores USB genéricos plug-and-play
- **Leitores Sem Fio (Wireless 2.4GHz / Bluetooth):**
  - Leitores com dongle USB receptor funcionam imediatamente sem drivers adicionais.
- **Leitores Fixos de Mesa (Omnidirecionais):**
  - Honeywell Orbit 7120 / 7190g
  - Elgin Fix / EL8600

> **Dica técnica:** Quase todos os leitores de código de barras saem de fábrica configurados para enviar um caractere `ENTER` após a leitura do código. O Kairós PDV possui um debounce e listener específico para capturar essa quebra de linha sem adicionar itens duplicados no carrinho.
