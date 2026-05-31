# 🏆 Bolão Copa 2026

App web privado para bolão da Copa do Mundo 2026 entre amigos. Login com Google, palpites de placar, pontuação automática e ranking. 100% gratuito (Firebase + GitHub Pages).

- **Stack:** React + Vite, Firebase Auth (Google), Firestore, GitHub Pages
- **Esta versão (Fase 1 / MVP):** login, palpites da fase de grupos + especiais, trava automática, painel admin para lançar resultados, ranking
- **Fase 2 (futuro):** mata-mata com confrontos dinâmicos e trava por jogo

---

## Pré-requisitos

- Node.js 20+ instalado
- Uma conta Google (para o Firebase e o GitHub)

---

## Passo a passo de configuração

### 1. Rodar localmente (teste rápido)

```bash
npm install
cp .env.example .env   # preencha depois do passo 2
npm run dev
```

Abre em `http://localhost:5173`.

### 2. Criar o projeto no Firebase

1. Acesse <https://console.firebase.google.com> → **Adicionar projeto** (pode desativar o Analytics).
2. No projeto: **Criar** → **Authentication** → aba **Sign-in method** → ative **Google** → salvar.
3. **Criar** → **Firestore Database** → **Criar banco de dados** → modo **produção** → escolha a região.
4. Engrenagem ⚙️ → **Configurações do projeto** → role até **Seus apps** → ícone **Web (`</>`)** → registre o app → copie o objeto `firebaseConfig`.
5. Cole os valores no arquivo `.env` (veja `.env.example`).

### 3. Publicar as regras de segurança

No Firestore → aba **Regras** → cole todo o conteúdo do arquivo [`firestore.rules`](./firestore.rules) → **Publicar**.

> Essas regras garantem: cada um só edita o próprio palpite; ninguém edita depois da trava; só o admin lança resultados; ninguém vira admin sozinho.

### 4. Subir no GitHub

```bash
git init
git add .
git commit -m "Bolão Copa 2026 - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bolao-copa-2026.git
git push -u origin main
```

### 5. Configurar segredos e Pages no GitHub

1. No repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crie um para cada variável (mesmos nomes do `.env`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
2. **Settings** → **Pages** → em **Build and deployment**, escolha **Source: GitHub Actions**.
3. Faça qualquer push em `main` (ou rode o workflow manualmente em **Actions**). O deploy publica em:
   `https://SEU_USUARIO.github.io/bolao-copa-2026/`

### 6. Autorizar o domínio do site no Firebase

Firebase → **Authentication** → **Settings** → **Authorized domains** → **Add domain** → adicione `SEU_USUARIO.github.io`.
(Sem isso, o login com Google falha no site publicado.)

### 7. Se tornar admin (uma vez)

**Método automático (recomendado):**
O email `mathersonvieira20@gmail.com` é configurado automaticamente como admin ao fazer login. Para adicionar outros admins, edite o array `ADMIN_EMAILS` em `src/lib/db.js`.

**Método manual (alternativo):**
1. Abra o site publicado e faça **login com Google** uma vez (isso cria seu usuário).
2. No Firebase → **Firestore Database** → coleção `users` → abra o documento com seu `uid` → mude o campo `isAdmin` de `false` para `true` (tipo boolean) → salvar.
3. Recarregue o site: a aba **Admin** aparece.

### 8. Preparar o bolão (como admin)

Na aba **Admin**:
1. Clique em **Importar calendário** (puxa os jogos da fase de grupos da base pública openfootball).
2. Defina a **data e hora de trava** (horário do 1º jogo da Copa) e salve. Depois desse momento, ninguém edita palpites.
3. Mande a URL do site para os amigos. Cada um loga e dá os palpites.
4. Durante a Copa: volte na aba Admin e lance o **placar oficial** de cada jogo. O ranking recalcula sozinho.
5. Ao fim: preencha o **gabarito dos especiais** (campeão, artilheiro, etc.).

---

## Pontuação

| Fase | Placar exato | Só resultado |
|---|---|---|
| Grupos | 5 | 2 |
| Oitavas | 7 | 3 |
| Quartas | 10 | 4 |
| Semifinal | 13 | 5 |
| Disputa 3º lugar | 8 | 3 |
| Final | 18 | 7 |

- Mata-mata: **+3** por acertar quem avança (Fase 2)
- Especiais: Campeão 20 · Artilheiro 12 · Melhor jogador 12 · Seleção surpresa 10
- Desempate no ranking: 1) total · 2) placares exatos · 3) resultados certos

Tudo isso fica em `src/lib/scoring.js` — é só editar lá se quiser mudar.

---

## Estrutura

```
src/
  firebase.js            inicializacao do Firebase
  lib/
    scoring.js           regras de pontuacao (ponto unico de verdade)
    db.js                acesso ao Firestore
    teams.js             bandeiras das selecoes
    useAuth.jsx          contexto de login
  components/
    Login.jsx
    Palpites.jsx         meus palpites + especiais (com trava)
    TodosPalpites.jsx    palpites de todos (visivel apos a trava)
    Ranking.jsx
    Admin.jsx            importar jogos, lancar resultados, trava, gabarito
firestore.rules          regras de seguranca
.github/workflows/deploy.yml   deploy automatico no GitHub Pages
```

---

## APIs de Dados da Copa 2026

Para importação automática de calendário e atualização de resultados em tempo real, existem várias opções:

### Opções Gratuitas:

1. **OpenFootball/worldcup.json** (atual)
   - Totalmente gratuito, sem API key
   - Dados estáticos (não tempo real)
   - URL: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
   - Usado atualmente para importar calendário

2. **API-Football** (api-football.com)
   - Plano gratuito disponível
   - Atualização a cada 15 segundos durante jogos
   - Cobre Copa 2026 (league=1, season=2026)
   - Requer API key (cadastro gratuito)

### Opções Pagas (Baixo Custo):

3. **WC2026 API** (wc2026api.com)
   - $4.99 (pagamento único válido até julho 2026)
   - 500 requisições/dia
   - Tempo real, específica para Copa 2026
   - Fixtures, scores, standings, stadium data

4. **Sportmonks**
   - EUR 55/mês (plano anual)
   - Fixtures, live scores, standings, squads
   - Widgets gratuitos

### Recomendação:

Para um bolão entre amigos (6 pessoas), a abordagem atual (importar calendário do OpenFootball + lançar resultados manualmente via Admin) é suficiente e 100% gratuita.

**Para sincronização automática em tempo real:** O projeto já está integrado com a API-Football! Basta configurar a API key gratuita no `.env`. Veja o guia completo em **[API_SETUP.md](./API_SETUP.md)**.

---

## Observações

- A `apiKey` do Firebase é **pública por design** — a segurança real está nas regras do Firestore. Não precisa escondê-la.
- Limites do tier grátis do Firebase sobram com folga para ~6 pessoas.
- Os escudos são emojis de bandeira (sem imagens externas). Se faltar alguma seleção, adicione em `src/lib/teams.js`.
