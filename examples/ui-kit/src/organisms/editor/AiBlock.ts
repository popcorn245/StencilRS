import type { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_firestore",
      description: "Query documents from the Firestore database. Use to look up notes, blocks, users, activities, tasks, tags, recipes, inventory, and other app data.",
      parameters: {
        type: "object",
        properties: {
          collection: { type: "string", description: 'Collection path, e.g. "notes", "blocks", "users", "activities", "tasks"' },
          doc:        { type: "string", description: 'Full document path for a single document, e.g. "notes/abc123"' },
          where:      { type: "string", description: 'JSON array of filters: [{"key":"type","op":"==","value":"code"}]' },
          orderBy:    { type: "string", description: "Field to sort by" },
          orderDir:   { type: "string", description: '"asc" or "desc"' },
          limit:      { type: "number", description: "Max documents to return (max 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_web",
      description: "Fetch and read the content of a specific web page by URL",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "Full URL of the page to read" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web using the local SearXNG instance",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, any>): Promise<string> {
  if (name === "query_firestore") {
    try {
      const params = new URLSearchParams();
      if (args.collection) params.set("collection", args.collection);
      if (args.doc)        params.set("doc", args.doc);
      if (args.where)      params.set("where", args.where);
      if (args.orderBy)    params.set("orderBy", args.orderBy);
      if (args.orderDir)   params.set("orderDir", args.orderDir);
      if (args.limit)      params.set("limit", String(args.limit));
      const res = await fetch(`/api/firestore?${params}`);
      const data = await res.json();
      if (data.error) return `Error: ${data.error}`;
      return JSON.stringify(data, null, 2);
    } catch {
      return "Failed to query Firestore.";
    }
  }
  if (name === "browse_web") {
    try {
      const res = await fetch(`/api/browse?url=${encodeURIComponent(args.url)}`);
      const data = await res.json();
      if (data.error) return `Error: ${data.error}`;
      return `Content of ${data.url}:\n\n${data.text}`;
    } catch {
      return "Failed to fetch the page.";
    }
  }
  if (name === "search_web") {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(args.query)}`);
      const data = await res.json();
      const results = (data.results ?? []).slice(0, 4);
      if (!results.length) return "No results found.";
      return results.map((r: any) => `${r.title}\n${r.content}\n${r.url}`).join("\n\n");
    } catch {
      return "Search unavailable.";
    }
  }
  return "Unknown tool.";
}

interface AiBlockData {
  prompt: string;
  content: string;
  model?: string;
  status?: string;
}

/**
 * AiBlock — EditorJS Block Tool wrapping the `pop-ai-block` StencilJS component.
 *
 * Generates text via Ollama or Claude (with tool support) based on a user prompt.
 * Props-down/events-up pattern: the block tool creates a `pop-ai-block` custom element
 * and listens for events to update its internal data.
 *
 * Saved data is backwards-compatible with the previous vanilla DOM version.
 */
export default class AiBlock implements BlockTool {
  private data: AiBlockData;
  private wrapper: HTMLElement;
  private blockAPI: any;
  private el: any = null;

  static get toolbox() {
    if (!(window as any).__ollamaAvailable) return undefined;
    return {
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>',
      title: "AI",
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return true; }
  static get sanitize() { return { prompt: false, content: false }; }

  constructor({ data, block }: BlockToolConstructorOptions<AiBlockData, any> & { block?: any }) {
    this.blockAPI = block;
    this.data = {
      prompt: data.prompt || "",
      content: data.content || "",
      model: data.model || "gemma4:e4b",
      status: data.status || "idle",
    };
    this.wrapper = document.createElement("div");
  }

  render(): HTMLElement {
    this.wrapper.className = "ai-block-root";

    // Reuse existing element to preserve state during EditorJS re-renders
    if (this.el) {
      this.el.prompt = this.data.prompt;
      this.el.response = this.data.content;
      this.el.model = this.data.model || "gemma4:e4b";
      this.el.status = this.data.status || "idle";
      if (!this.wrapper.contains(this.el)) {
        this.wrapper.innerHTML = "";
        this.wrapper.appendChild(this.el);
      }
      return this.wrapper;
    }

    this.wrapper.innerHTML = "";
    const el = document.createElement("pop-ai-block") as any;
    this.el = el;
    el.prompt = this.data.prompt;
    el.response = this.data.content;
    el.model = this.data.model || "gemma4:e4b";
    el.status = this.data.status || "idle";
    el.ollamaAvailable = !!(window as any).__ollamaAvailable;

    // Listen for events from the component
    el.addEventListener("aiGenerate", async (e: CustomEvent) => {
      const { prompt, model } = e.detail;
      this.data.prompt = prompt;
      this.data.model = model;
      this.data.status = "generating";

      el.status = "generating";
      el.response = "";

      try {
        const content = await this._generate(prompt, model, el);
        this.data.content = content;
        this.data.status = "done";
        el.response = content;
        el.status = "done";
      } catch (err: any) {
        this.data.status = "error";
        el.status = "error";
        el.response = `Error: ${err.message}`;
      }

      this.notifyChange();
    });

    el.addEventListener("aiModelChange", (e: CustomEvent) => {
      this.data.model = e.detail.model;
      this.notifyChange();
    });

    el.addEventListener("aiChange", (e: CustomEvent) => {
      const d = e.detail;
      this.data.prompt = d.prompt;
      this.data.content = d.response;
      this.data.model = d.model;
      this.data.status = d.status;
      this.notifyChange();
    });

    this.wrapper.appendChild(el);
    return this.wrapper;
  }

  private async _generate(prompt: string, model: string, el: any): Promise<string> {
    const isOllama = model.includes("gemma") || model.includes("llama");
    let messages: any[] = [{ role: "user", content: prompt }];

    if (isOllama) {
      // Ollama tool-calling loop
      while (true) {
        const resp = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, tools: AI_TOOLS, stream: false }),
        });
        if (!resp.ok) throw new Error(`AI proxy error: ${resp.status}`);
        const json = await resp.json();
        const msg = json.message;

        if (msg.tool_calls?.length) {
          const toolResults: any[] = [];
          for (const call of msg.tool_calls) {
            const fn = call.function.name;
            const args = typeof call.function.arguments === "string"
              ? JSON.parse(call.function.arguments)
              : call.function.arguments;

            // Update status text on the component
            el.statusText = `\u2699 ${fn}(${JSON.stringify(args).slice(0, 60)})`;
            const result = await runTool(fn, args);
            el.statusText = `\u2713 ${fn}`;
            toolResults.push({ role: "tool", content: result });
          }
          messages = [...messages, msg, ...toolResults];
        } else {
          el.statusText = "";
          return msg.content || "";
        }
      }
    } else {
      // Claude API via server proxy
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          model,
          tools: AI_TOOLS,
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
      const json = await resp.json();
      return json.content || json.message?.content || "";
    }
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === "function") {
      this.blockAPI.dispatchChange();
    }
  }

  save(): AiBlockData {
    return {
      prompt: this.data.prompt,
      content: this.data.content,
      model: this.data.model,
      status: this.data.status,
    };
  }

  validate(data: AiBlockData): boolean {
    return typeof data.prompt === "string";
  }
}
