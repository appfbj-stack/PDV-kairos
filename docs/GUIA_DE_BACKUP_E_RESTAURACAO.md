# Guia de Backup e Restauração de Dados — Kairós PDV 1.0

A proteção dos dados comerciais é fundamental para a sobrevivência de qualquer comércio. O Kairós PDV foi projetado com mecanismos de segurança que protegem o comerciante contra panes no computador, quedas de energia e arquivos corrompidos.

---

## 1. Princípios do Backup no Kairós PDV

- **Formato `.kpdv`:** Arquivo padronizado contendo o snapshot completo de todas as tabelas:
  - Cadastro de Produtos (preços, unidades e códigos)
  - Vendas Realizadas e Itens de Venda Históricos
  - Histórico de Sessões de Caixa, Sangrias e Suprimentos
  - Auditoria completa de Movimentações de Estoque
  - Configurações da Loja
- **Integridade Criptográfica (Checksum):** Cada cópia possui um hash de integridade gerado no momento da gravação. Se o arquivo sofrer corrupção ou corte incompleto, a restauração é abortada preventivamente.
- **Ponto de Restauração de Rollback:** Antes de sobrescrever qualquer tabela durante uma restauração, o Kairós PDV gera um snapshot automático do estado atual. Se houver qualquer falha durante a leitura, o sistema desfaz as alterações e mantém o comércio operacional.

---

## 2. Como Fazer uma Cópia de Segurança Agora

1. No menu superior do Kairós PDV, clique na aba **Backup e Dados**.
2. Clique no botão verde **Fazer Backup Agora**.
3. O sistema gerará um arquivo com o padrão `kairos_pdv_backup_AAAA-MM-DD-HH-MM-SS.kpdv`.
4. Salve o arquivo na pasta padrão de backups ou diretamente em um **pendrive** conectado ao computador.
5. **Recomendação Semanal:** Copie o arquivo gerado para outro dispositivo físico (como pendrive ou HD externo) ou para uma pasta sincronizada com o Google Drive / OneDrive.

---

## 3. Como Restaurar um Backup Anterior

1. Acesse a aba **Backup e Dados**.
2. Clique no botão azul **Selecionar Arquivo .kpdv**.
3. Escolha o arquivo de backup desejado.
4. O sistema solicitará a confirmação de segurança.
5. Ao confirmar:
   - O checksum do arquivo é validado.
   - O ponto de restauração é criado.
   - As tabelas são sincronizadas.
   - Uma mensagem de sucesso confirma o término da restauração.

---

## 4. Exportação de Script SQL SQLite (.sql)

Para técnicos de informática ou comerciantes que desejam manipular os dados externamente:
1. Na tela de Backup, clique em **Gerar Script SQLite (.sql)**.
2. O arquivo exportado contém as instruções padrão:
   - `PRAGMA foreign_keys = ON;`
   - `CREATE TABLE IF NOT EXISTS ...`
   - `INSERT INTO products ...`
   - `INSERT INTO sales ...`
3. O arquivo pode ser importado em ferramentas como o **DB Browser for SQLite**, **DBeaver** ou via linha de comando do SQLite.
