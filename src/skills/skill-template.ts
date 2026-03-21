/**
 * Skill 模板系统
 * 声明式技能定义 + 自动文档生成
 */

import { z } from "zod";
import { log } from "../utils/logger";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ============================================
// Skill Schema 定义
// ============================================

export const skillFrontmatterSchema = z.object({
  name: z.string().min(1).describe("技能名称"),
  version: z.string().optional().default("1.0.0").describe("版本号"),
  description: z.string().describe("技能描述"),
  allowedTools: z
    .array(z.string())
    .optional()
    .describe("允许的工具列表"),
  triggers: z
    .array(z.string())
    .optional()
    .describe("触发关键词"),
  priority: z.number().min(0).max(100).optional().default(50).describe("优先级"),
  model: z.enum(["sonnet", "opus", "haiku"]).optional().describe("推荐模型"),
  maxTurns: z.number().min(1).optional().describe("最大轮次"),
});

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;

export interface Skill {
  name: string;
  frontmatter: SkillFrontmatter;
  content: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 常量
// ============================================

const SKILLS_DIR = join(homedir(), ".ztl-coder", "skills");

// 预定义的模板变量
const TEMPLATE_VARIABLES: Record<string, string> = {
  PREAMBLE: `## Preamble (run first)

Run the preamble to initialize session tracking and branch detection.`,

  ASK_USER_QUESTION_FORMAT: `## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch, and the current task.
2. **Simplify:** Explain the problem in plain English.
3. **Recommend:** \`RECOMMENDATION: Choose [X] because [reason]\`
4. **Options:** Lettered options: \`A) ... B) ... C) ...\``,

  FIX_FIRST_REVIEW: `## Fix-First Review

**Every finding gets action — not just critical ones.**

### Classification
- **AUTO-FIX**: Simple issues (style, formatting) → apply directly
- **ASK**: Complex issues (logic, security) → batch and ask user

### Output format
\`\`\`
[AUTO-FIXED] [file:line] Problem → what you did
\`\`\``,

  COMPLETENESS_PRINCIPLE: `## Completeness Principle — Boil the Lake

AI-assisted coding makes the marginal cost of completeness near-zero.
- Always recommend the complete implementation over shortcuts
- Lake vs. ocean: lakes are boilable, oceans are not
- When estimating effort, show both scales: human time / CC time`,

  TELEMETRY: `## Telemetry (run last)

After the skill workflow completes, log the telemetry event to the local analytics file.`,
};

// ============================================
// 解析函数
// ============================================

/**
 * 解析 YAML frontmatter
 */
export function parseFrontmatter(content: string): {
  frontmatter: SkillFrontmatter | null;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const [, yamlContent, body] = match;

  try {
    // 简单的 YAML 解析（支持基本格式）
    const data: Record<string, unknown> = {};
    let currentKey = "";
    let inMultiline = false;
    let multilineValue = "";

    for (const line of yamlContent.split("\n")) {
      if (inMultiline) {
        if (line.startsWith("  ") || line === "") {
          multilineValue += line.slice(2) + "\n";
          continue;
        }
        data[currentKey] = multilineValue.trim();
        inMultiline = false;
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (value === "|" || value === ">") {
        currentKey = key;
        inMultiline = true;
        multilineValue = "";
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // 简单数组解析
        data[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else if (value === "true" || value === "false") {
        data[key] = value === "true";
      } else if (/^\d+$/.test(value)) {
        data[key] = parseInt(value, 10);
      } else {
        data[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }

    if (inMultiline) {
      data[currentKey] = multilineValue.trim();
    }

    const frontmatter = skillFrontmatterSchema.parse(data);
    return { frontmatter, body };
  } catch (error) {
    log.warn(`解析 frontmatter 失败: ${error}`, { operation: "skill_parse" });
    return { frontmatter: null, body };
  }
}

/**
 * 解析模板变量
 */
export function parseTemplateVariables(content: string): string[] {
  const regex = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * 渲染模板
 */
export function renderTemplate(
  content: string,
  variables: Record<string, string> = {}
): string {
  let result = content;

  // 合并预定义变量和自定义变量
  const allVariables = { ...TEMPLATE_VARIABLES, ...variables };

  // 替换所有模板变量
  for (const [key, value] of Object.entries(allVariables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  // 添加自动生成注释
  if (content.includes("{{")) {
    result = `<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: ztl-coder gen:skills -->

${result}`;
  }

  return result;
}

// ============================================
// Skill 管理器
// ============================================

export class SkillManager {
  private skills: Map<string, Skill> = new Map();

  constructor() {
    this.loadSkills();
  }

  /**
   * 加载所有技能
   */
  private loadSkills(): void {
    if (!existsSync(SKILLS_DIR)) {
      mkdirSync(SKILLS_DIR, { recursive: true });
      return;
    }

    const loadDir = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          loadDir(fullPath);
        } else if (entry.name === "SKILL.md" || entry.name.endsWith(".skill.md")) {
          this.loadSkill(fullPath);
        }
      }
    };

    try {
      loadDir(SKILLS_DIR);
      log.info(`加载了 ${this.skills.size} 个技能`, { operation: "skill_load" });
    } catch (error) {
      log.error(`加载技能失败: ${error}`, { operation: "skill_load" });
    }
  }

  /**
   * 加载单个技能
   */
  private loadSkill(filePath: string): void {
    try {
      const content = readFileSync(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      if (!frontmatter) {
        log.warn(`技能缺少 frontmatter: ${filePath}`, { operation: "skill_load" });
        return;
      }

      const stat = statSync(filePath);
      const skill: Skill = {
        name: frontmatter.name,
        frontmatter,
        content: body,
        filePath,
        createdAt: stat.birthtime,
        updatedAt: stat.mtime,
      };

      this.skills.set(frontmatter.name, skill);
    } catch (error) {
      log.error(`加载技能失败: ${filePath}`, { operation: "skill_load" });
    }
  }

  /**
   * 获取技能
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * 获取所有技能
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按触发词匹配技能
   */
  matchByTrigger(query: string): Skill[] {
    const queryLower = query.toLowerCase();
    const matches: Array<{ skill: Skill; score: number }> = [];

    for (const skill of this.skills.values()) {
      const triggers = skill.frontmatter.triggers;
      if (!triggers) continue;

      for (const trigger of triggers) {
        if (queryLower.includes(trigger.toLowerCase())) {
          matches.push({
            skill,
            score: skill.frontmatter.priority || 50,
          });
          break;
        }
      }
    }

    // 按优先级排序
    return matches
      .sort((a, b) => b.score - a.score)
      .map((m) => m.skill);
  }

  /**
   * 生成技能文档
   */
  generateDoc(name: string): string {
    const skill = this.skills.get(name);
    if (!skill) {
      return `技能 "${name}" 不存在`;
    }

    const lines: string[] = [
      `# /${skill.frontmatter.name}`,
      "",
      `**版本**: ${skill.frontmatter.version}`,
      "",
      skill.frontmatter.description,
    ];

    if (skill.frontmatter.triggers?.length) {
      lines.push("", "**触发词**:", ...skill.frontmatter.triggers.map((t) => `- ${t}`));
    }

    if (skill.frontmatter.allowedTools?.length) {
      lines.push("", "**允许的工具**:", ...skill.frontmatter.allowedTools.map((t) => `- ${t}`));
    }

    lines.push("", "---", "", skill.content);

    return lines.join("\n");
  }

  /**
   * 生成所有技能的帮助文档
   */
  generateHelp(): string {
    const lines: string[] = ["# ztl-coder 技能列表", ""];

    const sortedSkills = Array.from(this.skills.values()).sort(
      (a, b) => (b.frontmatter.priority || 50) - (a.frontmatter.priority || 50)
    );

    for (const skill of sortedSkills) {
      const desc = skill.frontmatter.description.split("\n")[0];
      lines.push(`- **/${skill.name}** - ${desc}`);
    }

    return lines.join("\n");
  }
}

// 单例实例
export const skillManager = new SkillManager();

// ============================================
// 模板生成器
// ============================================

export interface SkillTemplateOptions {
  name: string;
  description: string;
  version?: string;
  allowedTools?: string[];
  triggers?: string[];
  includePreamble?: boolean;
  includeTelemetry?: boolean;
  includeFixFirst?: boolean;
}

/**
 * 生成技能模板
 */
export function generateSkillTemplate(options: SkillTemplateOptions): string {
  const lines: string[] = [
    "---",
    `name: ${options.name}`,
    `version: ${options.version || "1.0.0"}`,
    `description: |`,
    `  ${options.description.split("\n").join("\n  ")}`,
  ];

  if (options.allowedTools?.length) {
    lines.push("allowed-tools:");
    for (const tool of options.allowedTools) {
      lines.push(`  - ${tool}`);
    }
  }

  if (options.triggers?.length) {
    lines.push("triggers:");
    for (const trigger of options.triggers) {
      lines.push(`  - ${trigger}`);
    }
  }

  lines.push("---", "");

  if (options.includePreamble !== false) {
    lines.push("{{PREAMBLE}}", "");
  }

  lines.push(`# ${options.name}`, "", "TODO: 添加技能说明", "");

  if (options.includeFixFirst !== false) {
    lines.push("{{FIX_FIRST_REVIEW}}", "");
  }

  if (options.includeTelemetry !== false) {
    lines.push("{{TELEMETRY}}");
  }

  return lines.join("\n");
}

/**
 * 生成技能文件
 */
export function generateSkillFile(
  templatePath: string,
  outputPath: string,
  customVariables: Record<string, string> = {}
): void {
  const template = readFileSync(templatePath, "utf-8");
  const rendered = renderTemplate(template, customVariables);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered);

  log.info(`生成技能文件: ${outputPath}`, { operation: "skill_generate" });
}
