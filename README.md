# SML Guardian: Local-First AI Chat with Privacy & Autonomy

**A privacy-first, autonomy-preserving AI chat system that runs entirely in your browser.**

SML Guardian is a demonstration of "Shielded Machine Learning" principles - maintaining user privacy and cognitive independence while interacting with AI. All data stays on your device, PII is anonymized before external API calls, and the system actively helps you maintain critical thinking skills.

---

## 🌟 Key Features

### 🔒 **Privacy by Design**
- **100% Local Data Storage**: WASM-SQLite database in your browser
- **Automatic PII Anonymization**: Scrubs sensitive info before external API calls
- **Original Text Restoration**: PII restored in responses you see
- **Full Data Export**: Download your entire database anytime (.db file)
- **Custom Sensitive Keywords**: Define your own terms to anonymize

### 🧠 **Cognitive Independence**
- **ARI (Autonomy Retention Index)**: Tracks if you're over-relying on AI
- **Socratic Co-pilot Mode**: Guiding questions when autonomy drops
- **RDI (Reality Drift Index)**: Detects topic drift & potential hallucinations
- **Transparent AI Processing**: See exactly what's happening at each step

### 👁️ **Complete Transparency**
- **Module Status Indicator**: Real-time display of AI processing state
- **Trace Inspector**: Visualize data flow through privacy layers
- **Humanity Override**: Stop external API calls instantly (🛑 button)
- **Governance Dashboard**: View ARI metrics and trends

### 💬 **Full-Featured Chat**
- **Conversation Management**: Create, rename, delete, switch between chats
- **Export Conversations**: Download chat history as JSON
- **Local & External AI**: Choose between privacy (local) or power (GPT-4/Claude)
- **Conversation Sidebar**: Easy navigation between chats

### ⚙️ **User Control**
- **Settings Modal**: Configure all features via polished UI
- **Customizable Thresholds**: Set your own ARI/RDI alert levels
- **Toggle Features**: Enable/disable Socratic mode, module status, etc.
- **Theme Support**: Dark/Light/Auto modes (ready for implementation)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Firefox, Edge, Safari)
- OpenAI/Anthropic API key (for external AI adapters)

### Installation

```bash
# Clone the repository
git clone https://github.com/caseymrobbins/personal_ai
cd personal_ai

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First Launch

1. **Visit**: Open `http://localhost:5173` in your browser
2. **Setup API Keys** (optional):
   - Click "⚙️ Settings" button
   - Navigate to API Key Manager
   - Add your OpenAI or Anthropic API key
3. **Start Chatting**: Type a message and see the system in action!

---

## 📚 Architecture

### Core Principles

**1. Privacy-by-Design**
```
User Input → Local Anonymization → External API → Local Restoration → User Output
             ↓ (only anonymized)    ↓ (never sees)   ↓ (original restored)
```

**2. Autonomy-by-Default**
```
User Prompt → ARI Calculation → If Low → Socratic Guidance → Critical Thinking
```

**3. Transparency-Always**
```
AI Process → Module State → User Visibility → User Control (Stop Button)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Database** | WASM-SQLite (sql.js) - local, browser-based |
| **AI Models** | Transformers.js (embeddings), OpenAI/Anthropic APIs |
| **State** | Zustand (global state) |
| **Styling** | CSS Modules, responsive design |
| **Privacy** | WebCrypto API (encryption), local anonymization |

### Database Schema

```sql
-- Conversations & Messages
conversations (id, title, created_at)
chat_messages (id, conversation_id, role, content, module_used, trace_data, timestamp)

-- Privacy & Security
api_keys (service_id, encrypted_key, added_at)

-- Governance & Metrics (Privacy-Preserving)
governance_log (
  id, timestamp,
  user_prompt_hash,           -- SHA-256 (NOT reversible)
  lexical_density,            -- ARI component
  syntactic_complexity,       -- ARI component
  prompt_embedding           -- 384D vector for RDI
)

-- User Preferences
user_preferences (key, value)  -- JSON key-value store
```

---

## 🎯 Features Deep Dive

### Sprint 3: Active Director Interface
**Transparency & Control**
- Real-time module state display
- 🔍 **Inspect Button**: Data flow visualization
- 🛑 **Stop Button**: Cancel external API requests
- Color-coded states with animations

### Sprint 4: Conversation Management
**Multi-Conversation Support**
- Sidebar with all conversations
- Create, rename, delete conversations
- Export as JSON
- Relative timestamps

### Sprint 5: ARI (Autonomy Retention Index)
**Tracking Cognitive Independence**

```
ARI = (Lexical Density × 0.6) + (Syntactic Complexity × 0.4)
```

**Thresholds**:
- Excellent (>= 0.65): Strong autonomy
- Good (0.4-0.65): Engaged
- Needs Attention (< 0.4): Over-reliance

### Sprint 6: RDI (Reality Drift Index)
**Detecting Topic Drift**

Uses 384D semantic embeddings to detect when conversation topics shift unexpectedly.

```
RDI = 1 - average_similarity_to_recent_prompts
```

Alerts when RDI > 0.6 (high drift, possible hallucination).

### Sprint 7: Socratic Co-pilot Mode
**Guided Critical Thinking**

Triggers when ARI < 0.4. Provides guiding questions instead of direct answers.

### Sprint 9: User Preferences
**Full Control**

Settings modal with:
- General: Theme, Socratic mode, ARI threshold
- Privacy: Sensitive keywords
- Advanced: RDI threshold, export/import/reset

---

## 🔐 Privacy & Security

### Local-First Architecture
- SQLite database in browser (WASM)
- Stored in localStorage
- No server, no cloud

### Anonymization
```typescript
// Before API: "My project Foo at Acme" → "My project [REDACTED_0] at [REDACTED_1]"
// After API: "[REDACTED_0] docs" → "Foo docs"
```

### What Never Leaves Your Device
- Original conversation text
- Governance metrics
- User preferences

---

## 📊 Development

### Project Structure
```
src/
├── components/         # React components
├── services/          # Business logic
├── modules/adapters/  # AI adapters
├── store/             # Global state
└── db/                # Database schema
```

### Build
```bash
npm run build  # → dist/ (1.14 MB JS, 39 KB CSS)
```

---

## 🚀 Deployment

Deploy to Vercel, Netlify, or GitHub Pages:

```bash
npm run build
vercel --prod  # or netlify deploy --prod
```

---

## 📈 Roadmap

### Completed ✅
- Privacy & Modularity Framework
- Active Director Interface
- Conversation Management
- ARI Tracking
- RDI with Embeddings
- Socratic Co-pilot
- User Preferences

### Future 🚀
- Semantic search
- Fact-checking
- Local LLM support
- Voice interface

---

## 📄 License

MIT License

---

**Built with privacy, autonomy, and transparency in mind.** 🛡️🧠👁️

**SML Guardian** - Because your data and your mind belong to you.
