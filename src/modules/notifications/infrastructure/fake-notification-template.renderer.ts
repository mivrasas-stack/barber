import type {
  NotificationTemplateRenderer,
  RenderNotificationTemplateInput,
  RenderedNotificationTemplate,
} from "../domain/notification-template-renderer.interface";

function stableData(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(data).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    )
  );
}

/**
 * Deterministic template renderer for tests and local certification.
 * Production channel adapters may use this contract with a richer renderer
 * without changing notification orchestration.
 */
export class FakeNotificationTemplateRenderer
  implements NotificationTemplateRenderer
{
  async render(
    input: RenderNotificationTemplateInput
  ): Promise<RenderedNotificationTemplate> {
    const prefix = `${input.templateKey}@v${input.templateVersion}:${input.locale}`;
    const data = stableData(input.data);

    return {
      subject:
        input.channel === "EMAIL"
          ? `[${input.locale}] ${input.templateKey}`
          : undefined,
      text: `${prefix} ${data}`,
      html:
        input.channel === "EMAIL"
          ? `<p>${escapeHtml(prefix)}</p><pre>${escapeHtml(data)}</pre>`
          : undefined,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
