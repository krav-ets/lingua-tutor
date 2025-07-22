import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CACHE = new Map<string, {
  system: Handlebars.TemplateDelegate;
  user: Handlebars.TemplateDelegate;
}>();

export async function renderPrompt(
  name: string,
  vars: Record<string, unknown>,
): Promise<{ system: string; user: string }> {
  if (!CACHE.has(name)) {
    const filePath = resolve(__dirname, 'prompts', `${name}.prompt.hbs`);
    const fileContent = await readFile(filePath, 'utf8');

    const parts = fileContent.split('---');
    if (parts.length !== 2) {
      throw new Error(`Prompt file "${name}.prompt.hbs" must contain exactly one "---" separator.`);
    }

    const [systemTemplate, userTemplate] = parts;

    CACHE.set(name, {
      system: Handlebars.compile(systemTemplate.trim()),
      user: Handlebars.compile(userTemplate.trim()),
    });
  }

  const templates = CACHE.get(name)!;

  return {
    system: templates.system(vars),
    user: templates.user(vars),
  };
}
