/**
 * 交互向导模块
 *
 * 提供交互式命令向导，引导用户完成复杂操作
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { OutputFormatter, createFormatter } from "./output.ts";

/** 向导步骤类型 */
export type StepType = "text" | "select" | "multiselect" | "confirm" | "number";

/** 向导步骤定义 */
export interface WizardStep<T = unknown> {
  /** 步骤 ID */
  id: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤类型 */
  type: StepType;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: T;
  /** 验证函数 */
  validate?: (value: T) => string | true;
  /** 选项（用于 select/multiselect） */
  options?: WizardOption[];
  /** 占位符 */
  placeholder?: string;
  /** 仅当条件满足时显示 */
  when?: (answers: Record<string, unknown>) => boolean;
}

/** 向导选项 */
export interface WizardOption {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 选项描述 */
  description?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 向导配置 */
export interface WizardConfig {
  /** 向导标题 */
  title: string;
  /** 向导描述 */
  description?: string;
  /** 步骤列表 */
  steps: WizardStep[];
  /** 是否显示进度 */
  showProgress?: boolean;
  /** 是否允许返回上一步 */
  allowBack?: boolean;
  /** 输出格式化器 */
  formatter?: OutputFormatter;
}

/** 向导结果 */
export interface WizardResult {
  /** 用户输入 */
  answers: Record<string, unknown>;
  /** 是否完成 */
  completed: boolean;
  /** 取消的步骤 ID */
  cancelledAt?: string;
}

/** 交互向导 */
export class InteractiveWizard {
  private config: WizardConfig;
  private formatter: OutputFormatter;
  private answers: Record<string, unknown> = {};
  private currentStep: number = 0;
  private rl: readline.ReadLineInterface | null = null;

  constructor(config: WizardConfig) {
    this.config = config;
    this.formatter = config.formatter || createFormatter();
  }

  /** 运行向导 */
  async run(): Promise<WizardResult> {
    this.rl = readline.createInterface({ input, output });

    try {
      // 显示欢迎信息
      this.showWelcome();

      // 遍历所有步骤
      for (let i = 0; i < this.config.steps.length; i++) {
        this.currentStep = i;
        const step = this.config.steps[i];

        // 检查条件
        if (step.when && !step.when(this.answers)) {
          continue;
        }

        // 显示进度
        if (this.config.showProgress) {
          this.showProgress(i);
        }

        // 执行步骤
        const result = await this.executeStep(step);
        if (result.cancelled) {
          return {
            answers: this.answers,
            completed: false,
            cancelledAt: step.id,
          };
        }

        this.answers[step.id] = result.value;
      }

      // 显示完成信息
      this.showComplete();

      return {
        answers: this.answers,
        completed: true,
      };
    } finally {
      this.rl.close();
    }
  }

  private showWelcome(): void {
    console.log("");
    console.log(this.formatter.bold(this.formatter.color("═".repeat(50), "cyan")));
    console.log(this.formatter.bold(this.formatter.center(this.config.title, 50)));
    if (this.config.description) {
      console.log(this.formatter.dim(this.formatter.center(this.config.description, 50)));
    }
    console.log(this.formatter.bold(this.formatter.color("═".repeat(50), "cyan")));
    console.log("");
  }

  private showProgress(stepIndex: number): void {
    const total = this.config.steps.length;
    const current = stepIndex + 1;
    const bar = this.formatter.progressBar(current, total, 20);
    console.log(this.formatter.dim(`\n步骤 ${current}/${total} ${bar}`));
    console.log("");
  }

  private showComplete(): void {
    console.log("");
    console.log(this.formatter.success("✓ 向导完成！"));
    console.log("");
  }

  private async executeStep(step: WizardStep): Promise<{ value: unknown; cancelled: boolean }> {
    // 显示步骤标题
    console.log(this.formatter.bold(step.title));
    if (step.description) {
      console.log(this.formatter.dim(step.description));
    }
    console.log("");

    switch (step.type) {
      case "text":
        return this.executeTextStep(step);
      case "select":
        return this.executeSelectStep(step);
      case "multiselect":
        return this.executeMultiselectStep(step);
      case "confirm":
        return this.executeConfirmStep(step);
      case "number":
        return this.executeNumberStep(step);
      default:
        return { value: step.default, cancelled: false };
    }
  }

  private async executeTextStep(step: WizardStep<string>): Promise<{ value: string; cancelled: boolean }> {
    const prompt = this.formatter.dim(step.placeholder || "请输入");
    const defaultHint = step.default ? this.formatter.dim(` (默认: ${step.default})`) : "";

    while (true) {
      const answer = await this.rl!.question(`${prompt}${defaultHint}: `);

      // 检查取消
      if (answer.toLowerCase() === "cancel" || answer.toLowerCase() === "取消") {
        return { value: "", cancelled: true };
      }

      // 使用默认值
      const value = answer.trim() || step.default || "";

      // 检查必填
      if (step.required && !value) {
        console.log(this.formatter.error("此字段为必填项"));
        continue;
      }

      // 验证
      if (step.validate) {
        const result = step.validate(value);
        if (result !== true) {
          console.log(this.formatter.error(result));
          continue;
        }
      }

      return { value, cancelled: false };
    }
  }

  private async executeSelectStep(step: WizardStep<string>): Promise<{ value: string; cancelled: boolean }> {
    const options = step.options || [];

    // 显示选项
    console.log(this.formatter.dim("请选择一个选项:"));
    options.forEach((opt, i) => {
      const num = this.formatter.color(`${i + 1}`, "cyan");
      const disabled = opt.disabled ? this.formatter.dim(" (不可用)") : "";
      const desc = opt.description ? this.formatter.dim(` - ${opt.description}`) : "";
      console.log(`  ${num}. ${opt.label}${desc}${disabled}`);
    });
    console.log("");

    while (true) {
      const answer = await this.rl!.question(this.formatter.dim("输入选项编号: "));

      // 检查取消
      if (answer.toLowerCase() === "cancel" || answer.toLowerCase() === "取消") {
        return { value: "", cancelled: true };
      }

      // 解析选择
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < options.length) {
        const selected = options[index];
        if (selected.disabled) {
          console.log(this.formatter.error("此选项不可用"));
          continue;
        }
        return { value: selected.value, cancelled: false };
      }

      // 检查默认值
      if (!answer && step.default) {
        return { value: step.default as string, cancelled: false };
      }

      console.log(this.formatter.error("无效选择，请重试"));
    }
  }

  private async executeMultiselectStep(step: WizardStep<string[]>): Promise<{ value: string[]; cancelled: boolean }> {
    const options = step.options || [];

    // 显示选项
    console.log(this.formatter.dim("请选择多个选项 (用逗号分隔):"));
    options.forEach((opt, i) => {
      const num = this.formatter.color(`${i + 1}`, "cyan");
      const disabled = opt.disabled ? this.formatter.dim(" (不可用)") : "";
      console.log(`  ${num}. ${opt.label}${disabled}`);
    });
    console.log("");

    while (true) {
      const answer = await this.rl!.question(this.formatter.dim("输入选项编号 (如: 1,3,5): "));

      // 检查取消
      if (answer.toLowerCase() === "cancel" || answer.toLowerCase() === "取消") {
        return { value: [], cancelled: true };
      }

      // 解析选择
      const indices = answer.split(",").map((s) => parseInt(s.trim(), 10) - 1);
      const validIndices = indices.filter((i) => i >= 0 && i < options.length && !options[i].disabled);

      if (validIndices.length > 0) {
        const values = validIndices.map((i) => options[i].value);
        return { value: values, cancelled: false };
      }

      // 检查默认值
      if (!answer && step.default) {
        return { value: step.default as string[], cancelled: false };
      }

      // 允许空选择
      if (!step.required && answer.trim() === "") {
        return { value: [], cancelled: false };
      }

      console.log(this.formatter.error("无效选择，请重试"));
    }
  }

  private async executeConfirmStep(step: WizardStep<boolean>): Promise<{ value: boolean; cancelled: boolean }> {
    const defaultHint = step.default !== undefined ? ` (${step.default ? "Y/n" : "y/N"})` : "";
    const prompt = this.formatter.dim(`确认?${defaultHint}`);

    while (true) {
      const answer = await this.rl!.question(`${prompt} `);

      // 检查取消
      if (answer.toLowerCase() === "cancel" || answer.toLowerCase() === "取消") {
        return { value: false, cancelled: true };
      }

      // 解析布尔值
      const lower = answer.toLowerCase().trim();
      if (lower === "y" || lower === "yes" || lower === "是") {
        return { value: true, cancelled: false };
      }
      if (lower === "n" || lower === "no" || lower === "否") {
        return { value: false, cancelled: false };
      }

      // 使用默认值
      if (!lower && step.default !== undefined) {
        return { value: step.default, cancelled: false };
      }

      console.log(this.formatter.error("请输入 y/n"));
    }
  }

  private async executeNumberStep(step: WizardStep<number>): Promise<{ value: number; cancelled: boolean }> {
    const prompt = this.formatter.dim(step.placeholder || "请输入数字");
    const defaultHint = step.default !== undefined ? this.formatter.dim(` (默认: ${step.default})`) : "";

    while (true) {
      const answer = await this.rl!.question(`${prompt}${defaultHint}: `);

      // 检查取消
      if (answer.toLowerCase() === "cancel" || answer.toLowerCase() === "取消") {
        return { value: 0, cancelled: true };
      }

      // 使用默认值
      if (!answer.trim() && step.default !== undefined) {
        return { value: step.default, cancelled: false };
      }

      // 解析数字
      const num = parseFloat(answer);
      if (isNaN(num)) {
        console.log(this.formatter.error("请输入有效的数字"));
        continue;
      }

      // 验证
      if (step.validate) {
        const result = step.validate(num);
        if (result !== true) {
          console.log(this.formatter.error(result));
          continue;
        }
      }

      return { value: num, cancelled: false };
    }
  }
}

/** 创建向导 */
export function createWizard(config: WizardConfig): InteractiveWizard {
  return new InteractiveWizard(config);
}

/** 快速文本输入 */
export async function promptText(
  title: string,
  options?: {
    default?: string;
    required?: boolean;
    placeholder?: string;
    validate?: (value: string) => string | true;
  },
): Promise<string | null> {
  const wizard = new InteractiveWizard({
    title: "输入",
    steps: [
      {
        id: "value",
        title,
        type: "text",
        ...options,
      },
    ],
  });

  const result = await wizard.run();
  return result.completed ? (result.answers.value as string) : null;
}

/** 快速确认 */
export async function promptConfirm(title: string, defaultValue?: boolean): Promise<boolean | null> {
  const wizard = new InteractiveWizard({
    title: "确认",
    steps: [
      {
        id: "value",
        title,
        type: "confirm",
        default: defaultValue,
      },
    ],
  });

  const result = await wizard.run();
  return result.completed ? (result.answers.value as boolean) : null;
}

/** 快速选择 */
export async function promptSelect(
  title: string,
  options: WizardOption[],
  defaultValue?: string,
): Promise<string | null> {
  const wizard = new InteractiveWizard({
    title: "选择",
    steps: [
      {
        id: "value",
        title,
        type: "select",
        options,
        default: defaultValue,
      },
    ],
  });

  const result = await wizard.run();
  return result.completed ? (result.answers.value as string) : null;
}

/** 快速多选 */
export async function promptMultiselect(
  title: string,
  options: WizardOption[],
  defaultValue?: string[],
): Promise<string[] | null> {
  const wizard = new InteractiveWizard({
    title: "多选",
    steps: [
      {
        id: "value",
        title,
        type: "multiselect",
        options,
        default: defaultValue,
      },
    ],
  });

  const result = await wizard.run();
  return result.completed ? (result.answers.value as string[]) : null;
}

/** 快速数字输入 */
export async function promptNumber(
  title: string,
  options?: {
    default?: number;
    required?: boolean;
    placeholder?: string;
    validate?: (value: number) => string | true;
  },
): Promise<number | null> {
  const wizard = new InteractiveWizard({
    title: "输入数字",
    steps: [
      {
        id: "value",
        title,
        type: "number",
        ...options,
      },
    ],
  });

  const result = await wizard.run();
  return result.completed ? (result.answers.value as number) : null;
}
