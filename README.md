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
    seedData.js          calendario da fase de grupos (dados locais)
    resultsSync.js       sincroniza placares da TheSportsDB
    classificacao.js     classificacao dos grupos
    playoffs.js          geracao do chaveamento do mata-mata
    faseConfig.js        travas das fases (grupos / mata-mata)
    inputs.js            helpers de input numerico
    players2026.js       lista de jogadores (palpites especiais)
    teams.js             bandeiras das selecoes
    useAuth.jsx          contexto de login
  components/
    Login.jsx
    Grupos.jsx           palpites da fase de grupos
    MataMata.jsx         palpites do mata-mata
    Palpites.jsx         palpites especiais (campeao, artilheiro, etc.)
    Hoje.jsx             jogos do dia + palpites de todos (apos a trava)
    Ranking.jsx          classificacao do bolao
    Admin.jsx            importar jogos, lancar/sincronizar resultados, trava, gabarito
    SelectBusca.jsx      dropdown com busca (selecoes/jogadores)
firestore.rules          regras de seguranca
.github/workflows/deploy.yml   deploy automatico no GitHub Pages
```

---

## APIs de Dados da Copa 2026

O app usa duas fontes públicas e gratuitas, sem necessidade de API key:

1. **Calendário dos jogos** — **OpenFootball/worldcup.json**
   - Gratuito, sem chave. Lista os 104 jogos com times e datas.
   - URL: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
   - Usado pelo Admin no botão "Importar calendário".

2. **Placares dos jogos** — **TheSportsDB** (liga `4429`)
   - Gratuito, usa a chave de teste pública `3` (sem cadastro).
   - Tem a Copa 2026 com placares dos jogos finalizados.
   - Endpoint: `eventsday.php?d=YYYY-MM-DD&l=4429` (ver `src/lib/resultsSync.js`).

### Como a atualização de placares funciona

A sincronização roda sozinha quando alguém abre as abas **Hoje**, **Ranking** ou
**Grupos** — busca os jogos finalizados na TheSportsDB e grava só o que mudou.
Apenas o **admin** consegue gravar em `results` (regra do Firestore), então na
prática basta o admin abrir o app depois dos jogos. O Admin também tem um botão
"🔄 Sincronizar resultados agora" e o **lançamento manual** de placar como rede
de segurança.

> Observação: a antiga integração com a API-Football foi removida — a temporada
> 2026 dela só está disponível nos planos pagos, então não servia para este uso.

---

## Observações

- A `apiKey` do Firebase é **pública por design** — a segurança real está nas regras do Firestore. Não precisa escondê-la.
- Limites do tier grátis do Firebase sobram com folga para ~6 pessoas.
- Os escudos são emojis de bandeira (sem imagens externas). Se faltar alguma seleção, adicione em `src/lib/teams.js`.
