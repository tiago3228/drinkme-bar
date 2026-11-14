import { useEffect, useState } from "react";
import { Download, ExternalLink, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type DeviceHint = "native" | "ios" | "desktop";

const DISMISS_KEY = "drinkme-pwa-install-dismissed";
const DISMISS_FOR_MS = 1000 * 60 * 60 * 24 * 30;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean(window.navigator.standalone))
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}

function hasRecentDismissal() {
  const value = window.localStorage.getItem(DISMISS_KEY);
  return value ? Date.now() - Number(value) < DISMISS_FOR_MS : false;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState<DeviceHint>("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone() || hasRecentDismissal()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setHint("native");
      setVisible(true);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const timer = window.setTimeout(() => {
      if (isIos()) setHint("ios");
      else if (!isMobile()) setHint("desktop");
      setVisible(true);
    }, 1400);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || !visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (hint === "native" && installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") setVisible(false);
      return;
    }
    setHint(isIos() ? "ios" : "desktop");
  }

  return (
    <aside className="pwa-install-card" aria-label="Instalar DrinkMe Bar">
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Agora não">
        <X />
      </button>
      <div className="pwa-install-mark" aria-hidden="true">
        <img src="/icons/drinkme-192.png" alt="" />
      </div>
      <div className="pwa-install-content">
        <span className="eyebrow">DRINKME BAR</span>
        <h2>Tenha o DrinkMe sempre com você!</h2>
        <p>
          Adicione nosso aplicativo à tela inicial e acesse seus cursos, aulas e conteúdos com mais
          facilidade.
        </p>
        {hint === "ios" ? (
          <ol className="pwa-install-steps">
            <li>
              <Share2 aria-hidden="true" /> Abra o menu Compartilhar do Safari.
            </li>
            <li>
              <Download aria-hidden="true" /> Selecione “Adicionar à Tela de Início”.
            </li>
            <li>
              <span aria-hidden="true">3</span> Confirme em “Adicionar”.
            </li>
          </ol>
        ) : hint === "desktop" ? (
          <p className="pwa-install-help">
            No Chrome ou Edge, use o ícone de instalação na barra de endereço. Em outros
            navegadores, você pode criar um atalho manualmente pelo menu do navegador.
          </p>
        ) : null}
        <div className="pwa-install-actions">
          <Button onClick={() => void install()}>
            {hint === "native" ? "Adicionar à tela inicial" : "Como instalar"}
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Agora não
          </Button>
        </div>
        {hint === "desktop" && <ExternalLink className="pwa-install-external" aria-hidden="true" />}
      </div>
    </aside>
  );
}
