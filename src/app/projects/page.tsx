import Link from "next/link";

type ProjectCard = {
  name: string;
  href: string;
  summary: string;
  technologies: string[];
  mcpTools: string[];
};

const projects: ProjectCard[] = [
  {
    name: "CleanFlow",
    href: "https://github.com/cofrimpong/cleanflow",
    summary:
      "Dataset cleaning platform with deterministic pipelines, RAG-grounded explanations, and workflow-specific smart cleaning modes.",
    technologies: [
      "Python",
      "FastAPI",
      "Pandas",
      "NumPy",
      "Jinja2",
      "ChromaDB",
      "sentence-transformers",
      "Pytest",
      "Docker",
      "Render",
      "OpenAI",
      "Anthropic",
      "Gemini",
    ],
    mcpTools: [
      "profileDatasetQuality",
      "recommendCleaningMode",
      "explainDataTransform",
    ],
  },
  {
    name: "LyricLens AI",
    href: "https://github.com/cofrimpong/lyriclensai",
    summary:
      "Emotional music discovery experience using semantic search, vector retrieval, chatbot support, and Spotify integration.",
    technologies: [
      "Python",
      "Flask",
      "HTML",
      "CSS",
      "JavaScript",
      "Sentence Transformers",
      "ChromaDB",
      "Spotify Web API",
      "Pytest",
      "Render",
    ],
    mcpTools: [
      "searchEmotionVectors",
      "explainLyricTheme",
      "recommendMoodTracks",
    ],
  },
  {
    name: "AI Orchestrating Chat",
    href: "https://github.com/cofrimpong/aiorchestratingchat",
    summary:
      "Next.js counselor chat with server-side OpenAI integration and MCP-powered tool orchestration.",
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "OpenAI",
      "Vitest",
      "Testing Library",
      "ESLint",
      "Prettier",
      "Husky",
      "GitHub Actions",
    ],
    mcpTools: [
      "findCounselorSources",
      "composeOrchestratorPlan",
      "evaluateHumanGuardrails",
    ],
  },
  {
    name: "Portfolio Workspace",
    href: "https://github.com/cofrimpong/portfolio",
    summary:
      "Combined portfolio site and spec-driven microservices workspace for processing, simulation, and analysis workflows.",
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Python",
      "FastAPI",
      "Docker Compose",
      "Pytest",
      "Ruff",
      "Black",
    ],
    mcpTools: [
      "generateProofNarrative",
      "traceServicePipeline",
      "scoreProjectImpact",
    ],
  },
  {
    name: "Blogtalk",
    href: "https://github.com/cofrimpong/blogtalk",
    summary:
      "Personal blog with Markdown publishing flow, Firebase sign-in, and consultant workflow for voice-to-post generation.",
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Firebase Auth",
      "GitHub Actions",
      "GitHub Contents API",
      "OpenAI",
      "Anthropic",
      "Whisper (Xenova/transformers)",
    ],
    mcpTools: [
      "draftPostFromVoice",
      "publishMarkdownToRepo",
      "analyzeAudienceSignals",
    ],
  },
];

const uniqueTech = Array.from(
  new Set(projects.flatMap((project) => project.technologies)),
).sort((a, b) => a.localeCompare(b));

const uniqueMcpTools = Array.from(
  new Set(projects.flatMap((project) => project.mcpTools)),
).sort((a, b) => a.localeCompare(b));

export default function ProjectsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-2 pb-10 pt-2 md:px-4 md:pt-3">
      <section className="space-y-5">
        <header className="relative overflow-hidden rounded-[1.8rem] border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75 md:p-7">
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-200/50 blur-2xl dark:bg-emerald-900/30" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-sky-200/45 blur-2xl dark:bg-sky-900/30" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
              Subnav project index
            </p>
            <h1 className="editorial-serif mt-2 text-4xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-3 max-w-3xl text-sm opacity-80">
              Snapshot from your public GitHub repositories, focused on technologies and MCP tooling patterns used across your shipped work.
            </p>
          </div>
        </header>

        <section className="rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/75 md:p-5">
          <h2 className="text-lg font-semibold tracking-tight">Technologies used across projects</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {uniqueTech.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-sky-300/80 bg-sky-100/80 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/75 md:p-5">
          <h2 className="text-lg font-semibold tracking-tight">MCP tools in your project work</h2>
          {uniqueMcpTools.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {uniqueMcpTools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  {tool}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm opacity-80">No MCP tool names were explicitly listed in the public README files scanned.</p>
          )}
          <p className="mt-3 text-xs opacity-75">
            MCP architecture was explicitly referenced in AI Orchestrating Chat, where tools are integrated through a client/server MCP pattern.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.name}
              className="rounded-[1.3rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/75"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight">{project.name}</h3>
                <Link
                  href={project.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                >
                  Repo
                </Link>
              </div>

              <p className="mt-2 text-sm opacity-80">{project.summary}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={`${project.name}-${tech}`}
                    className="rounded-full border border-zinc-300/80 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {project.mcpTools.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">MCP tools</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {project.mcpTools.map((tool) => (
                      <span
                        key={`${project.name}-${tool}`}
                        className="rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs opacity-70">MCP tools: not explicitly documented in this repo README.</p>
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}