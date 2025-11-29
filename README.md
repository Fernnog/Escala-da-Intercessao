# Escala de Intercessores

![Logotipo Escala de Intercessores](image/logo.png)

**Escala de Intercessores** é uma aplicação web progressiva (PWA) e robusta, projetada para transformar a complexidade logística de escalas ministeriais em um processo simples, justo e transparente.

Diferente de planilhas estáticas, esta ferramenta opera com um motor de regras de negócio dinâmico que equilibra a frequência de participação, respeita restrições pessoais (férias, trabalho) e fornece análises estatísticas em tempo real para evitar a sobrecarga dos voluntários.

---

## 📋 Funcionalidades Detalhadas

A aplicação cobre todo o ciclo de vida da gestão de escalas:

### 1. Gestão de Pessoas e Disponibilidade
- **Cadastro Completo:** Registro de membros com nome, gênero e vínculo conjugal.
- **Vínculo de Cônjuges (Visual):** O sistema armazena quem é casado com quem para fornecer feedback visual na escala, permitindo que o líder identifique casais facilmente, sem forçar agrupamento automático.
- **Suspensão Granular:** Capacidade de suspender um membro de categorias específicas (ex: suspenso apenas do "Domingo", mas ativo no "WhatsApp"), mantendo o histórico de dados.
- **Restrições Temporárias e Permanentes:**
  - *Temporárias:* Férias, viagens ou licenças médicas (com datas de início e fim).
  - *Permanentes:* Indisponibilidade fixa (ex: "Trabalha toda Quarta-feira").

### 2. Geração Inteligente e Automatizada
Com um clique, o sistema gera a escala para o mês inteiro cobrindo:
- **Cultos Presenciais:** Quarta, Domingo (Manhã e Noite).
- **Reuniões Online:** Sábado.
- **Cobertura de Oração:** Escala diária via WhatsApp.

### 3. Ferramentas de Produtividade e Edição
- **Drag & Drop com Validação:** Arraste membros entre dias para fazer trocas. O sistema alerta em tempo real se a troca viola regras (gênero, suspensão ou choque de horários).
- **Painel de Suplentes Inteligente:** Ao clicar em um dia, uma barra lateral sugere substitutos disponíveis, ordenados por quem participou menos, facilitando a cobertura de buracos.
- **Modo Foco (Cinema View):** Uma visualização em tela cheia, livre de menus e distrações, ideal para apresentações ou momentos de planejamento profundo.
- **Banco de Vagas e Convidados:** Adicione "Convidados Externos" ou deixe "Vagas em Aberto" sinalizadas visualmente para preenchimento posterior.

### 4. Integração e Dados
- **Importação/Exportação Excel (XLSX):**
  - Carregue escalas antigas ou externas via planilha.
  - Exporte a escala finalizada para compartilhamento no Excel/Google Sheets.
- **Nuvem (Firebase):** Todos os dados, configurações e versões salvas das escalas são sincronizados na nuvem em tempo real.

---

## 🧠 O Motor da Escala: Regras e Lógica de Distribuição

O algoritmo de geração segue uma hierarquia estrita para garantir justiça:

### 1. Filtros de Exclusão (Quem NÃO pode?)
Antes de escolher alguém, o sistema remove candidatos que:
- ⛔ Possuem **Restrição Permanente** no turno.
- 🚫 Estão em período de **Restrição Temporária** (férias).
- ⏸️ Estão marcados como **Suspensos** para aquela atividade.
- ⚠️ **Regra de Fadiga:** O sistema evita escalar a mesma pessoa em 3 turnos de culto consecutivos (ex: escalado no Domingo Noite anterior, Quarta e Domingo Manhã atual).

### 2. Regras de Compatibilidade (Quem combina?)
- **Gênero:** Ao formar duplas, o sistema prioriza pares do mesmo gênero para promover afinidade e conforto na intercessão.
- **Neutralidade Conjugal:** O sistema **não força** mais o agrupamento automático de cônjuges. Isso evita que casais sejam sempre escalados juntos compulsoriamente, permitindo maior rotatividade e diversidade nas duplas.

### 3. Algoritmo de Justiça (Quem precisa trabalhar?)
- **Peso Inverso:** A probabilidade de ser escolhido é inversamente proporcional ao número de vezes que o membro já foi escalado.
- **Objetivo:** Nivelar a participação de todos, garantindo que ninguém fique sobrecarregado enquanto outros estão ociosos.

---

## 🎨 Interface e Feedback Visual

O design utiliza uma linguagem visual rica para fornecer informações rápidas:

- **💍 Ícone de Aliança:** Indica, no cartão do membro, que ele possui um cônjuge cadastrado. Ao passar o mouse, o nome do cônjuge é exibido.
- **🔋 Ícone de Bateria (Fadiga):** Um alerta laranja aparece se um membro for forçado manualmente a participar de muitos turnos consecutivos.
- **♀️/♂️ Indicadores de Gênero:** Cores sutis (fundo azulado/rosado) nos ícones para rápida identificação.
- **Índice de Equilíbrio:** Um gráfico de barra que mostra, em porcentagem (0 a 100%), o quão bem distribuída está a carga de trabalho da escala atual.

---

## 🚀 Tecnologias Utilizadas

Esta aplicação foi construída com foco em performance e manutenibilidade, utilizando padrões modernos de desenvolvimento web ("Vanilla" JS Moderno):

- **Frontend:** HTML5 Semântico, CSS3 (Grid/Flexbox, Variáveis CSS), JavaScript (ES6 Modules).
- **Backend as a Service:** Google Firebase (Realtime Database & Authentication).
- **Bibliotecas Auxiliares:**
  - *SheetJS (xlsx):* Para processamento de arquivos Excel.
  - *FontAwesome:* Para iconografia vetorial.

---

## 🛠️ Como Usar (Instalação Local)

1.  **Clonar o Repositório:**
    ```bash
    git clone https://github.com/seu-usuario/escala-de-intercessores.git
    ```
2.  **Configuração:**
    Não é necessário instalação de pacotes (npm/node) para rodar a versão cliente, pois utiliza módulos ES6 nativos do navegador.
3.  **Execução:**
    Abra o arquivo `index.html` diretamente em um navegador moderno (Chrome, Edge, Firefox) ou utilize uma extensão como "Live Server" no VS Code para melhor experiência.

---

*Desenvolvido com foco na excelência técnica e sensibilidade ministerial.*
```
