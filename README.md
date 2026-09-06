<div align="center">

# ExplainMyCode

**Watch your JavaScript run - one step at a time.**

ExplainMyCode is a free, browser-based tool that shows you exactly what your JavaScript code is doing while it runs - not just the final result. It's built for beginners who want to *see* how code works, not just read about it.


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](#technology-stack)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-brightgreen)](#testing)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-4-orange)](#testing)
[![Lucide React](https://img.shields.io/badge/Lucide%20React-4-purple)](#testing)

[What It Does](#what-it-does) •
[Features](#features) •
[How It Works](#how-it-works) •
[Get Started](#get-started) •
[Roadmap](#roadmap)

</div>

---

## Table of Contents

- [What It Does](#what-it-does)
- [Why It's Different](#why-its-different)
- [Features](#features)
- [How It Works](#how-it-works)
- [Is It Safe?](#is-it-safe)
- [Testing](#testing)
- [Built-in Examples](#built-in-examples)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Get Started](#get-started)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What It Does

Imagine writing a piece of JavaScript code and, instead of just seeing the final output, you could **press Run & Visualize and watch it run** - line by line, like a video.

That's what ExplainMyCode does. You write or paste JavaScript code into an editor, hit run, and then:

- 📍 It **highlights the exact line** currently running
- 🧮 It **shows you every variable** and how its value changes
- 📚 It **shows the call stack** - which function called
- 🖨️ It **shows console output** lined up with the step that created it
- 💬 It **explains each step in plain English**
- ⚠️ It **shows errors clearly**, instead of a confusing crash

You can **pause, rewind, and step forward one line at a time** - just like scrubbing through a video - so you can finally understand *why* your code behaves the way it does.

## Why It's Different

Most "code visualizer" tools either use a risky shortcut (`eval()`) or send your code to a server to run it. ExplainMyCode does neither.

| | Other tools | ExplainMyCode |
|---|---|---|
| Where code runs | Often a server | Right in your browser |
| How code runs | Often `eval()` (unsafe) | A custom interpreter built from scratch |
| What you can rewind | Usually just the final output | Every single step, forwards and backwards |
| Explanations | Rarely included | Plain-language, step-by-step |
| Setup needed | Sometimes an account or server | None - just open it and go |

## Features

- **Code editor** - the same editor used in VS Code, right in your browser
- **Run / Pause / Step / Rewind** - control execution like a video player
- **Adjustable speed** - slow down or speed up how fast steps play
- **Variables panel** - watch values change in real time
- **Call stack panel** - see which functions are running and in what order
- **Console panel** - output matched to the exact step that created it
- **Explanation panel** - a plain-English description of what's happening
- **Built-in examples** - ready-made code samples to try immediately
- **Clear error messages** - mistakes are explained, not just thrown as red text
- **Light and dark theme**
- **Works on any screen size** - panels sit side-by-side on desktop and stack on mobile

## How It Works

Here's the journey your code takes, from typed text to an animation you can watch:

```text
 1. You write JavaScript code
              │
              ▼
 2. The code is read and broken down into its basic parts
    (this step is called "parsing," done by a tool called Acorn)
              │
              ▼
 3. A custom-built interpreter runs the code piece by piece
    (instead of letting the browser just run it instantly)
              │
              ▼
 4. Every single step is recorded - the line, the variables,
    the function calls, the console output, everything
              │
              ▼
 5. That recording is played back to you as an
    interactive, step-by-step animation
```

In short: instead of running your code instantly like a normal browser would, ExplainMyCode runs it *slowly and on purpose*, writing down everything that happens along the way - so it can show you the whole story afterward, at your own pace.

## Is It Safe?

Yes. Since your code runs directly in your browser (nothing is sent to a server), a few safety rules stop any code from freezing your tab:

| Rule | Limit |
|---|---|
| Total steps a program can take | 5,000 |
| How many times one loop can repeat | 1,000 |
| How deep a function can call itself | 100 levels |
| Server involved | None - everything happens on your device |

The tool also avoids `eval()` entirely - a common but risky shortcut other tools use to run code. Everything here is controlled, on purpose, from the ground up.

## Testing

The engine that runs your code has been checked with **100+ automated tests**, covering everyday JavaScript features like loops, functions, classes, closures, and error handling - so the tool behaves correctly and predictably.

## Built-in Examples

New here? Try one of the ready-made examples with a single click:

- Variables
- If / Else statements
- For loops
- While loops
- Function calls
- Going through an array
- Factorial using recursion
- Nested loops
- Fibonacci sequence

## Keyboard Shortcuts

| Key | What it does |
|---|---|
| `Space` | Play or Pause |
| `→` | Go to next step |
| `←` | Go to previous step |
| `R` | Reset back to the start |

*(These shortcuts turn off automatically while you're typing in the code editor, so they never get in your way.)*

## Technology Stack

| Tool | What it's used for |
|---|---|
| **React 19** | Building the interface |
| **Vite 8** | Fast development and building |
| **Tailwind CSS 4** | Styling the app |
| **Monaco Editor** | The code-writing box (same one VS Code uses) |
| **Acorn** | Reading and breaking down your JavaScript |
| **Custom Interpreter** | The engine that actually runs your code, step by step |
| **Lucide React** | Icons |

## Project Structure

```text
src/
├── components/          # Everything you see on screen
│   ├── Header.jsx
│   ├── CodeEditor.jsx
│   ├── ExecutionControls.jsx
│   ├── VariablesPanel.jsx
│   ├── CallStackPanel.jsx
│   ├── ConsolePanel.jsx
│   ├── ExplanationPanel.jsx
│   ├── ErrorPanel.jsx
│   └── ExampleSelector.jsx
├── engine/               # The "brain" that runs your code
│   ├── interpreter.js    # Runs the code step by step
│   └── explainer.js      # Turns each step into plain English
├── examples/
│   └── index.js          # The built-in code samples
├── App.jsx
├── main.jsx
└── index.css
```

## Get Started

### What you need first

- [Node.js](https://nodejs.org/) installed on your computer
- npm (comes with Node.js)

### 1. Download the project

```bash
git clone https://github.com/msohaib422/explain-my-code
cd explain-my-code
npm install
```

### 2. Run it on your computer

```bash
npm run dev
```

Then open the link shown in your terminal - usually:

```text
http://localhost:5173
```

### 3. Build it for real use

When you're ready to publish it online:

```bash
npm run build
```

This creates a simple set of files you can upload to any website host (like Vercel, Netlify, or GitHub Pages) - no special server needed.

## Roadmap

Things being worked on next:

- [ ] More built-in examples (like `async`/`await`)
- [ ] Shareable links so you can send someone a specific code run

## Contributing

Ideas, bug reports, and improvements are always welcome:

1. Fork this project
2. Create your own branch (`git switch -c feature/my-idea`)
3. Make your changes and commit them with a clear message
4. Open a pull request explaining what you changed and why

Please make sure the existing tests still pass before submitting your changes.

## License

This project is open source under the **MIT License** - free to use, modify, and share.

---

<div align="center">

**Don't just read the code. Watch it come to life.**

</div>
