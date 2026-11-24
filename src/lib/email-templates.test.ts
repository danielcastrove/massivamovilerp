import {
  EMAIL_TEMPLATE_TYPES,
  EMAIL_TEMPLATES,
  buildBrandEmail,
  emailMessageToHtml,
  escapeHtml,
  isEmailTemplateType,
} from "./email-templates";

describe("email-templates", () => {
  describe("metadatos", () => {
    it("define label, subject, title, color y hint para cada tipo", () => {
      for (const type of EMAIL_TEMPLATE_TYPES) {
        const meta = EMAIL_TEMPLATES[type];
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.subject.length).toBeGreaterThan(0);
        expect(meta.title.length).toBeGreaterThan(0);
        expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(typeof meta.hint).toBe("string");
        expect(typeof meta.model).toBe("string");
      }
    });

    it("los asuntos por defecto son únicos por objetivo", () => {
      const subjects = EMAIL_TEMPLATE_TYPES.map((t) => EMAIL_TEMPLATES[t].subject);
      expect(new Set(subjects).size).toBe(subjects.length);
    });
  });

  describe("isEmailTemplateType", () => {
    it("acepta tipos válidos", () => {
      expect(isEmailTemplateType("general")).toBe(true);
      expect(isEmailTemplateType("payment_reminder")).toBe(true);
      expect(isEmailTemplateType("service_reminder")).toBe(true);
      expect(isEmailTemplateType("payment_confirmation")).toBe(true);
    });

    it("rechaza valores inválidos", () => {
      expect(isEmailTemplateType("no_existe")).toBe(false);
      expect(isEmailTemplateType(42)).toBe(false);
      expect(isEmailTemplateType(undefined)).toBe(false);
      expect(isEmailTemplateType(null)).toBe(false);
    });
  });

  describe("escapeHtml / emailMessageToHtml", () => {
    it("escapa caracteres especiales", () => {
      expect(escapeHtml(`<b>hi</b> & "x" 'y'`)).toBe(
        "&lt;b&gt;hi&lt;/b&gt; &amp; &quot;x&quot; &#39;y&#39;"
      );
    });

    it("convierte saltos de línea en <br/> y escapa el resto", () => {
      expect(emailMessageToHtml("linea1\nlinea2 <script>")).toBe(
        "linea1<br/>linea2 &lt;script&gt;"
      );
      expect(emailMessageToHtml("a\r\nb")).toBe("a<br/>b");
    });
  });

  describe("buildBrandEmail", () => {
    it("inyecta el cuerpo en la plantilla institucional", () => {
      const html = buildBrandEmail({ type: "general", bodyHtml: "<p>Hola mundo</p>" });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<p>Hola mundo</p>");
      expect(html).toContain("Equipo MassivaMovil");
      expect(html).toContain("generado");
    });

    it("incluye el logo (isologo) apuntando a massivamovil.png", () => {
      const html = buildBrandEmail({ type: "general", bodyHtml: "x" });
      expect(html).toContain("/massivamovil.png");
      expect(html).toContain('alt="MassivaMovil"');
    });

    it("usa el color y el título de la variante solicitada", () => {
      const reminder = buildBrandEmail({ type: "payment_reminder", bodyHtml: "x" });
      expect(reminder).toContain(EMAIL_TEMPLATES.payment_reminder.color);
      expect(reminder).toContain(EMAIL_TEMPLATES.payment_reminder.title);

      const confirmation = buildBrandEmail({ type: "payment_confirmation", bodyHtml: "x" });
      expect(confirmation).toContain(EMAIL_TEMPLATES.payment_confirmation.color);
      expect(confirmation).toContain(EMAIL_TEMPLATES.payment_confirmation.title);
    });

    it("las variantes usan colores distintos entre sí", () => {
      const colors = EMAIL_TEMPLATE_TYPES.map((t) => EMAIL_TEMPLATES[t].color);
      expect(new Set(colors).size).toBe(colors.length);
    });

    it("incluye el pie con correo de soporte y aviso de automático", () => {
      const html = buildBrandEmail({ type: "general", bodyHtml: "x" });
      expect(html).toContain("erp@massivamovil.com");
      expect(html).toContain("No responda a este mensaje");
    });

    it("usa general como fallback ante un tipo desconocido", () => {
      const html = buildBrandEmail({
        type: "no_existe" as never,
        bodyHtml: "x",
      });
      expect(html).toContain(EMAIL_TEMPLATES.general.title);
      expect(html).toContain(EMAIL_TEMPLATES.general.color);
    });

    it("no re-escapa el cuerpo (viene ya escapado del caller)", () => {
      const html = buildBrandEmail({ type: "general", bodyHtml: "a &lt;b&gt; &amp; c" });
      expect(html).toContain("a &lt;b&gt; &amp; c");
      expect(html).not.toContain("&amp;lt;");
    });
  });
});
