# 🔑 Como Configurar a API-Football (Sincronização Automática)

Este guia explica como obter uma API key gratuita da API-Football para habilitar a sincronização automática de resultados em tempo real.

---

## Por que usar a API-Football?

- ✅ **Plano gratuito** disponível
- ✅ Atualização a cada **15 segundos** durante os jogos
- ✅ Cobre todos os jogos da **Copa do Mundo 2026**
- ✅ Dados confiáveis e em tempo real
- ✅ Não precisa lançar resultados manualmente

---

## Passo a Passo

### 1. Criar conta na API-Football

1. Acesse: **https://www.api-football.com/**
2. Clique em **"Sign Up"** ou **"Get Started"**
3. Preencha o formulário:
   - Email
   - Senha
   - Nome (opcional)
4. Confirme seu email (verifique a caixa de entrada)

### 2. Obter sua API Key

1. Faça login em: **https://dashboard.api-football.com/**
2. No dashboard, você verá sua **API Key** logo na primeira página
3. Copie a API key (algo como: `abc123def456ghi789jkl012mno345pqr678`)

### 3. Adicionar a API Key no projeto

1. Abra o arquivo **`.env`** na raiz do projeto
2. Adicione a linha com sua API key:

```bash
VITE_API_FOOTBALL_KEY=abc123def456ghi789jkl012mno345pqr678
```

3. **Reinicie o servidor Vite**:

```bash
# Pare o servidor (Ctrl+C) e rode novamente
npm run dev
```

### 4. Verificar se funcionou

1. Faça login no app como admin
2. Vá na aba **"Admin"**
3. Na seção **"Lançar resultados oficiais"**:
   - ✅ Se configurado: Você verá o botão **"🔄 Sincronizar resultados (API-Football)"**
   - ❌ Se não configurado: Verá um aviso azul pedindo para configurar a API key

---

## Limites do Plano Gratuito

| Recurso | Limite |
|---------|--------|
| Requisições por dia | 100 |
| Requisições por minuto | Ilimitado |
| Acesso a dados históricos | Sim |
| Acesso a jogos ao vivo | Sim |
| Suporte | Comunidade |

**Dica:** 100 requisições/dia é mais que suficiente para um bolão entre amigos. Cada sincronização consome apenas 1 requisição para buscar todos os jogos finalizados.

---

## Como Usar a Sincronização

### Durante a Copa do Mundo:

1. **Antes dos jogos:** Importe o calendário normalmente (botão "Importar calendário")
2. **Depois dos jogos:** Clique em **"🔄 Sincronizar resultados"**
   - Busca todos os jogos finalizados
   - Atualiza automaticamente os placares
   - O ranking recalcula sozinho

### Sincronização Manual vs Automática:

| Opção | Quando usar |
|-------|-------------|
| **Sincronização (API)** | Durante a Copa, quando quiser atualizar vários jogos de uma vez |
| **Lançar manual** | Quando quiser corrigir um placar específico ou adicionar resultado de teste |

Ambas funcionam juntas! Você pode usar a API para a maioria dos jogos e lançar manualmente se precisar corrigir algo.

---

## Troubleshooting

### "VITE_API_FOOTBALL_KEY não configurada no .env"

- Verifique se você adicionou a variável no arquivo `.env` (não `.env.example`)
- Verifique se reiniciou o servidor Vite após editar o `.env`
- Certifique-se de que não há espaços extras na linha

### "API-Football error: 401"

- Sua API key está incorreta ou expirou
- Copie novamente do dashboard: https://dashboard.api-football.com/

### "API-Football error: 429"

- Você atingiu o limite de 100 requisições/dia
- Aguarde até o próximo dia ou lance resultados manualmente

### "Jogo não encontrado no Firestore"

- O nome dos times na API pode estar diferente do OpenFootball
- Edite o mapa `TEAM_NAME_MAP` em `src/lib/apiFootball.js` para adicionar o mapeamento

---

## Alternativas (Se Preferir Pago)

Se você quiser mais requisições ou recursos premium:

| API | Preço | Requisições/dia | Destaque |
|-----|-------|-----------------|----------|
| **API-Football Pro** | ~$15/mês | 3.000 | Dados estatísticos avançados |
| **WC2026 API** | $4.99 (one-time) | 500 | Específico para Copa 2026 |

Para um bolão entre amigos, o **plano gratuito é mais que suficiente**.

---

## Segurança

**⚠️ IMPORTANTE:**

- Sua API key deve ficar **apenas no arquivo `.env`**
- O arquivo `.env` está no `.gitignore` e **não será commitado**
- **Nunca** compartilhe sua API key publicamente
- Se vazar, regenere no dashboard da API-Football

---

Dúvidas? Abra uma issue no repositório ou consulte a documentação oficial:
- Documentação: https://www.api-football.com/documentation-v3
- Dashboard: https://dashboard.api-football.com/
