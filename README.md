<h1 align="center">📚 SensAI — AI-Powered Learning Suite</h1>

<p align="center">
A next-generation AI-powered course creation and learning management system, enabling <b>end-to-end learning content generation</b>, <b>smart scheduling</b>, <b>review-safe AI outputs</b>, and <b>real-time collaboration</b>.
</p>

## 🌳 Branch Structure
- **`main`** → contains the **backend** (FastAPI, Python)
- **`front`** → contains the **frontend** (Next.js, React)

---

## ✨ Overview

SensAI is designed to transform how courses are created, managed, and delivered.  
We built a **complete backend + frontend system** that combines:

- **AI-driven course creation** from PDFs or plain ideas.
- **Real-time AI streaming** for instant feedback.
- **Smart scheduling** with timezone awareness.
- **Safe content generation** with built-in review guardrails.
- **Optimized performance** for faster page loads.
- **Full API coverage** for integrations.

Whether you’re an **educator**, **corporate trainer**, or **learning platform admin**, SensAI helps you go from *idea → course → delivery* in minutes.

---

## 💡 What We Built

<h3>🎯 AI Magic — From Idea to Course</h3>
<ul>
<li><b>Prompt Enhancer:</b> Converts rough ideas into structured, actionable course briefs in one click.</li>
<li><b>Audience Understanding:</b> AI creates a clear learner profile to tailor tone, difficulty, and examples.</li>
<li><b>Templates:</b> Built-in prompt templates for faster content design.</li>
</ul>

<h3>📄 Reference-First Course Generation (PDF Support)</h3>
<ul>
<li>Upload PDFs (≤32MB, ≤100 pages) as your source material.</li>
<li>Content validation: Type, size, and page count checks.</li>
<li><b>Precision Calibration:</b> Four adherence levels:
    <ol>
    <li>Creative Interpretation</li>
    <li>Balanced Adherence</li>
    <li>Faithful Adherence</li>
    <li>Strict Extraction</li>
    </ol>
</li>
<li>Generates a complete <b>course structure</b> with modules, concepts, and tasks.</li>
</ul>

<h3>📝 Auto-Generated Tasks & Quizzes</h3>
<ul>
<li>Generate <b>learning materials</b> with structured explanations.</li>
<li>Create <b>quizzes</b> instantly (objective, subjective, coding).</li>
<li>Includes <b>correct answers</b>, hints, and AI-verified explanations.</li>
<li>Auto-linked to <b>scorecards</b> for performance tracking.</li>
</ul>

<h3>🛡 Review-Safe System</h3>
<ul>
<li>Every AI request is checked against content safety rules.</li>
<li>Unsafe prompts are <b>blocked</b> with clear reason messages.</li>
<li>Helps ensure generated content is safe for all audiences.</li>
</ul>

<h3>📅 Smart Scheduling & Calendar</h3>
<ul>
<li>Generate day-by-day schedules with:
    <ul>
    <li>Working days</li>
    <li>Holidays/exclusions</li>
    <li>Timezone adjustments</li>
    <li>Hours per day</li>
    </ul>
</li>
<li>Optional <b>mock mode</b> to preview schedules.</li>
<li>Persist schedules for later viewing in <b>SavedScheduleCard</b>.</li>
</ul>

<h3>⚡ Performance Improvements</h3>
<ul>
<li>AI responses stream in real-time for faster feedback.</li>
<li>Parallel task generation with WebSocket progress updates.</li>
<li>Dynamic imports for heavy views like quizzes & code editors.</li>
<li>Static file hosting at <code>/uploads/*</code> for quick media loads.</li>
<li>Optimized CORS handling for smooth uploads/downloads.</li>
</ul>

---

## 🛠 API Overview

<h3>Base URL</h3>
<p>
Backend: <code>http://localhost:8001</code><br>
Frontend: <code>process.env.NEXT_PUBLIC_BACKEND_URL</code>
</p>

---

### <h3>AI Endpoints</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Streamed AI chat with safety checks |
| POST | `/ai/generate/course/{course_id}/structure` | Generate modules/tasks from reference material |
| POST | `/ai/generate/course/{course_id}/tasks` | Bulk-generate content for tasks |
| POST | `/ai/generate/task/{task_id}/questions` | Auto-generate quiz questions |
| POST | `/ai/generate/course/{course_id}/schedule` | Create/persist course schedules |
| POST | `/ai/safety/check` | Standalone content safety validation |
| POST | `/ai/enhance-prompt` | Improve prompts for richer briefs |
| POST | `/ai/know-your-audience` | Generate audience insights |

---

### <h3>File Handling</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/file/upload-local` | Upload PDF or media |
| PUT | `/file/presigned-url/create` | Create presigned upload URL |
| GET | `/file/presigned-url/get` | Retrieve file URL |
| GET | `/file/download-local/` | Download file locally |

---

### <h3>Courses</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/courses/` | Create a new course |
| GET | `/courses/{course_id}` | Fetch course details/tree |
| PUT | `/courses/{course_id}` | Update course details |
| DELETE | `/courses/{course_id}` | Delete a course |
| POST | `/courses/{course_id}/milestones` | Add course modules |
| PUT | `/courses/milestones/order` | Reorder modules |

---

### <h3>Tasks</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks/` | Create a task |
| GET | `/tasks/{task_id}` | Get task details |
| PUT | `/tasks/{task_id}/learning_material` | Update learning material |
| POST | `/tasks/{task_id}/quiz` | Create a quiz |
| POST | `/tasks/duplicate` | Duplicate task |
| DELETE | `/tasks/{task_id}` | Remove task |

---

### <h3>Scheduling</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedule/{course_id}` | Retrieve persisted schedule |
| POST | `/ai/generate/course/{course_id}/schedule` | Generate course schedule |

---

### <h3>Chat & Collaboration</h3>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/` | Save chat messages |
| GET | `/chat/user/{user_id}/task/{task_id}` | Retrieve task-specific chat history |

---

## 💡 End-to-End Workflow

<ol>
<li><b>Upload Reference Material</b>
    <ul>
    <li>Upload PDF via <code>/file/upload-local</code>.</li>
    <li>Validate file type, size, and page limit.</li>
    </ul>
</li>
<li><b>Set Precision Level</b>
    <ul><li>Choose from Level 1–4 adherence.</li></ul>
</li>
<li><b>Generate Course Structure</b>
    <ul><li><code>/ai/generate/course/{course_id}/structure</code></li></ul>
</li>
<li><b>Generate Tasks & Quizzes</b>
    <ul>
    <li><code>/ai/generate/course/{course_id}/tasks</code></li>
    <li><code>/ai/generate/task/{task_id}/questions</code></li>
    </ul>
</li>
<li><b>Schedule the Course</b>
    <ul><li><code>/ai/generate/course/{course_id}/schedule</code></li></ul>
</li>
<li><b>Track in Real-Time</b>
    <ul><li>WebSockets: <code>/ws/course/{course_id}/generation</code></li></ul>
</li>
</ol>

---

## 🚀 Performance & UX Highlights
<ul>
<li>Live AI streaming with instant partial responses.</li>
<li>WebSocket-based progress updates during bulk generation.</li>
<li>Lazy loading for quizzes, viewers, and editors.</li>
<li>Local static file serving for near-zero latency media loads.</li>
<li>Optimized backend queries to handle large datasets quickly.</li>
</ul>

---

## 📌 Developer Notes
<ul>
<li>PDFs are the primary source for structured course creation.</li>
<li><code>course_level</code> controls AI adherence — higher levels = stricter reference following.</li>
<li>Content safety checks occur before AI generation begins.</li>
<li>Streaming endpoints return NDJSON for progressive rendering.</li>
</ul>
