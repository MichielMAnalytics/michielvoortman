/**
 * Portfolio shell.
 *
 * One process per visitor. Reads commands on stdin, writes ANSI to stdout.
 * Designed to stay valid over a real serial link (no mouse, no DOM tricks).
 *
 * Two layers of commands:
 *   - Portfolio commands: about, projects, experience, education, awards,
 *     contact, cv. They print curated sections.
 *   - Shell commands: pwd, ls, cd, cat, tree, whoami, echo, date, uname,
 *     history, clear, help. They operate on a virtual filesystem rooted at
 *     /home/michiel.
 *
 * The same content shows up both ways: every portfolio section also lives
 * as a file under the VFS, so a visitor can either type `experience` or
 * `cd experience && ls` and `cat 04-accountable.txt`.
 */

// ── Image cache (pre-rendered half-block ANSI art) ───────────────────────────

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type ImageEntry = { thumb: string; full: string };
let images: Record<string, ImageEntry> = {};
try {
  images = JSON.parse(
    readFileSync(resolve(__dirname, "_image-cache.json"), "utf8"),
  );
} catch {
  // Missing cache → photos just won't render. Site still works.
}

const PHOTO_CAPTIONS: Record<string, string> = {
  "michiel-main.jpeg": "Amsterdam, by the canal.",
  "michiel-cap.jpg": "Out for a run.",
  "michiel-marathon-medal.jpg": "Marathon finish.",
  "michiel-grass.jpg": "Post-race recovery.",
  "michiel-marathon-group.jpg": "Ren Tegen Kanker — running against cancer.",
};

function photoBlock(name: string, size: "thumb" | "full"): string {
  const img = images[name];
  if (!img) return "";
  const caption = PHOTO_CAPTIONS[name];
  const body = img[size];
  return caption
    ? "\n" + body + "\n" + `\x1b[2m${caption}\x1b[0m\n`
    : "\n" + body + "\n";
}

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const CYAN = `${ESC}36m`;
const BLUE = `${ESC}34m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const MAGENTA = `${ESC}35m`;
const CLEAR_SCREEN = `${ESC}2J${ESC}H`;

const h1 = (s: string) => `${BOLD}${s}${RESET}`;
const h2 = (s: string) => `${CYAN}${s}${RESET}`;
const tag = (s: string) => `${DIM}${s}${RESET}`;
const link = (s: string) => `${CYAN}${s}${RESET}`;
const dirColor = (s: string) => `${BOLD}${BLUE}${s}${RESET}`;

// ── Portfolio content (data, not strings) ────────────────────────────────────

type Role = {
  slug: string;
  title: string;
  org: string;
  period: string;
  location?: string;
  body: string;
};

type Edu = {
  slug: string;
  school: string;
  degree: string;
  period: string;
  notes?: string;
};

const HOME = "/home/michiel";

const aboutText = [
  photoBlock("michiel-main.jpeg", "thumb"),
  `${h1("Michiel Voortman")} — Amsterdam.`,
  `${tag("Founder · boxd.sh · techno-optimist.")}`,
  "",
  "I've built multi-agent systems for years. Memory, planning, tool use,",
  "orchestration. Every system ran into the same wall: cloud infrastructure",
  "that wasn't shaped for agent workloads. So I went a layer down.",
  "",
  `I'm building ${h1("boxd.sh")}, the compute primitive agents need.`,
  "Hardware-isolated microVMs that cold boot in sub-50ms, pause/resume in",
  "sub-10ms, and fork live memory state in milliseconds.",
  `${tag("European-built, European-hosted.")}`,
  "",
  `Co-founded ${h1("Rule1.ai")} — creative intelligence helping 100+ marketing`,
  "teams find what actually converts.",
  "",
  "Previously at Microsoft and Booking.com. Founded Scipio.ai and",
  "Melchior Analytics.",
  "",
  `${tag("2:42 marathoner. Chess enthusiast.")}`,
  "",
].join("\n");

const contactText = [
  "",
  `  ${h1("linkedin")}   ${link("https://www.linkedin.com/in/michiel-voortman/")}`,
  `  ${h1("x")}          ${link("https://x.com/michielmv")}`,
  `  ${h1("github")}     ${link("https://github.com/MichielMAnalytics")}`,
  `  ${h1("substack")}   ${link("https://applicationlayer.substack.com/")}`,
  "",
  `  ${h1("companies")}  ${link("https://boxd.sh")}  ·  ${link("https://rule1.ai")}`,
  "",
].join("\n");

const boxdFile = [
  "",
  `${h1("boxd.sh")}  ${tag("·")}  instant cloud computers`,
  "",
  "Real Linux microVMs that boot in under a second, persist between",
  "sessions, and fork in seconds. Every machine is fully isolated with",
  "its own kernel.",
  "",
  `  cold boot       ${BOLD}sub-50ms${RESET}`,
  `  pause/resume    ${BOLD}sub-10ms${RESET}`,
  `  fork            ${BOLD}milliseconds${RESET}`,
  "",
  "Self-hosted as a single binary with zero external dependencies.",
  "Your cloud → your region → your data.  European-built, European-hosted.",
  "",
  `${link("https://boxd.sh")}`,
  "",
].join("\n");

const rule1File = [
  "",
  `${h1("rule1.ai")}  ${tag("·")}  agent-first creative intelligence`,
  "",
  "Auto-analyzes ad creatives across Meta, TikTok, and Pinterest.",
  "AI-powered tagging, custom hit-rate rules, automated reporting.",
  "",
  "Helping 100+ marketing teams find what actually converts.",
  "",
  `${link("https://rule1.ai")}`,
  "",
].join("\n");

const pastFile = [
  "",
  `${h1("past ventures")}`,
  "",
  `  ${h1("Melchior Analytics")}  Data science / AI for finance (TradFi + DeFi).`,
  `                       Client work: YourOwn (RAG for Donna), Maven 11`,
  `                       (crypto credit risk after Orthogonal/FTX),`,
  `                       4GENTIC.COM (multi-agent collectives).`,
  "",
  `  ${h1("scipio.ai")}            Survival analysis for B2B SaaS — predicting`,
  `                       and preventing churn.`,
  "",
].join("\n");

const projectsText = boxdFile + "\n" + rule1File + "\n" + pastFile;

const roles: Role[] = [
  {
    slug: "boxd",
    title: "Co-Founder",
    org: "Boxd",
    period: "feb 2026 — now",
    location: "eu-west4 · full-time",
    body: [
      "boxd gives you instant cloud computers. Real Linux VMs that boot",
      "in under a second, persist between sessions, fork in seconds.",
      "Every machine fully isolated with its own kernel. Teams use it for",
      "identical dev envs across a whole team; agents get persistent",
      "machines with full toolchains that work through the night;",
      "products embed it to run untrusted code safely on their own",
      "infrastructure.",
      "",
      "Self-hosted single binary, zero external deps. EU-built, EU-hosted.",
    ].join("\n"),
  },
  {
    slug: "rule1",
    title: "Co-Founder",
    org: "Rule1",
    period: "may 2025 — now",
    location: "full-time",
    body: [
      "Agent-first creative intelligence — auto-analyzes ad creatives",
      "across Meta, TikTok, Pinterest. AI tagging, custom hit-rate rules,",
      "automated reporting. Helping 100+ marketing teams find what",
      "actually converts.",
    ].join("\n"),
  },
  {
    slug: "network-school",
    title: "Explorer",
    org: "Network School",
    period: "aug — sep 2025",
    location: "Forest City, Malaysia · on-site",
    body: [
      "Two months at Balaji's frontier community for techno-optimists;",
      "curriculum around building startup societies. Past speakers:",
      "Naval, Vitalik, Brian Armstrong (coinbase), Olaf (Polychain).",
      "Went to meet great people and validate ideas. Also: nuddy pudding.",
    ].join("\n"),
  },
  {
    slug: "accountable",
    title: "Head of Engineering",
    org: "Accountable",
    period: "sep 2024 — may 2025",
    location: "Amsterdam · hybrid",
    body: [
      "Crypto lending platform using advanced cryptography for verified",
      "borrowers and transparent risk. Led analytics across the org, the",
      "on-chain settlement features, and the technical vision for the",
      "Credit platform.",
    ].join("\n"),
  },
  {
    slug: "melchior-analytics",
    title: "Founder",
    org: "Melchior Analytics",
    period: "jan 2023 — sep 2024",
    location: "Amsterdam · independent",
    body: [
      "Data Science, AI, and software for finance (TradFi + DeFi).",
      "Selected client work:",
      "",
      `  ${GREEN}✔${RESET} ${h1("YourOwn")} — built RAG for Donna (AI assistant for SMBs):`,
      "    hybrid retriever w/ BM25, Google Drive OAuth, Pinecone,",
      "    LangChain integration.",
      "",
      `  ${GREEN}✔${RESET} ${h1("Maven 11")} — risk monitoring for M11 Credit after the`,
      "    Orthogonal/FTX blowup: address attribution + real-time",
      "    anomaly detection.",
      "",
      `  ${GREEN}✔${RESET} ${h1("4GENTIC.COM")} — multi-agent system; 1,500+ agent`,
      "    collectives, 103k+ summaries for 1,200+ users.",
    ].join("\n"),
  },
  {
    slug: "booking-com",
    title: "Data Scientist",
    org: "Booking.com",
    period: "jan 2023 — jul 2024",
    location: "Amsterdam · hybrid",
    body: [
      "  - Credit risk models (LightGBM, logistic regression — IV feature",
      "    selection, WoE, Bayesian hyperparam tuning, calibration).",
      "  - Company-wide classifier for hotel early-repayment eligibility.",
      "  - ETL pipelines + Tableau dashboards. Currency forecasting.",
      "    Cashflow & payment-flow analysis.",
      "",
      `  ${tag("Stack: PySpark, Python, Hadoop, Oozie, Tableau, SQL, SAP HANA.")}`,
    ].join("\n"),
  },
  {
    slug: "microsoft",
    title: "Data & AI Specialist",
    org: "Microsoft",
    period: "apr 2022 — jan 2023",
    location: "Dublin, Ireland",
    body: [
      "Enterprise customers in the Dutch market — Azure Data & AI",
      "digital transformations (data-estate modernization, Hadoop →",
      "Databricks, etc.).",
    ].join("\n"),
  },
  {
    slug: "inshared",
    title: "Data Scientist",
    org: "InShared",
    period: "dec 2021 — apr 2022",
    body: "SQL + Python dataframe work for message automation.",
  },
  {
    slug: "scipio-ai",
    title: "Co-Founder",
    org: "scipio.ai",
    period: "oct 2021 — apr 2022",
    location: "Amsterdam",
    body: [
      "Survival analysis for B2B SaaS — predicting and preventing churn,",
      "increasing customer lifetime value.",
    ].join("\n"),
  },
  {
    slug: "asr",
    title: "Machine Learning Intern",
    org: "a.s.r. verzekeringen",
    period: "apr — oct 2021",
    location: "Utrecht",
    body: [
      "Survival analysis for expected cashflows of interest-rate",
      "payments. Models: CoxPH, DeepSurv, DeepHit.",
    ].join("\n"),
  },
  {
    slug: "rabobank",
    title: "Securities Trader",
    org: "Rabobank",
    period: "may 2018 — mar 2021",
    location: "Randstad",
    body: [
      "Stock-market information and execution services for private",
      "bankers.",
    ].join("\n"),
  },
  {
    slug: "codesa",
    title: "Strategy Intern",
    org: "Codesa — Companhia Docas do Espírito Santo",
    period: "jul — sep 2019",
    location: "Vitória, Espírito Santo, Brazil",
    body: [
      `Report: "The Road to Privatization of Companhia Docas Do Espírito`,
      `Santo — Motives and Possibilities from an Economic Perspective."`,
    ].join("\n"),
  },
];

const educations: Edu[] = [
  {
    slug: "uva-msc-data-science",
    school: "Universiteit van Amsterdam",
    degree: "MSc, Data Science",
    period: "2020 — 2021",
    notes: "GPA 8.0",
  },
  {
    slug: "vu-msc-finance",
    school: "Vrije Universiteit Amsterdam",
    degree: "MSc, Finance",
    period: "2019 — 2020",
    notes: [
      `Thesis: "Liquidity Provision of High Frequency Traders during`,
      `Economic Downturns: a COVID-19 Event Study" — 8.0/10`,
    ].join("\n"),
  },
  {
    slug: "uva-premaster",
    school: "Universiteit van Amsterdam",
    degree: "Pre-Master, Information Studies: Data Science",
    period: "2020",
    notes: "Information modelling, ML, semantic web, pandas — 10/10",
  },
  {
    slug: "utrecht-bsc-econ",
    school: "Universiteit Utrecht",
    degree: "BSc, Economics and Business Economics",
    period: "2015 — 2019",
    notes: [
      `Thesis: "The Competitive Advantage of an On-Demand Business Model:`,
      `Towards Zero Marginal Costs, Yet with Legal Marginalia" — 8.5/10`,
    ].join("\n"),
  },
  {
    slug: "utrecht-minor-law",
    school: "Universiteit Utrecht",
    degree: "Minor, Law",
    period: "2015 — 2018",
  },
];

const marathonsText = [
  "",
  `${h2("─── marathons ──────────────────────────────────────────────")}`,
  "",
  `  ${YELLOW}2026 feb${RESET}  Seville       ${BOLD}2:42:08${RESET}  ${tag("PR")}`,
  `  ${YELLOW}2025 oct${RESET}  Amsterdam     ${BOLD}2:49:09${RESET}`,
  `  ${YELLOW}2024 oct${RESET}  Amsterdam     ${BOLD}2:53:30${RESET}`,
  `  ${YELLOW}2024 may${RESET}  Utrecht       ${BOLD}3:15${RESET}     ${tag("(too hot)")}`,
  `  ${YELLOW}2023 feb${RESET}  Seville       ${BOLD}3:01:04${RESET}  ${tag("(calf injury)")}`,
  `  ${YELLOW}2022 oct${RESET}  Dublin        ${BOLD}3:00:18${RESET}`,
  `  ${YELLOW}2021 oct${RESET}  Amsterdam     ${BOLD}3:23:00${RESET}  ${tag("(first marathon)")}`,
  photoBlock("michiel-marathon-group.jpg", "thumb"),
].join("\n");

const hackathonsText = [
  "",
  `${h2("─── hackathons & open source ───────────────────────────────")}`,
  "",
  `  ${YELLOW}2025 jan${RESET}  ${h1("Coinbase AI Agent Hackathon — winner")}`,
  `            ${tag("virtuals.io track, Salesforce Tower SF")}`,
  "",
  `  ${YELLOW}2024 dec${RESET}  Open-source contributor — virtuals.io G.A.M.E.`,
  `            ${tag("plugins (e.g. RAGPinecone) for RAG-capable agents")}`,
  "",
].join("\n");

const chessText = [
  "",
  `${h2("─── chess ──────────────────────────────────────────────────")}`,
  "",
  `  ${YELLOW}2008 jan${RESET}  8th place · Dutch National School Tournament`,
  `            ${tag("for De Hagenpoort primary school")}`,
  "",
].join("\n");

const awardsText = marathonsText + hackathonsText + chessText;

function renderRole(r: Role): string {
  const header = `${h1(r.title)} · ${r.org}`;
  const pad = Math.max(2, 60 - stripAnsi(header).length);
  const periodLine = header + " ".repeat(pad) + tag(r.period);
  const locLine = r.location ? tag(r.location) + "\n" : "";
  return ["", periodLine, locLine + r.body, ""].join("\n");
}

function renderEdu(e: Edu): string {
  const header = h1(e.school);
  const pad = Math.max(2, 60 - stripAnsi(header).length);
  const periodLine = header + " ".repeat(pad) + tag(e.period);
  const lines = ["", periodLine, "  " + e.degree];
  if (e.notes) lines.push(...e.notes.split("\n").map((l) => "  " + tag(l)));
  lines.push("");
  return lines.join("\n");
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
}

const experienceText =
  `\n${h2("─── experience ─────────────────────────────────────────────")}\n` +
  roles.map(renderRole).join("");

const educationText =
  `\n${h2("─── education ──────────────────────────────────────────────")}\n` +
  educations.map(renderEdu).join("");

const cvText = aboutText + experienceText + educationText + awardsText;

// ── Virtual filesystem ───────────────────────────────────────────────────────

type FsFile = { kind: "file"; content: string };
type FsDir = { kind: "dir"; entries: Record<string, FsNode> };
type FsNode = FsFile | FsDir;

const file = (content: string): FsFile => ({ kind: "file", content });
const dir = (entries: Record<string, FsNode>): FsDir => ({
  kind: "dir",
  entries,
});

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

const experienceEntries: Record<string, FsNode> = Object.fromEntries(
  roles.map((r, i) => [`${pad2(i + 1)}-${r.slug}.txt`, file(renderRole(r))]),
);
const educationEntries: Record<string, FsNode> = Object.fromEntries(
  educations.map((e) => [`${e.slug}.txt`, file(renderEdu(e))]),
);

const photoEntries: Record<string, FsNode> = Object.fromEntries(
  Object.keys(images).map((name) => [name, file(photoBlock(name, "full"))]),
);

const homeDir = dir({
  "about.txt": file(aboutText),
  "contact.txt": file(contactText),
  "cv.txt": file(cvText),
  "README.md": file(
    [
      "",
      `${h1("welcome.")} this is michielvoortman.com — a real PTY shell.`,
      "",
      `type ${BOLD}help${RESET} for portfolio commands, or browse:`,
      "",
      `  ${dirColor("projects/")}     current ventures`,
      `  ${dirColor("experience/")}   full work history`,
      `  ${dirColor("education/")}    degrees and theses`,
      `  ${dirColor("awards/")}       marathons, hackathons, chess`,
      `  ${dirColor("photos/")}       a few pictures`,
      `  about.txt      who I am`,
      `  contact.txt    how to reach me`,
      `  cv.txt         everything in one go`,
      "",
    ].join("\n"),
  ),
  projects: dir({
    "boxd.sh": file(boxdFile),
    "rule1.ai": file(rule1File),
    "past.txt": file(pastFile),
  }),
  experience: dir(experienceEntries),
  education: dir(educationEntries),
  awards: dir({
    "marathons.txt": file(marathonsText),
    "hackathons.txt": file(hackathonsText),
    "chess.txt": file(chessText),
  }),
  photos: dir(photoEntries),
});

const root: FsDir = dir({
  home: dir({ michiel: homeDir }),
});

function resolvePath(cwd: string, p: string): string {
  if (!p || p === "~") return HOME;
  if (p.startsWith("~/")) p = HOME + p.slice(1);
  const abs = p.startsWith("/") ? p : cwd.replace(/\/$/, "") + "/" + p;
  const parts: string[] = [];
  for (const seg of abs.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}

function lookup(absPath: string): FsNode | null {
  if (absPath === "/") return root;
  const parts = absPath.split("/").filter(Boolean);
  let node: FsNode = root;
  for (const p of parts) {
    if (node.kind !== "dir") return null;
    const next = node.entries[p];
    if (!next) return null;
    node = next;
  }
  return node;
}

function displayCwd(cwd: string): string {
  if (cwd === HOME) return "~";
  if (cwd.startsWith(HOME + "/")) return "~" + cwd.slice(HOME.length);
  return cwd;
}

function listDir(d: FsDir): string {
  const names = Object.keys(d.entries).sort();
  return (
    names
      .map((n) =>
        d.entries[n].kind === "dir" ? dirColor(n + "/") : n,
      )
      .join("  ") + "\n"
  );
}

function treeRender(node: FsNode, prefix: string): string {
  if (node.kind !== "dir") return "";
  const names = Object.keys(node.entries).sort();
  let out = "";
  names.forEach((name, i) => {
    const last = i === names.length - 1;
    const entry = node.entries[name];
    const branch = last ? "└── " : "├── ";
    const display = entry.kind === "dir" ? dirColor(name + "/") : name;
    out += prefix + branch + display + "\n";
    if (entry.kind === "dir") {
      out += treeRender(entry, prefix + (last ? "    " : "│   "));
    }
  });
  return out;
}

// ── Shell state ──────────────────────────────────────────────────────────────

const state = {
  cwd: HOME,
  prevCwd: HOME,
  history: [] as string[],
};

function prompt(): string {
  return `${GREEN}michiel${RESET}${DIM}@${RESET}${CYAN}voortman${RESET} ${MAGENTA}${displayCwd(state.cwd)}${RESET} ${BOLD}$${RESET} `;
}

// ── Commands ─────────────────────────────────────────────────────────────────

type Cmd = {
  name: string;
  desc: string;
  run: (args: string[]) => string;
};

const portfolio = (text: string) => () => text;

function cmdLs(args: string[]): string {
  const target = args[0] ? resolvePath(state.cwd, args[0]) : state.cwd;
  const node = lookup(target);
  if (!node) return `ls: ${args[0]}: no such file or directory\n`;
  if (node.kind === "file") {
    return (args[0] ?? target).split("/").pop() + "\n";
  }
  return listDir(node);
}

function cmdCd(args: string[]): string {
  let target: string;
  if (!args[0]) target = HOME;
  else if (args[0] === "-") target = state.prevCwd;
  else target = resolvePath(state.cwd, args[0]);
  const node = lookup(target);
  if (!node) return `cd: ${args[0]}: no such file or directory\n`;
  if (node.kind !== "dir") return `cd: ${args[0]}: not a directory\n`;
  state.prevCwd = state.cwd;
  state.cwd = target;
  return args[0] === "-" ? state.cwd + "\n" : "";
}

function cmdCat(args: string[]): string {
  if (!args.length) return "cat: missing operand\n";
  const out: string[] = [];
  for (const a of args) {
    const abs = resolvePath(state.cwd, a);
    const node = lookup(abs);
    if (!node) out.push(`cat: ${a}: no such file or directory`);
    else if (node.kind !== "file") out.push(`cat: ${a}: is a directory`);
    else out.push(node.content);
  }
  return out.join("\n") + "\n";
}

function cmdTree(args: string[]): string {
  const target = args[0] ? resolvePath(state.cwd, args[0]) : state.cwd;
  const node = lookup(target);
  if (!node) return `tree: ${args[0]}: no such file or directory\n`;
  const label = target === "/" ? "/" : target.split("/").pop()!;
  const head = node.kind === "dir" ? dirColor(label + "/") : label;
  return head + "\n" + treeRender(node, "");
}

function pad(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - s.length));
}

const commands: Record<string, Cmd> = {
  // ── shell ──
  pwd: { name: "pwd", desc: "print working directory", run: () => state.cwd + "\n" },
  ls: { name: "ls", desc: "list directory contents", run: cmdLs },
  cd: { name: "cd", desc: "change directory (no arg = home, '-' = previous)", run: cmdCd },
  cat: { name: "cat", desc: "print file contents", run: cmdCat },
  tree: { name: "tree", desc: "recursive directory listing", run: cmdTree },
  whoami: { name: "whoami", desc: "current user", run: () => "guest\n" },
  echo: { name: "echo", desc: "print arguments", run: (args) => args.join(" ") + "\n" },
  date: { name: "date", desc: "current date/time", run: () => new Date().toUTCString() + "\n" },
  uname: {
    name: "uname",
    desc: "system info",
    run: (args) => {
      if (args.includes("-a")) {
        return `michielOS 1.0 voortman boxd-kernel ${process.arch} pty\n`;
      }
      return "michielOS\n";
    },
  },
  history: {
    name: "history",
    desc: "command history",
    run: () =>
      state.history
        .slice()
        .reverse()
        .map((h, i) => `  ${pad(String(i + 1), 4)} ${h}`)
        .join("\n") + "\n",
  },
  clear: { name: "clear", desc: "clear the screen", run: () => CLEAR_SCREEN },

  // ── portfolio shortcuts (also browsable as files) ──
  about: { name: "about", desc: "who I am  (~/about.txt)", run: portfolio(aboutText) },
  projects: { name: "projects", desc: "what I'm building  (~/projects/)", run: portfolio(projectsText) },
  experience: { name: "experience", desc: "work history  (~/experience/)", run: portfolio(experienceText) },
  education: { name: "education", desc: "degrees  (~/education/)", run: portfolio(educationText) },
  awards: { name: "awards", desc: "races, hackathons, chess  (~/awards/)", run: portfolio(awardsText) },
  contact: { name: "contact", desc: "links  (~/contact.txt)", run: portfolio(contactText) },
  cv: { name: "cv", desc: "everything (~/cv.txt)", run: portfolio(cvText) },

  // ── help ──
  help: {
    name: "help",
    desc: "list commands",
    run: () => {
      const order = [
        "pwd", "ls", "cd", "cat", "tree",
        "whoami", "echo", "date", "uname", "history", "clear",
        "about", "projects", "experience", "education", "awards", "contact", "cv",
        "help",
      ];
      const rows = order.map((n) => {
        const c = commands[n];
        return `  ${BOLD}${pad(c.name, 12)}${RESET}${DIM}${c.desc}${RESET}`;
      });
      return "\n" + rows.join("\n") + "\n\n";
    },
  },
};

// ── Tab completion ───────────────────────────────────────────────────────────

const PATH_COMMANDS = new Set(["ls", "cd", "cat", "tree"]);
const DIR_ONLY_COMMANDS = new Set(["cd"]);

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

type Completion = { newLine: string; display?: string };

function complete(line: string): Completion {
  const endsWithSpace = line === "" || /\s$/.test(line);
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  const partial = endsWithSpace ? "" : (tokens[tokens.length - 1] ?? "");
  const isFirstToken = endsWithSpace ? tokens.length === 0 : tokens.length <= 1;
  const cmdName = tokens[0] ?? "";

  type Candidate = { name: string; isDir: boolean };
  let candidates: Candidate[];
  let basename: string;

  if (isFirstToken) {
    basename = partial;
    candidates = Object.keys(commands)
      .filter((n) => n.startsWith(partial))
      .sort()
      .map((n) => ({ name: n, isDir: false }));
  } else if (PATH_COMMANDS.has(cmdName)) {
    let basePath: string;
    if (partial.startsWith("~/")) {
      const rest = partial.slice(2);
      const i = rest.lastIndexOf("/");
      if (i >= 0) {
        basename = rest.slice(i + 1);
        basePath = "~/" + rest.slice(0, i + 1);
      } else {
        basename = rest;
        basePath = "~";
      }
    } else if (partial === "~") {
      basename = "";
      basePath = "~";
    } else {
      const i = partial.lastIndexOf("/");
      if (i >= 0) {
        basename = partial.slice(i + 1);
        basePath = partial.slice(0, i + 1) || "/";
      } else {
        basename = partial;
        basePath = ".";
      }
    }
    const dirAbs = resolvePath(state.cwd, basePath);
    const node = lookup(dirAbs);
    if (!node || node.kind !== "dir") return { newLine: line };
    const onlyDirs = DIR_ONLY_COMMANDS.has(cmdName);
    candidates = Object.keys(node.entries)
      .filter((name) => {
        if (!name.startsWith(basename)) return false;
        if (onlyDirs && node.entries[name].kind !== "dir") return false;
        return true;
      })
      .sort()
      .map((name) => ({ name, isDir: node.entries[name].kind === "dir" }));
  } else {
    return { newLine: line };
  }

  if (candidates.length === 0) return { newLine: line };

  if (candidates.length === 1) {
    const only = candidates[0];
    const suffix = only.isDir ? "/" : " ";
    return { newLine: line + only.name.slice(basename.length) + suffix };
  }

  const lcp = longestCommonPrefix(candidates.map((c) => c.name));
  if (lcp.length > basename.length) {
    return { newLine: line + lcp.slice(basename.length) };
  }

  const display = candidates
    .map((c) => (c.isDir ? dirColor(c.name + "/") : c.name))
    .join("  ");
  return { newLine: line, display };
}

function dispatch(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  state.history.unshift(trimmed);
  const [name, ...args] = trimmed.split(/\s+/);
  const cmd = commands[name];
  if (!cmd) {
    return `${YELLOW}unknown command:${RESET} ${name}   ${DIM}(try 'help')${RESET}\n`;
  }
  return cmd.run(args);
}

// ── Banner + input loop ──────────────────────────────────────────────────────

const BANNER = [
  photoBlock("michiel-main.jpeg", "thumb"),
  `${CYAN}┌──────────────────────────────────────────────────────────┐${RESET}`,
  `${CYAN}│${RESET}  ${BOLD}michiel voortman${RESET}                                        ${CYAN}│${RESET}`,
  `${CYAN}│${RESET}  ${DIM}building boxd.sh — persistent, forkable computers${RESET}       ${CYAN}│${RESET}`,
  `${CYAN}│${RESET}  ${DIM}for agents.${RESET}                                             ${CYAN}│${RESET}`,
  `${CYAN}└──────────────────────────────────────────────────────────┘${RESET}`,
  "",
  `type ${BOLD}help${RESET} for commands, ${BOLD}ls${RESET} to browse, or ${BOLD}cat photos/*${RESET} for pictures.`,
  "",
  "",
].join("\n");

process.stdout.write(CLEAR_SCREEN + BANNER + prompt());

let line = "";
let histIdx = -1;

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

// Keep the event loop alive even when stdin is idle.
const keepalive = setInterval(() => {}, 1 << 30);
process.on("exit", () => clearInterval(keepalive));

function eraseLine(current: string) {
  for (let i = 0; i < current.length; i++) process.stdout.write("\b \b");
}

process.stdin.on("data", (chunk: string) => {
  // Arrow keys arrive as their own escape sequence chunk.
  if (chunk === "\x1b[A") {
    if (state.history.length && histIdx + 1 < state.history.length) {
      histIdx++;
      eraseLine(line);
      line = state.history[histIdx];
      process.stdout.write(line);
    }
    return;
  }
  if (chunk === "\x1b[B") {
    if (histIdx > 0) {
      histIdx--;
      eraseLine(line);
      line = state.history[histIdx];
      process.stdout.write(line);
    } else if (histIdx === 0) {
      histIdx = -1;
      eraseLine(line);
      line = "";
    }
    return;
  }
  if (chunk === "\x1b[C" || chunk === "\x1b[D") return; // ignore left/right
  if (chunk.startsWith("\x1b")) return; // ignore other escapes

  for (const ch of chunk) {
    const code = ch.charCodeAt(0);

    if (ch === "\r") {
      process.stdout.write("\r\n");
      const input = line;
      line = "";
      histIdx = -1;
      if (input.trim()) {
        const out = dispatch(input);
        if (out) process.stdout.write(out);
      }
      process.stdout.write(prompt());
    } else if (ch === "\t") {
      const result = complete(line);
      if (result.display) {
        process.stdout.write("\r\n" + result.display + "\r\n" + prompt() + result.newLine);
      } else if (result.newLine !== line) {
        process.stdout.write(result.newLine.slice(line.length));
      }
      line = result.newLine;
    } else if (code === 127 || code === 8) {
      if (line.length > 0) {
        line = line.slice(0, -1);
        process.stdout.write("\b \b");
      }
    } else if (ch === "\x03") {
      process.stdout.write("^C\r\n" + prompt());
      line = "";
      histIdx = -1;
    } else if (ch === "\x04") {
      process.stdout.write("\r\n");
      process.exit(0);
    } else if (code >= 32 && code < 127) {
      line += ch;
      process.stdout.write(ch);
    }
  }
});
