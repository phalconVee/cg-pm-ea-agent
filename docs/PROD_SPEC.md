
# 📄 Product Requirements Document (PRD)

## Product Name
**TurboTax Chat-First Filing Experience (MVP Demo)**

---

## Objective

Create a **ChatGPT-like, chat-first TurboTax experience** where customers can:
- Ask tax questions
- Understand changes to their return
- Perform simulated filing actions
- Navigate the product **without traditional flows**

This MVP is **demo-only**:
- No real backend
- No real tax calculations
- All state is mocked / client-side
- The goal is to **prove the interaction model**, not accuracy

---

## Problem Statement

TurboTax today relies on **flow-based navigation and topic-driven UX**, which:
- Requires users to understand where they are
- Forces context switching
- Makes simple questions feel complex

Users increasingly expect:
- A **single conversational surface**
- Persistent context
- Seamless transitions between *learning* and *doing*

---

## Success Definition (MVP)

A user can:
1. Open TurboTax
2. Interact **only via chat**
3. Ask questions, fix issues, and “file” their return
4. Never get lost or forced into a flow
5. Feel like this is **real TurboTax**, not a chatbot demo

---

## Core Product Principles

1. **Chat is the primary interface**
2. **User never manages context**
3. **One conversation, many jobs**
4. **Every answer can lead to action**
5. **Feels like TurboTax, not ChatGPT**

---

## MVP Feature Set

### 4. Invisible Agent Orchestration (P0)

**Description**  
Simulate multiple internal “agents” without exposing them to the user.

**Agents (Internal Only)**  
- **Executive Chat Agent** – Owns the conversation, maintains context, and orchestrates all other agents  
- **Explanation Agent** – Handles “why” questions, refund changes, and concept explanations  
- **Deductions Agent** – Identifies, explains, and simulates deduction-related opportunities  
- **Investments Agent** – Handles capital gains, dividends, and investment-related inputs  
- **State Taxes Agent** – Manages state-specific considerations and differences  
- **Monetization Agent / Tool** – Passively listens to the conversation and user state to identify contextual upsell opportunities (e.g., Live Expert help, higher-tier products, add-ons).  
  - Does **not** interrupt the primary task flow  
  - Surfaces upsell moments only when relevance and user confidence are high  
  - Framed as *helpful support*, not sales

**Behavior**
- Executive Chat Agent decides which specialist agent(s) to invoke
- Monetization Agent runs in parallel as an observer
- User never selects agents manually

**Acceptance Criteria**
- Responses vary based on simulated agent
- Voice remains consistent and TurboTax-aligned
- Upsell suggestions feel timely, optional, and non-disruptive

---

## Definition of Done

- Demo runs fully client-side
- User can complete a return via chat only
- Experience feels cohesive and intentional
- Stakeholders understand the vision instantly
