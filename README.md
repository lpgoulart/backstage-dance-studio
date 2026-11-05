# Backstage Studio de Dança — site + sistema de gestão

Site institucional e sistema de gestão do **Backstage Studio de Dança** (Manaus/AM).

```
backstage/
├── backend/    API REST · Node 22 + Express 5 + SQLite nativo (node:sqlite) + JWT + Swagger
└── frontend/   React 18 + Vite · Framer Motion · Recharts · React Router
```

## Demo online

| | URL |
|---|---|
| Site (GitHub Pages) | https://lpgoulart.github.io/backstage-dance-studio/ |
| API (Render) | https://backstage-dance-studio-api.onrender.com |
| Swagger | https://backstage-dance-studio-api.onrender.com/api/docs |

### Como o deploy funciona
- **Frontend → GitHub Pages**: a cada push na `main`, o workflow `.github/workflows/deploy-frontend.yml` compila o React com `VITE_BASE=/backstage-dance-studio/` e `VITE_API_URL` (URL da API) e publica na branch `gh-pages`. Em *Settings → Pages*, a fonte deve ser **Deploy from a branch → gh-pages / (root)**.
- **Backend → Render**: o arquivo `render.yaml` descreve o serviço (Node 22, `rootDir: backend`, health check em `/api/health`, `JWT_SECRET` gerado automaticamente e `CORS_ORIGIN` liberando o GitHub Pages). Para criar: [Deploy to Render](https://render.com/deploy?repo=https://github.com/lpgoulart/backstage-dance-studio).
- Se o Render atribuir outra URL ao serviço, crie a variável de repositório **`API_URL`** (*Settings → Secrets and variables → Actions → Variables*) com a URL e rode o workflow novamente.

> **Plano gratuito do Render:** o serviço "dorme" após 15 min sem uso — a primeira requisição pode levar ~50 s. O SQLite fica no disco efêmero: os dados voltam ao estado de demonstração a cada novo deploy ou reinício (ótimo para demo; para produção use um disco persistente ou Postgres).

## Como rodar

Requisito: **Node.js 22.13+** (o SQLite vem embutido, sem compilação nativa).

```bash
cd backend && npm install && npm run dev      # API em http://localhost:4000
cd frontend && npm install && npm run dev     # Site em http://localhost:5173
```

Na primeira execução o banco (`backend/data/backstage.db`) é criado e populado com dados de demonstração
(~95 alunos, 12 turmas, 12 semanas de chamada, 6 meses de mensalidades, eventos e projetos).
Para recriar do zero: `cd backend && npm run reset`.

**Documentação da API (Swagger):** http://localhost:4000/api/docs · spec OpenAPI em `/api/openapi.json`

**Produção:** `cd frontend && npm run build` — o backend passa a servir o `frontend/dist` na mesma porta.
Defina `JWT_SECRET` e (opcionalmente) `PORT`, `DB_PATH`, `CORS_ORIGIN`.

### Contas de demonstração (senha `backstage123`)

| Perfil | E-mail | O que vê |
|---|---|---|
| Gestão | `admin@backstage.com` | Sistema completo de gestão |
| Professora | `professora@backstage.com` | Área do professor (Carolina Reis) |
| Responsável | `responsavel@backstage.com` | Portal com 2 filhos (Sofia e Miguel) |
| Aluna adulta | `aluna@backstage.com` | Portal da própria aluna (Larissa) |

> Remova os atalhos de demonstração em `frontend/src/pages/Login.jsx` e troque as senhas antes de publicar.

## O que tem

### Site público
- **Início** — hero com holofote que segue o cursor e feixes de luz, letreiro de modalidades, contadores animados, próximos eventos, projetos em destaque, depoimentos e CTA de aula experimental. Cortina de abertura uma vez por sessão.
- **Sobre** — história, missão, valores, linha do tempo e equipe.
- **Projetos** — trabalhos e espetáculos com filtro por categoria.
- **Eventos** — próximos e passados + avisos públicos.
- **Horários** — grade pública por dia e modalidade.
- **Contato** — formulário (cai na caixa de mensagens da gestão), WhatsApp, Instagram e mapa.
- Todo o conteúdo (faixa de aviso, hero, números, modalidades, sobre, equipe, contato, eventos, projetos, avisos) é **editável pela gestão**.
- Movimento com `prefers-reduced-motion` respeitado.

### Portal do aluno / responsável
- Responsável com vários filhos alterna entre eles no topo.
- **Início** com contagem regressiva ao vivo para a próxima aula.
- **Agenda** semanal + **exportar para o calendário** (`.ics` recorrente para Google/Apple/Outlook).
- **Jornada de palco** (a surpresa): XP por presença e sequência, níveis inspirados em passos de ballet (Plié → Grand Jeté → Estrela do Palco) e 7 conquistas desbloqueáveis.
- **Frequência** em mapa de calor de 12 semanas.
- **Eventos** com confirmação de presença (Vou / Talvez / Não vou).
- **Mensalidades** e **mural de avisos** (públicos + exclusivos para alunos).

### Área do professor (`/professor`)
- **Painel**: contagem regressiva para a próxima aula, aulas de hoje (com status e atalho para chamada), **chamadas pendentes** dos últimos 14 dias, alunos, presença média, aulas e horas do mês e **ganho estimado do mês**.
- Frequência semanal das turmas, **aniversariantes** dos próximos 30 dias, alunos com presença abaixo de 70% e eventos do estúdio.
- **Minhas turmas**: lista de alunos com idade, nível, presença em 30 dias, últimas 5 chamadas, observações (alergias, restrições) e WhatsApp do responsável.
- **Chamada** apenas das próprias turmas (sem datas futuras).
- **Diário de aula**: registro do que foi trabalhado em cada aula.
- **Meu perfil**: contato, bio, especialidades (aparecem no site) e troca de senha. Exportação das aulas para o calendário (.ics).
- A gestão cria, altera ou revoga o acesso em *Professores → ficha → Acesso à Área do professor*. Professor desligado perde o acesso automaticamente.

### Gestão
- **Dashboard**: alunos ativos, frequência vs. período anterior, receita do mês, ocupação, crescimento em 12 meses, matrículas por modalidade, receita em 6 meses, frequência semanal, movimento por dia, faixa etária, ocupação por turma, **alunos em risco de evasão** e confirmações em eventos.
- **Alunos**: busca/filtros, ficha completa, cadastro com criação de responsável e login do aluno, matrícula em turmas.
- **Turmas**: CRUD com vários dias/horários por turma, professor, sala, vagas e cor.
- **Grade semanal**: todas as aulas por dia e horário, com filtro por professor e sala.
- **Chamada**: presente / atrasado / falta por turma e data.
- **Financeiro**: mensalidades por mês e status, gerar cobranças do mês, confirmar pagamento.
- **Conteúdo do site**: CMS de tudo o que aparece no site.
- **Mensagens** do formulário de contato.

## Idiomas (PT / EN) e responsividade

- **Português é o padrão.** O seletor **PT | EN** fica no topo do site, no login e em todas as áreas logadas; a escolha fica salva no navegador. Links com `?lang=en` abrem direto em inglês.
- Somente os **textos fixos da interface** são traduzidos (menus, botões, rótulos, mensagens, datas e valores). **Conteúdo cadastrado pela equipe** (textos do site, eventos, projetos, avisos, turmas, bios) aparece exatamente como foi digitado.
- Traduções em `frontend/src/i18n/en.js` — a chave é o próprio texto em português. Para um novo texto: `t('Texto em português')` e a tradução no dicionário. Variáveis: `t('{n} alunos', { n })`.
- A API responde mensagens de erro em inglês quando recebe `Accept-Language: en` (o frontend envia automaticamente).
- Todas as telas foram ajustadas para celular: tabelas viram cartões, a grade semanal empilha por dia e os formulários se reorganizam.

### Diários de aula (gestão)
*Gestão → Diários de aula* mostra, somente leitura, tudo o que os professores registraram, agrupado por turma, com filtros por professor, turma e busca no texto. Atalhos na ficha do professor e no painel da turma.

## API

| Grupo | Prefixo | Acesso |
|---|---|---|
| Autenticação | `/api/auth` | público / logado |
| Site público | `/api/public` | público |
| Portal | `/api/portal` | `guardian`, `student` (só os próprios alunos) |
| Gestão | `/api/admin` | `manager` |

59 rotas / 85 operações, todas descritas no Swagger com schemas e exemplos.
Autentique em `POST /api/auth/login` e use **Authorize** com o token.

## Sobre o conteúdo

Bio, 18 anos de história, Manaus, "parte dos bastidores" e os projetos (mostras semestrais 2023–2026, Disney 25')
vêm do Instagram [@backstage_studiodedanca](https://www.instagram.com/backstage_studiodedanca/).
**Professores, endereço, telefone, valores, depoimentos e números são fictícios** e devem ser ajustados pelo painel
*Gestão → Conteúdo do site* (ou no seed em `backend/src/seed.js`). Projetos e eventos aceitam URL de imagem
para usar as fotos reais do estúdio.
