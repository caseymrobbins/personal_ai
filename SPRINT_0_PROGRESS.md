# Sprint 0: Architecture and Foundation - Progress Report

## Overview
Sprint 0 establishes the foundational triad of the SML Guardian system: UI framework, local-first database, and state management. This sprint validates core technology choices before beginning feature development.

## Completed Tasks (4/6)

### ✅ TASK-001: Initialize React + TypeScript + Vite Project
**Status:** Complete

**Deliverables:**
- ✅ Vite + React + TypeScript project structure
- ✅ Package.json with core dependencies (React, Zustand, sql.js)
- ✅ TypeScript configuration (strict mode)
- ✅ ESLint configuration
- ✅ Build system validated

**Key Files:**
- `package.json` - Dependency management
- `tsconfig.json` - TypeScript strict configuration
- `vite.config.ts` - Vite build configuration with WASM support

---

### ✅ TASK-002: Build POC for WASM-SQLite
**Status:** Complete

**Validated Capabilities:**
1. ✅ **Initialization:** SQLite WASM loads successfully in browser
2. ✅ **Full SQL Support:** CREATE, INSERT, SELECT with complex queries
3. ✅ **Analytics Queries:** AVG(), GROUP BY for Step 4 (ARI/RDI)
4. ✅ **Persistence:** localStorage integration for durability
5. ✅ **Exit & Portability:** Export database as `.db` file (AC-AI principle)

**Key Files:**
- `src/services/db.service.ts` - Database service singleton
- `src/components/DatabasePOC.tsx` - Interactive POC demonstration

**Technical Details:**
- Using `sql.js` (official SQLite WASM port)
- Database size: ~2-4KB for schema + test data
- Export format: Standard SQLite3 `.db` file
- Performance: Sufficient for local-first analytics

**Proof of Concept Results:**
```
✅ Initialize WASM-SQLite
✅ Create schema (5 tables)
✅ Insert test data
✅ Query data (SELECT)
✅ Analytics query (AVG aggregation)
✅ Save to localStorage
✅ Export to .db file
```

---

### ✅ TASK-005: Define Initial Database Schema
**Status:** Complete

**Deliverables:**
- ✅ Complete SQL schema based on Table 1.3.1 specification
- ✅ Privacy-by-design: Segregated chat vs. governance data
- ✅ All 5 tables implemented with proper indexes

**Schema Implementation:**

#### Tables Created:
1. **conversations** - Conversation metadata with UUID primary keys
2. **chat_messages** - Messages with trace_data for "Inspect" feature (Step 5)
3. **api_keys** - Encrypted BYOK storage (Step 3)
4. **governance_log** - Privacy-preserving ARI/RDI metrics (Step 4)
5. **user_preferences** - Key-value configuration store

#### Key Design Decisions:
- **Privacy:** `governance_log` stores ONLY metrics, not raw text
- **Security:** API keys stored as encrypted BLOBs
- **Analytics:** Full SQL support enables complex ARI/RDI calculations
- **Portability:** Standard SQLite format ensures data ownership

**Key Files:**
- `src/db/schema.sql` - Formal SQL schema with documentation
- `src/db/init.ts` - Schema initialization and validation logic
- `src/vite-env.d.ts` - TypeScript declarations for `.sql?raw` imports

---

### ✅ TASK-006: Set up Zustand Store and Baseline React Components
**Status:** Complete

**Deliverables:**
- ✅ Global state management with Zustand
- ✅ ModuleStatusIndicator component (Step 5)
- ✅ ChatLayout component architecture
- ✅ Demo of state transitions

**State Management:**

#### Zustand Store (`src/store/chat.store.ts`):
- **ModuleState tracking:** IDLE, LOCAL_ROUTING, SCRUBBING, EXTERNAL_API, etc.
- **AbortController:** For "Humanity Override" (Step 5)
- **Session password:** In-memory only (never persisted)
- **Type-safe:** Full TypeScript integration

#### React Components:

1. **ModuleStatusIndicator** (`src/components/ModuleStatusIndicator.tsx`)
   - Real-time status display
   - Animated state transitions
   - Color-coded by module type
   - "Always show which module is thinking" (Step 5 requirement)

2. **ChatLayout** (`src/components/ChatLayout.tsx`)
   - Application shell
   - Header with branding
   - Responsive layout
   - Integrates ModuleStatusIndicator

**Key Files:**
- `src/store/chat.store.ts` - Zustand global state
- `src/components/ModuleStatusIndicator.tsx` - Status display
- `src/components/ChatLayout.tsx` - Main layout
- `src/components/index.ts` - Component exports

**Demo Features:**
- ✅ Button to simulate module state transitions
- ✅ Real-time status indicator updates
- ✅ Visual feedback for each state (emoji + color)

---

## Pending Tasks (2/6)

### ⏳ TASK-003: Build POC for WebLLM + Phi-3 Mini
**Status:** Pending

**Planned Validation:**
- WebLLM initialization
- Phi-3-mini model loading (q4 quantized)
- Inference speed benchmark
- Streaming response support
- OpenAI API compatibility verification

**Dependencies:**
- Requires installation of `@mlc-ai/web-llm`
- ~2-4GB model download (for full test)
- WebGPU support validation

---

### ⏳ TASK-004: Build POC for Transformers.js
**Status:** Pending

**Planned Validation:**
- Zero-shot classification (for Guardian-Nano)
- Embedding model (for RDI)
- Performance benchmarks
- Bundle size analysis

**Dependencies:**
- Requires installation of `@xenova/transformers`
- Model selection: Small classification + embedding models
- ONNX Runtime validation

---

## Technical Stack Validation

### ✅ Confirmed Technologies:
| Component | Technology | Status | Notes |
|-----------|-----------|--------|-------|
| UI Framework | React 18 + TypeScript | ✅ Working | Strict mode enabled |
| State Management | Zustand 4.5 | ✅ Working | Minimal boilerplate |
| Database | SQLite WASM (sql.js) | ✅ Working | Full SQL, export working |
| Build Tool | Vite 5.4 | ✅ Working | Fast, WASM-compatible |
| Package Manager | npm | ✅ Working | 209 packages installed |

### ⏳ Pending Validation:
| Component | Technology | Status | Blocker |
|-----------|-----------|--------|---------|
| SML Engine | WebLLM + Phi-3 | ⏳ Pending | TASK-003 |
| Guardian-Nano | Transformers.js | ⏳ Pending | TASK-004 |

---

## Build Status

### Current Build:
```
✅ TypeScript compilation: PASS
✅ Vite production build: PASS
✅ Bundle size: 201.72 KB (gzipped: 66.68 KB)
✅ CSS bundle: 2.72 KB (gzipped: 1.07 KB)
```

### Warnings:
- `fs`, `path`, `crypto` externalized for browser (expected for sql.js)
- 2 moderate npm audit vulnerabilities (dev dependencies, not critical)

---

## Architecture Validation

### ✅ Proven Capabilities:

1. **Local-First Persistence**
   - WASM-SQLite working in browser
   - localStorage backup working
   - Database export to `.db` file successful
   - **Validates:** Step 1 (Local-First Core)

2. **Privacy-by-Design Schema**
   - Segregated chat vs. governance data
   - Metrics-only storage (no raw text in governance_log)
   - **Validates:** Step 4 (Conscience Module) data model

3. **Exit & Portability**
   - One-click database export
   - Standard SQLite format
   - **Validates:** Step 3 (AC-AI "Exit & Portability")

4. **Module-Aware UI**
   - Real-time state tracking
   - Visual feedback for each AI module
   - **Validates:** Step 5 ("Always show which module is thinking")

---

## Next Steps

### Immediate (Complete Sprint 0):
1. **TASK-003:** Validate WebLLM + Phi-3-mini
   - Install dependencies
   - Test model loading (may use smaller model for POC)
   - Verify OpenAI API compatibility

2. **TASK-004:** Validate Transformers.js
   - Install dependencies
   - Test classification pipeline
   - Test embedding generation

### After Sprint 0:
- **Sprint 1:** Begin implementation of core chat loop
- Focus on Guardian-Maximus integration (full Phi-3 model)
- Implement basic local chat interface

---

## Files Created (Sprint 0)

### Configuration:
- `package.json`
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`
- `.eslintrc.cjs`

### Database:
- `src/services/db.service.ts`
- `src/db/schema.sql`
- `src/db/init.ts`

### State Management:
- `src/store/chat.store.ts`

### Components:
- `src/components/DatabasePOC.tsx`
- `src/components/ModuleStatusIndicator.tsx`
- `src/components/ChatLayout.tsx`
- `src/components/index.ts`

### Styles:
- `src/App.css`
- `src/index.css`
- `src/components/ModuleStatusIndicator.css`
- `src/components/ChatLayout.css`

### Application:
- `src/App.tsx`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `index.html`

---

## Sprint 0 Progress: 67% Complete (4/6 tasks)

**Ready for:** TASK-003 (WebLLM POC) and TASK-004 (Transformers.js POC)

**Estimated completion:** 2 more tasks (~4-6 hours given complexity of model integration)
