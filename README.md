# Gerador de Escala da Intercessão

![Logotipo Escala de Intercessores](image/logo.png)

> *"A seara é grande, mas os trabalhadores são poucos."* (Mateus 9:37)

O **Gerador de Escala da Intercessão** é mais do que uma ferramenta de agendamento; é uma resposta tecnológica para um desafio ministerial real: conciliar a vontade de servir com a complexidade da vida moderna.

Projetada como uma Aplicação Web Progressiva (PWA), esta ferramenta transforma a logística exaustiva de criação de escalas em um processo ágil, justo e transparente.

---

## 🎯 Por que esta ferramenta existe? (O Propósito)

Vivemos uma realidade onde um pequeno grupo de voluntários muitas vezes carrega a responsabilidade de múltiplos ministérios. Conciliar escalas de louvor, diaconia, ensino e intercessão — somado a compromissos de trabalho, viagens e descanso — manualmente é uma tarefa propensa a erros e geradora de desgaste.

**Esta aplicação foi criada para:**

1.  **Resolver o Quebra-Cabeça Logístico:** Automatizar o cruzamento de dados complexos (quem já está escalado em outro lugar? quem viaja nesta data? quem trabalha à noite?), algo que consome horas em planilhas manuais.
2.  **Honrar o Voluntário:** Evitar a sobrecarga (fadiga) e respeitar as restrições pessoais, garantindo que o intercessor sirva com alegria e não por obrigação exaustiva.
3.  **Libertar a Liderança:** Reduzir o tempo gasto com "engenharia de tabelas" para que o líder possa investir tempo no que realmente importa: o cuidado pastoral e espiritual da equipe.

---

## 📋 Funcionalidades Detalhadas

A aplicação cobre todo o ciclo de vida da gestão de escalas:

### 1. Gestão de Pessoas e Disponibilidade Inteligente
- **Cadastro Completo:** Registro de membros com nome, gênero e vínculo conjugal.
- **Gestão de "Vida Real":**
  - *Restrições Temporárias:* Férias, viagens ou licenças médicas (com datas de início e fim).
  - *Restrições Permanentes:* Indisponibilidade fixa (ex: "Trabalha toda Quarta-feira" ou "Serve no Louvor aos Domingos de Manhã").
  - *Suspensão Granular:* Capacidade de pausar um membro de atividades específicas (ex: ativo no WhatsApp, mas suspenso dos cultos presenciais).

### 2. Geração Automatizada com Regras de Negócio
Com um clique, o sistema gera a escala mensal aplicando regras de:
- **Equilíbrio de Carga:** Distribuição justa para que ninguém fique sobrecarregado enquanto outros estão ociosos.
- **Prevenção de Fadiga:** Alertas visuais se alguém for escalado em turnos consecutivos excessivos.
- **Compatibilidade:** Sugestão inteligente de duplas baseada em gênero.

### 3. Ferramentas Visuais de Gestão
- **Drag & Drop (Arrastar e Soltar):** Ajustes manuais fáceis com validação em tempo real.
- **Banco de Suplentes Inteligente:** Painel lateral que sugere substitutos disponíveis para um dia específico, ordenados por quem serviu menos.
- **Feedback Visual Rico:** Ícones claros para identificar status (suspenso, restrição, férias) diretamente na lista de seleção, garantindo que você nunca escale alguém indisponível por engano.
- **Vagas e Convidados:** Gestão flexível para "buracos" na escala ou convidados externos pontuais.

### 4. Integração e Dados
- **Importação/Exportação Excel (XLSX):** Facilidade para compartilhar a escala final ou trazer dados legados.
- **Nuvem (Firebase):** Sincronização em tempo real e autenticação segura.

---

## 🧠 O Motor da Escala: Lógica de Distribuição

O algoritmo segue uma hierarquia estrita para garantir a saúde da equipe:

1.  **Filtros de Exclusão (Quem NÃO pode?):** Remove candidatos com restrições de data, turno ou suspensões ativas.
2.  **Regras de Compatibilidade:** Prioriza a formação de duplas harmônicas.
3.  **Algoritmo de Justiça:** Utiliza um sistema de "pesos inversos" onde a probabilidade de ser escolhido diminui conforme o número de participações aumenta, nivelando a carga de trabalho ao longo do tempo.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 Moderno, JavaScript (ES6 Modules).
- **Backend as a Service:** Google Firebase (Realtime Database & Authentication).
- **Bibliotecas:** SheetJS (xlsx) para manipulação de planilhas.

---

*Desenvolvido para servir a quem serve.*

// ... (RESTANTE DO ARQUIVO JS MANTIDO) ...
```
