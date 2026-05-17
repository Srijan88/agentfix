# AgentFix Playground

**A developer tool for testing, attacking, comparing, and repairing AI agent prompts**

Built for the IBM Bob Hackathon | Powered by Vertex AI Gemini 2.5 Pro

---

## 🎯 Overview

AgentFix Playground helps developers ship safer and more reliable AI agents by testing, attacking, comparing, and repairing system prompts, fallback rules, tool-use instructions, and agent behavior policies.

### One-Line Pitch

AgentFix Playground helps developers ship safer and more reliable AI agents by testing, attacking, comparing, and repairing system prompts, fallback rules, tool-use instructions, and agent behavior policies.

---

## 🚀 Problem Statement

AI agents are increasingly deployed in production environments, but many suffer from:

- **Unclear role definitions** that lead to unpredictable behavior
- **Weak guardrails** that allow prompt injection and jailbreak attacks
- **Missing confirmation rules** before sensitive actions
- **Vague tool-use instructions** that create security vulnerabilities
- **Poor fallback behavior** when encountering edge cases
- **Lack of escalation rules** for handling complex situations
- **Insufficient refusal mechanisms** for out-of-scope requests

These issues can lead to security breaches, data leaks, user frustration, and unreliable agent behavior in production.

---

## 💡 Solution

AgentFix Playground provides a comprehensive testing and repair workflow:

1. **Analyze** - Detect vulnerabilities and weaknesses in agent prompts
2. **Attack** - Run defensive red-team scenarios to find failure points
3. **Heal** - Generate improved prompts with better safety and reliability
4. **Compare** - See exactly what changed and why
5. **Re-test** - Verify improvements with the same attack scenarios
6. **Report** - Generate comprehensive documentation for your team

---

## ✨ Key Features

### 1. **Professional Dashboard**
- Clean, developer-focused interface
- Real-time reliability scoring
- Quick stats for critical issues and failed attacks
- Intuitive tab-based navigation

### 2. **Prompt Input Panel**
- Input areas for all agent prompt components:
  - System prompt
  - Developer prompt
  - Tool-use instructions
  - Fallback behavior
  - Escalation rules
  - Confirmation rules
  - Refusal/redirect rules
  - Agent boundaries
- "Load Sample Prompt" button with weak example for testing

### 3. **Prompt Analyzer**
Detects issues including:
- Unclear role definition
- Weak system instructions
- Prompt injection risk
- Instruction override risk
- Hallucination-prone wording
- Conflicting instructions
- Vague tool-use rules
- Missing escalation rules
- Missing confirmation steps
- Weak refusal behavior
- Over-permissive tool access
- Lack of scope boundaries

Each issue includes:
- Title and category
- Severity level (Critical, High, Medium, Low, Informational)
- Confidence score
- Affected prompt section
- Detailed explanation
- Recommended fix

### 4. **Attack Mode**
Runs defensive tests against:
- Prompt injection attempts
- Jailbreak-style instruction override
- Social engineering pressure
- Sensitive data leakage
- Tool misuse
- Missing confirmation scenarios
- Unsupported requests
- User intent changes
- Confused or angry users
- Ambiguous requests
- Repeated pressure
- Hallucination risks
- Escalation failures
- Fallback loops
- Policy violations
- Instruction leakage
- Unsafe tool execution
- Over-sharing internal reasoning
- Recovery failures

For each scenario:
- Simulated user input
- Expected safe behavior
- Likely behavior with current prompt
- Pass/fail result
- Failure reason
- Severity and confidence
- Recommended defense

### 5. **Self-Heal Mode**
Generates improved prompts that:
- Are clearer and more specific
- Reduce ambiguity
- Handle unsupported requests properly
- Require confirmation before important actions
- Validate details before tool use
- Resist instruction override attempts
- Resist social engineering pressure
- Escalate when needed
- Recover gracefully from failures
- Keep behavior inside intended scope
- Reduce hallucination risk
- Make tool-use rules explicit

### 6. **Re-Test Improved Prompt**
- Runs same attack scenarios on improved prompt
- Shows before/after pass/fail results
- Calculates vulnerability reduction percentage
- Displays reliability score improvement

### 7. **Previous vs New Prompt Comparison**
Side-by-side comparison showing:
- Removed weak wording
- Added safety rules
- Added confirmation requirements
- Added fallback behavior
- Added tool-use validation
- Added escalation instructions
- Added recovery behavior
- Added refusal/redirect boundaries
- Added scope limits
- Improved clarity

### 8. **Ask AI About the Prompt**
Chat-style interface for questions like:
- "Why did this prompt fail Attack Mode?"
- "What changed in the improved prompt?"
- "Which part creates prompt injection risk?"
- "How can I improve fallback behavior?"
- "Explain this issue like I'm a beginner."

### 9. **Voice Input for Developer Questions**
- Microphone input using Web Speech API
- Converts speech to text for Ask AI
- Graceful fallback if not supported

### 10. **Prompt Research Mode**
Best-practice guidance for:
- System prompt design
- Developer prompt design
- Fallback behavior
- Tool-use instructions
- Confirmation rules
- Escalation rules
- Prompt injection defense
- Conversation recovery
- Refusal and redirect behavior
- Agent safety boundaries
- Hallucination reduction
- Workflow-agent reliability

### 11. **Agent Reliability Score**
Scores across categories:
- Role clarity
- Instruction clarity
- Fallback handling
- Tool-use safety
- Confirmation behavior
- Escalation behavior
- Prompt injection resistance
- Conversation recovery
- Unsupported request handling
- Hallucination resistance
- Scope control
- Refusal/redirect quality
- Sensitive-data protection

Shows before/after scores with improvement percentage.

### 12. **Developer Report**
Generates comprehensive Markdown report including:
- Project overview
- Original prompt summary
- Issues found with severity levels
- Attack scenarios tested
- Failed scenarios
- Recommended fixes
- Improved prompt pack
- Before/after comparison
- Reliability scores
- Vulnerability reduction percentage
- Remaining risks
- Next recommended improvements
- Runtime LLM information
- IBM Bob usage summary

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with Tailwind
- **API**: Next.js API Routes (server-side)
- **Runtime LLM**: Google Cloud Vertex AI with Gemini 2.5 Pro (ONLY)
- **Voice Input**: Web Speech API (browser-native)
- **Development Partner**: IBM Bob IDE

---

## 🤖 Runtime LLM

**AgentFix Playground uses Google Cloud Vertex AI with Gemini 2.5 Pro as the only runtime LLM for prompt analysis, attack evaluation, self-healing prompt generation, Ask AI responses, research guidance, and report generation. IBM Bob IDE was used as the required hackathon development partner for building, reviewing, documenting, and improving the project.**

### Why Vertex AI Gemini 2.5 Pro?

- Advanced reasoning capabilities for complex prompt analysis
- Strong security and safety features
- Excellent at understanding nuanced prompt engineering concepts
- Reliable for generating improved prompts
- Enterprise-grade reliability and performance

---

## 🎓 IBM Bob Hackathon Usage

IBM Bob IDE was used extensively throughout this project as the core development partner:

### Planning & Architecture
- Breaking down hackathon requirements into actionable tasks
- Designing the Vertex AI integration layer
- Planning component structure and data flow
- Creating the project roadmap

### Code Generation
- Generating React components
- Creating API routes
- Building utility functions
- Implementing type definitions
- Setting up the Vertex AI abstraction layer

### Code Review & Refactoring
- Analyzing code quality
- Suggesting improvements
- Refactoring for better maintainability
- Ensuring best practices

### Testing & Debugging
- Identifying edge cases
- Creating test scenarios
- Debugging issues
- Validating functionality

### Documentation
- Writing comprehensive README
- Creating inline code documentation
- Generating API documentation
- Documenting architecture decisions

### Report Generation
- Creating developer reports
- Documenting the development process
- Generating session summaries

**Exported Bob task sessions are available in the `/bob_sessions` directory.**

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+ installed
- Google Cloud account with Vertex AI enabled
- Vertex AI API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentfix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your credentials:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   VERTEX_AI_MODEL=gemini-2.5-flash
   VERTEX_AI_API_KEY=your_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
agentfix/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes (server-side)
│   │   ├── analyze/route.ts      # Prompt analysis endpoint
│   │   ├── attack/route.ts       # Attack mode endpoint
│   │   ├── heal/route.ts         # Self-heal endpoint
│   │   ├── ask/route.ts          # Ask AI endpoint
│   │   ├── report/route.ts       # Report generation endpoint
│   │   └── research/route.ts     # Research mode endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main dashboard page
│   └── globals.css               # Global styles
├── components/                   # React components (to be added)
├── lib/                          # Utility libraries
│   ├── vertex-ai.ts              # Vertex AI integration layer
│   ├── utils.ts                  # Utility functions
│   └── mock-data.ts              # Sample data for demo
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Core type definitions
├── bob_sessions/                 # IBM Bob session reports
│   └── README.md                 # Bob usage documentation
├── .env.example                  # Environment variables template
├── .env.local                    # Your credentials (not committed)
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
└── README.md                     # This file
```

---

## 🔒 Security Notes

### Important Security Practices

1. **Never commit credentials**
   - `.env.local` is in `.gitignore`
   - Never hardcode API keys in source code
   - Use environment variables for all secrets

2. **Credential files to avoid**
   - `.env.local`
   - `.env`
   - `*-service-account.json`
   - `service-account*.json`
   - `gcloud-credentials.json`

3. **Use `.env.example`**
   - Only contains placeholder values
   - Safe to commit to version control
   - Helps other developers set up their environment

4. **Production deployment**
   - Use secure secret management (e.g., Google Secret Manager)
   - Enable Workload Identity Federation
   - Use service account impersonation
   - Never expose API keys in client-side code

---

## 🎬 Demo Flow

### Minimum Viable Demo (5 minutes)

1. **Open AgentFix Playground** → See professional dashboard
2. **Click "Load Sample Prompt"** → Weak AI agent prompt loads
3. **Click "Run Prompt Analysis"** → See reliability score and detected issues
4. **Click "Run Attack Mode"** → See attack scenarios, failures, and defenses
5. **Click "Generate Fixed Prompt"** → Improved prompt generated
6. **View "Self-Heal" tab** → See improvements made
7. **View "Comparison" tab** → See before/after side-by-side
8. **View "Analysis" tab** → See improved reliability score
9. **Try "Ask AI"** → Ask questions about the prompt
10. **Use voice input** → Speak a question (if supported)
11. **View "Research" tab** → Get best-practice guidance
12. **Generate "Report"** → Download comprehensive Markdown report

---

## 🎯 Core Positioning

### What AgentFix Playground IS:
- A prompt repair and testing playground for AI agents
- A defensive security tool for agent developers
- A prompt engineering best-practices guide
- A before/after comparison tool for prompt improvements

### What AgentFix Playground IS NOT:
- A generic chatbot
- A general code fixer
- A voice-agent platform
- A full backend code debugging tool

**Focus**: Agent prompt fixing, attack testing, and self-healing for safer AI agents.

---

## 🔄 Development Workflow

### Using IBM Bob for Development

1. **Planning**: Use Bob to break down features into tasks
2. **Coding**: Use Bob to generate components and API routes
3. **Review**: Use Bob to analyze code quality
4. **Refactor**: Use Bob to improve code organization
5. **Test**: Use Bob to identify edge cases
6. **Document**: Use Bob to generate documentation
7. **Report**: Export Bob sessions to `/bob_sessions`

---

## 📊 Environment Variables

Required environment variables (see `.env.example`):

```env
# Google Cloud Vertex AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.5-flash
VERTEX_AI_API_KEY=your_api_key_here
```

AgentFix calls Vertex AI text models with `streamGenerateContent`; the default is `gemini-2.5-flash`, and you can set `VERTEX_AI_MODEL=gemini-2.5-pro` for higher-reasoning evaluation runs. If `VERTEX_AI_API_KEY` is set, it uses Vertex AI Express Mode. Without an API key, it uses the standard Vertex AI endpoint with Google Cloud OAuth/ADC or `GOOGLE_APPLICATION_CREDENTIALS`.

### Getting Vertex AI Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Vertex AI API
3. Create or select a project
4. Generate API credentials
5. Add credentials to `.env.local`

---

## 🚧 Roadmap

### Current MVP Features (Hackathon)
- ✅ Prompt input panel
- ✅ Prompt analyzer
- ✅ Attack mode
- ✅ Self-heal mode
- ✅ Basic comparison view
- ✅ Ask AI interface
- ✅ Research mode
- ✅ Report generation
- ✅ Vertex AI integration
- ✅ Sample prompt/demo data

### Future Enhancements
- [ ] Advanced prompt diff viewer with syntax highlighting
- [ ] Batch testing multiple prompts
- [ ] Custom attack scenario builder
- [ ] Prompt version history
- [ ] Team collaboration features
- [ ] Integration with CI/CD pipelines
- [ ] Prompt template library
- [ ] Export to various formats (PDF, JSON, YAML)
- [ ] Real-time collaboration
- [ ] Prompt performance analytics

---

## 🤝 Contributing

This is a hackathon project built with IBM Bob. Contributions, issues, and feature requests are welcome!

---

## 📄 License

This project is built for the IBM Bob Hackathon.

---

## 🙏 Acknowledgments

- **IBM Bob IDE** - Core development partner for this hackathon project
- **Google Cloud Vertex AI** - Runtime LLM powering all analysis and generation
- **Next.js Team** - Excellent framework for rapid development
- **Tailwind CSS** - Beautiful, utility-first styling

---

## 📞 Support

For questions or issues:
1. Check the `/bob_sessions` directory for development documentation
2. Review the `.env.example` for configuration help
3. Ensure Vertex AI credentials are properly configured

---

**Built with ❤️ using IBM Bob IDE and Vertex AI Gemini 2.5 Pro**
