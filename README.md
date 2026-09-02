# ExplainMyCode — Visual Code Execution Animator

> **"Don't just read the code. See how it runs."**

ExplainMyCode is a browser-based educational tool that helps beginner programmers understand how JavaScript code actually executes. Instead of using a traditional debugger, users can write or paste JavaScript code and visually see execution happen step by step.

---

## The Problem

Beginner programmers often understand code syntax but struggle with what happens internally while a program runs. Concepts like variable state changes, loops, function calls, recursion, scope, and the call stack are difficult to understand by reading source code alone. Traditional browser debuggers are powerful but can be intimidating for beginners.

## The Solution

ExplainMyCode transforms program execution into an interactive visual learning experience. Users write JavaScript code, click **Run & Visualize**, and watch as the application:

- Highlights the currently executing line
- Shows variables changing in real time
- Visualizes the call stack growing and shrinking
- Demonstrates how loops iterate
- Makes recursion visible and understandable
- Displays console output synchronized with execution

---

## Architecture

### Frontend-Only (Zero Backend)

```
Browser
  ↓
React Application
  ↓
Client-side JavaScript Execution Engine (acorn parser)
  ↓
Execution Trace Generation
  ↓
React Visualization Components
  ↓
Interactive Learning Experience
```

User code **never** leaves the browser. No server, no API calls, no cloud execution.

### Technology Stack

| Technology | Purpose |
|---|---|
| **Vite 6** | Build tool and dev server |
| **React 19** | UI framework |
| **Tailwind CSS 4** | Utility-first styling |
| **Monaco Editor** | Code editor (same as VS Code) |
| **acorn** | JavaScript parser for AST generation |
| **Custom AST Interpreter** | Executes code and records trace |

### Project Structure

```
src/
├── components/
│   ├── Header.jsx           # App header with Run button
│   ├── CodeEditor.jsx       # Monaco editor wrapper
│   ├── ExecutionControls.jsx # Play/Pause/Step/Reset controls
│   ├── VariablesPanel.jsx   # Variable state display
│   ├── CallStackPanel.jsx   # Call stack visualization
│   ├── ConsolePanel.jsx     # Console output display
│   ├── ErrorPanel.jsx       # Error display
│   └── ExampleSelector.jsx  # Example code loader
├── engine/
│   └── interpreter.js       # AST-based JavaScript interpreter
├── examples/
│   └── index.js             # Pre-built example programs
├── App.jsx                  # Main application component
├── main.jsx                 # Entry point
└── index.css                # Global styles + Tailwind
```

---

## How the Execution Engine Works

1. **Parse**: User code is parsed into an AST using `acorn`
2. **Interpret**: A custom AST interpreter walks the tree and executes each node
3. **Record**: At each execution step, the engine records:
   - Current line number
   - All visible variables and their values
   - The call stack
   - Console output
   - Loop iteration info
   - Function call details
4. **Visualize**: React components consume the trace and render it interactively

### Safety Features

- **No `eval()`**: Code is parsed and interpreted via AST, not executed directly
- **Step limit**: Maximum 5,000 execution steps to prevent browser freezing
- **Loop limit**: Maximum 1,000 iterations per loop
- **Recursion limit**: Maximum 100 recursion depth
- **No external calls**: All execution is sandboxed in the browser

---

## Features

### Core

- **Code Editor** with JavaScript syntax highlighting (Monaco Editor)
- **Run & Visualize** button to start execution
- **Current line highlighting** in the editor
- **Execution controls**: Previous, Next, Play, Pause, Reset
- **Variable state panel** with change highlighting
- **Call stack visualization** with stack frame display
- **Console output** synchronized with execution steps
- **Error display** with line numbers and messages
- **9 built-in examples** covering key concepts

### Examples Included

| Example | Concepts |
|---|---|
| Variables | Assignment, updates |
| If / Else | Conditional branching |
| For Loop | Iteration, loop variables |
| While Loop | While-loop execution |
| Function Call | Functions, parameters, return values |
| Array Traversal | Arrays, indexing, accumulation |
| Factorial (Recursion) | Recursive function calls, call stack |
| Nested Loops | Multi-level iteration |
| Fibonacci | Recursion, repeated calls |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` | Next step |
| `←` | Previous step |
| `R` | Reset |

---

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output is in `dist/` — ready for static deployment on Vercel.

---

## Deployment on Vercel

1. Push to a Git repository
2. Import the repository on Vercel
3. Vercel will auto-detect Vite and deploy as a static site
4. No serverless functions needed — pure frontend

---

## Performance Considerations

- Execution traces are generated synchronously but efficiently
- Maximum step/loop/recursion limits prevent browser freezing
- Monaco Editor is lazy-loaded
- Lightweight animations only where they improve understanding
- Variable change highlighting uses subtle visual cues

---

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Visible focus states
- High contrast color scheme
- Meaningful labels on all controls
- Reduced motion support via CSS

---

## Browser Compatibility

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## License

MIT
