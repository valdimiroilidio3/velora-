import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Alert } from "./alert";
import { Button, buttonClass } from "./button";
import { EmptyState } from "./empty-state";
import { ProjectStatusPill } from "./status-pill";
import { RadioCards } from "./radio-cards";
import { ToastProvider, useToast } from "./toast";
import type { ReactNode } from "react";
import { ControlFieldSample, FieldSample } from "@/test/form-samples";
import { ui } from "@/i18n/pt";

/**
 * Estados dos primitivos verificados em DOM: é o que separa "tenho componentes" de
 * "os componentes comunicam estado" — rótulo ligado ao controlo, erro anunciado, região
 * `aria-live`, desativado dito em texto e não só em opacidade.
 */

afterEach(() => {
  cleanup();
});

describe("Field", () => {
  it("liga rótulo, ajuda e erro ao controlo", () => {
    const view = render(<FieldSample />);
    const input = screen.getByRole("textbox", { name: /nome do empreendimento/i });
    expect(input.getAttribute("aria-describedby")).toContain("campo-nome-hint");
    expect(input).not.toHaveAttribute("aria-invalid");
    view.unmount();

    render(<FieldSample error="Falta o nome." />);
    const invalid = screen.getByRole("textbox", { name: /nome do empreendimento/i });
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    expect(invalid.getAttribute("aria-describedby")).toContain("campo-nome-error");
    expect(invalid.getAttribute("data-invalid")).toBe("true");
    expect(screen.getByText("Falta o nome.")).toBeInTheDocument();
  });

  it("marca o obrigatório sem depender só do asterisco visual", () => {
    render(<FieldSample />);
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(ui.forms.required)).toBeInTheDocument();
  });

  it("o controlo partilhado tem alvo de toque e borda de contraste", () => {
    render(<ControlFieldSample />);
    const input = screen.getByRole("textbox", { name: /pesquisa/i });
    expect(input.className).toContain("min-h-[var(--tap-min)]");
    expect(input.className).toContain("border-line-control");
    expect(screen.getByText(ui.forms.optional)).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("anuncia sem interromper quando é informativo", () => {
    render(<Alert>O catálogo é de demonstração.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("demonstração");
  });

  it("só usa role=alert para erro", () => {
    render(
      <Alert tone="danger" title="Sem sessão">
        Não existe autenticação nesta fase.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Sem sessão")).toBeInTheDocument();
  });
});

describe("RadioCards", () => {
  const options = [
    { value: "comfortable", label: "Confortável", description: "mais respiro" },
    { value: "compact", label: "Compacta", description: "mais linhas" },
    { value: "extreme", label: "Indisponível", description: "exemplo desativado", disabled: true },
  ];

  function renderCards(onChange = vi.fn()) {
    render(
      <RadioCards
        name="densidade"
        legend="Densidade"
        hint="afeta os blocos de conteúdo"
        value="comfortable"
        options={options}
        onChange={onChange}
      />,
    );
    return onChange;
  }

  it("é um group com legenda e estado selecionado comunicados", () => {
    renderCards();
    expect(screen.getByRole("group", { name: "Densidade" })).toBeInTheDocument();
    expect(screen.getByText("afeta os blocos de conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Confortável/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Compacta/i })).not.toBeChecked();
  });

  it("escolher emite o valor", () => {
    const onChange = renderCards();
    fireEvent.click(screen.getByRole("radio", { name: /Compacta/i }));
    expect(onChange).toHaveBeenCalledWith("compact");
  });

  it("a opção indisponível está desativada de verdade e diz porquê", () => {
    // Não verificamos aqui que o clique não emite: `fireEvent` contorna as regras de interação
    // do browser, e é o browser (input `disabled`) que garante isso. O que este teste pode
    // provar é que o estado está declarado — inclusive para quem não vê a opacidade.
    renderCards();
    const disabled = screen.getByRole("radio", { name: /Indisponível/i });
    expect(disabled).toBeDisabled();
    expect(disabled.closest("label")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/exemplo desativado — indisponível/)).toBeInTheDocument();
  });
});

describe("Button e estilo partilhado", () => {
  it("buttonClass produz exatamente as classes do componente (é isso que os links usam)", () => {
    render(
      <Button variant="secondary" size="sm">
        Abrir
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Abrir" });
    expect(button.className).toBe(buttonClass("secondary", "sm"));
    expect(button).toHaveAttribute("type", "button");
  });

  it("fica inacessível quando desativado", () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});

describe("StatusPill", () => {
  it("traduz o estado do registo", () => {
    render(<ProjectStatusPill status="in_review" />);
    expect(screen.getByText(ui.status.in_review)).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("tem título, explicação e ação real", () => {
    render(
      <EmptyState
        title={ui.projects.empty.withFilters}
        description="Alarga a pesquisa."
        action={<Button>Limpar filtros</Button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Nenhum projeto corresponde");
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });
});

describe("Toast", () => {
  it("publica numa região polite e pode ser dispensado", async () => {
    const view = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "notificar" }));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Mensagens da aplicação" })).toHaveTextContent(
        "Preferências aplicadas neste navegador.",
      );
    });
    fireEvent.click(screen.getByRole("button", { name: /dispensar mensagem/i }));
    await waitFor(() => {
      expect(screen.queryByText("Preferências aplicadas neste navegador.")).toBeNull();
    });
  });

  it("não empilha mais de três mensagens", async () => {
    const view = render(
      <ToastProvider>
        <ToastSpam />
      </ToastProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "notificar" }));
    await waitFor(() => {
      expect(screen.getAllByRole("status").length).toBeLessThanOrEqual(3);
    });
    expect(screen.getByText("quatro")).toBeInTheDocument();
    expect(screen.queryByText("um")).toBeNull();
  });
});

function ToastTrigger(): ReactNode {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify(ui.feedback.preferencesSaved, "success")}>
      notificar
    </button>
  );
}

function ToastSpam(): ReactNode {
  const { notify } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        for (const message of ["um", "dois", "três", "quatro"]) {
          notify(message);
        }
      }}
    >
      notificar
    </button>
  );
}
