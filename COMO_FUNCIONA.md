# 🏆 Como Funciona o Bolão da Copa 2026

## 📅 Timeline do Bolão

### **ANTES da Copa começar (até 11/06/2026 13h)**
- ✅ Todos podem dar palpites
- ✅ Todos podem editar palpites quantas vezes quiser
- ✅ Ninguém vê os palpites dos outros (sigilo total)
- ✅ Admin pode ajustar a data de trava se necessário

### **DEPOIS que a Copa começar (11/06/2026 13h em diante)**
- 🔒 **TRAVA AUTOMÁTICA** - ninguém edita mais nada
- 👀 Todos passam a ver os palpites de todos (aba "Todos")
- 📊 Ranking começa a funcionar conforme resultados são lançados
- 🎯 Admin lança os resultados reais dos jogos

---

## 🎮 Fluxo Completo

### 1️⃣ **Primeiro Acesso (Qualquer Usuário)**
```
Login com Google → App cria automaticamente 48 jogos da fase de grupos
```

**O que é criado:**
- 8 grupos (A-H) com 6 seleções cada
- 6 jogos por grupo (cada time joga 2 vezes)
- Trava configurada para 11/06/2026 às 13h (jogo de abertura)
- Times realistas baseados nas classificatórias

### 2️⃣ **Dar Palpites (Antes da Trava)**
```
Meus palpites → Preencher placares → Ver classificação → Salvar
```

**O que você palpita:**

**Fase de Grupos (48 jogos):**
- Placar de cada jogo (ex: Brasil 3 x 1 Senegal)
- Conforme preenche, vê a tabela de classificação
- Top 2 de cada grupo classificam para oitavas

**Especiais:**
- 🏆 Campeão (20 pts)
- ⚽ Artilheiro (12 pts)
- 🌟 Melhor Jogador (12 pts)
- 🎭 Seleção Surpresa (10 pts)

### 3️⃣ **Tabela de Classificação (Seu Palpite)**

Conforme você preenche os jogos de um grupo, aparece **automaticamente** a tabela:

```
📊 CLASSIFICAÇÃO (baseada nos seus palpites)

Pos  Time         Pts  J  V  E  D  GP  GC  SG
1º   🇧🇷 Brasil    6   2  2  0  0   7   1  +6  ← Classifica
2º   🇲🇦 Marrocos  6   2  2  0  0   5   1  +4  ← Classifica
3º   🇸🇳 Senegal   3   2  1  0  1   2   3  -1
4º   🇳🇬 Nigéria   1   2  0  1  1   2   5  -3
5º   🇲🇱 Mali      0   2  0  0  2   1   5  -4  ← Eliminado
6º   🇨🇲 Camarões  1   2  0  1  1   1   3  -2  ← Eliminado
```

**Cores:**
- 🟢 Verde: Top 2 (classificam para oitavas)
- 🔴 Vermelho: Bottom 2 (eliminados)

### 4️⃣ **Durante a Copa (Após Trava)**

**Para Admin:**
```
Admin → Lançar resultados oficiais → Preencher placares → Salvar
```

Opções:
- **Manual**: Preencher placar por placar
- **Automática** (se API configurada): Sincronizar resultados da API-Football

**Para Todos:**
```
Ranking → Ver pontuação atualizar → Torcer!
```

- Ranking recalcula automaticamente
- Conforme resultados são lançados, pontos são somados
- Desempate: total > placares exatos > resultados certos

### 5️⃣ **Fim da Copa**

**Admin preenche o gabarito dos especiais:**
- Campeão
- Artilheiro
- Melhor Jogador
- Seleção Surpresa

**Ranking final:**
- Vencedor do bolão revelado!
- Todo mundo vê quem foi o campeão dos palpites

---

## 📊 Pontuação

### Fase de Grupos
| Acerto | Pontos |
|--------|--------|
| Placar exato (ex: 2x1 = 2x1) | **5 pts** |
| Só resultado (ex: vitória Brasil) | **2 pts** |
| Errou | 0 pts |

### Mata-Mata (Fase 2 - Futuro)
| Fase | Placar Exato | Só Resultado |
|------|--------------|--------------|
| Oitavas | 7 pts | 3 pts |
| Quartas | 10 pts | 4 pts |
| Semifinal | 13 pts | 5 pts |
| 3º lugar | 8 pts | 3 pts |
| Final | 18 pts | 7 pts |

### Especiais
| Palpite | Pontos |
|---------|--------|
| Campeão | 20 pts |
| Artilheiro | 12 pts |
| Melhor Jogador | 12 pts |
| Seleção Surpresa | 10 pts |

---

## 🔒 Trava Automática

### Como Funciona
```javascript
if (Date.now() >= travaGruposTimestamp) {
  // Ninguém edita mais palpites
  // Todos veem os palpites de todos
}
```

### Data da Trava
- **Padrão**: 11/06/2026 às 13h (jogo de abertura)
- **Configurável**: Admin pode mudar em Admin > Configuração

### O Que Trava
- ✅ Palpites de jogos
- ✅ Palpites especiais
- ✅ Tudo congela automaticamente

### O Que NÃO Trava
- ❌ Admin continua lançando resultados
- ❌ Ranking continua atualizando
- ❌ Todos continuam vendo tudo

---

## 🎯 Visualização dos Palpites

### Antes da Trava
- ❌ Ninguém vê palpites alheios
- ✅ Só você vê seus próprios palpites
- ✅ Aba "Todos" mostra aviso de sigilo

### Depois da Trava
- ✅ Todos veem todos os palpites
- ✅ Aba "Todos" mostra tabela completa
- ✅ Transparência total

---

## 👥 Permissões

### Usuário Normal
- ✅ Dar palpites (antes da trava)
- ✅ Editar palpites (antes da trava)
- ✅ Ver próprios palpites (sempre)
- ✅ Ver palpites de todos (após trava)
- ✅ Ver ranking (sempre)
- ❌ Importar calendário
- ❌ Lançar resultados
- ❌ Definir trava
- ❌ Virar admin

### Admin (`mathersonvieira20@gmail.com`)
- ✅ Tudo que usuário normal faz
- ✅ Importar calendário (opcional - já vem pronto)
- ✅ Lançar resultados oficiais
- ✅ Sincronizar resultados (se API configurada)
- ✅ Definir data de trava
- ✅ Preencher gabarito dos especiais

---

## ⚙️ Configurações

### Admin Automático
Para adicionar mais admins, edite `src/lib/db.js`:
```javascript
const ADMIN_EMAILS = [
  "mathersonvieira20@gmail.com",
  "outro@email.com", // Adicione aqui
];
```

### Alterar Data de Trava
Admin > Configuração > Data e hora de trava > Salvar trava

### API-Football (Opcional)
Para sincronização automática de resultados:
1. Obtenha API key em https://www.api-football.com/
2. Adicione no `.env`: `VITE_API_FOOTBALL_KEY=sua_key`
3. Reinicie o servidor
4. Admin > Sincronizar resultados

---

## 🚀 Resumo do Fluxo

1. **Login** → Jogos criados automaticamente
2. **Dar palpites** → Ver classificação em tempo real
3. **Salvar** → Editar quantas vezes quiser até a trava
4. **11/06/2026 13h** → TRAVA AUTOMÁTICA
5. **Durante Copa** → Admin lança resultados
6. **Ranking atualiza** → Conforme resultados aparecem
7. **Fim da Copa** → Campeão do bolão revelado!

---

## 💡 Dicas

- **Preencha todos os grupos** para ver todas as classificações
- **Salve sempre** para não perder seus palpites
- **Volte a editar** antes da trava se mudar de ideia
- **Acompanhe o ranking** conforme a Copa acontece
- **Divirta-se!** É só um jogo entre amigos 😄

---

Dúvidas? Problemas? Manda mensagem pro admin!
