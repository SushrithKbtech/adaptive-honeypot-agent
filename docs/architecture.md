# Architecture Overview

## The Honeypot Agent Logic

### 1. **Scenario Detection**
The agent first analyzes the incoming message to determine the scam type (e.g., "electricity_bill", "traffic_challan", "lottery_prize").

### 2. **Bridge Logic & Reciprocity Traps**
To maintain natural conversation, the agent uses a **"Bridge Logic"** pattern:
- **React First:** Never just ask questions. Always react to the scammer's message (e.g., "₹500 penalty?! That is too much!").
- **Ask Next:** Connect the reaction to a question ("But what is the exact challan number?").

### 3. **Intelligence Extraction**
The agent uses **"Reciprocity Traps"** to extract intelligence:
- Offers compliance (e.g., "I am trying to pay") but adds a hurdle ("Link is failing").
- Forces the scammer to provide alternative payment details (UPI IDs, Bank Details) or verify their identity (Employee IDs).

### 4. **Session Management**
Maintains session state (up to 10 turns recommended) to build context and avoid repetitive questions.
