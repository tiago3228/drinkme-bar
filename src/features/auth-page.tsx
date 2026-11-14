import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "./public-layout";
export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setMessage("Confira seu e-mail para redefinir a senha.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: String(f.get("name")) },
          },
        });
        if (error) throw error;
        setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await qc.invalidateQueries();
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("Não foi possível confirmar seu acesso.");
        const role = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
        await nav({ to: role.data ? "/admin" : "/aluno" });
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <Brand />
        <Link to="/">
          <ArrowLeft /> Voltar ao site
        </Link>
      </div>
      <div className="auth-form-wrap">
        <span className="eyebrow">BAR PROFISSIONAL • ÁREA DO ALUNO</span>
        <h1>
          {mode === "signup"
            ? "Seu próximo capítulo."
            : mode === "forgot"
              ? "Recupere seu acesso."
              : "Bom ter você de volta."}
        </h1>
        <p>
          {mode === "signup"
            ? "Crie sua conta e dê o próximo passo."
            : mode === "forgot"
              ? "Enviaremos um link para o seu e-mail."
              : "Entre para continuar sua formação."}
        </p>
        <form onSubmit={submit} className="stack-form">
          {mode === "signup" && (
            <label>
              Seu nome
              <Input name="name" required autoComplete="name" />
            </label>
          )}
          <label>
            E-mail
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
            />
          </label>
          {mode !== "forgot" && (
            <div className="password-field">
              <label htmlFor="auth-password">Senha</label>
              <div className="password-input-wrap">
                <Input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="Mínimo de 8 caracteres"
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
          <Button size="lg" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar minha conta"
                : mode === "forgot"
                  ? "Enviar link"
                  : "Entrar"}
            <ArrowRight />
          </Button>
        </form>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Button
                variant="link"
                onClick={() => {
                  setMode("forgot");
                  setShowPassword(false);
                  setMessage("");
                }}
              >
                Esqueci minha senha
              </Button>
              <span>
                Ainda não tem conta?{" "}
                <Button
                  variant="link"
                  onClick={() => {
                    setMode("signup");
                    setShowPassword(false);
                    setMessage("");
                  }}
                >
                  Cadastre-se
                </Button>
              </span>
            </>
          ) : (
            <Button
              variant="link"
              onClick={() => {
                setMode("login");
                setShowPassword(false);
                setMessage("");
              }}
            >
              Voltar para entrar
            </Button>
          )}
        </div>
        <div className="auth-security">
          <LockKeyhole /> Seu conteúdo. Seu ritmo. Sua evolução.
        </div>
      </div>
      <div className="auth-bottom">DO BALCÃO À GESTÃO.</div>
    </main>
  );
}
export function ResetPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) {
      setMessage("As senhas não conferem.");
      return;
    }
    setBusy(true);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setMessage("O link expirou ou é inválido. Solicite um novo link de recuperação.");
      setBusy(false);
      return;
    }
    if (hash.get("type") && hash.get("type") !== "recovery") {
      setMessage("Use o link de recuperação enviado por e-mail.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: String(f.get("password")) });
    setMessage(error ? error.message : "Senha atualizada com sucesso.");
    setDone(!error);
    setBusy(false);
  }
  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <Brand />
      </div>
      <div className="auth-form-wrap">
        <span className="eyebrow">SEU ACESSO</span>
        <h1>Uma nova senha.</h1>
        {done ? (
          <Button asChild>
            <Link to="/aluno">
              Ir para meus cursos <ArrowRight />
            </Link>
          </Button>
        ) : (
          <form className="stack-form" onSubmit={submit}>
            <div className="password-field">
              <label htmlFor="reset-password">Nova senha</label>
              <div className="password-input-wrap">
                <Input
                  id="reset-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div className="password-field">
              <label htmlFor="reset-confirm-password">Confirme a senha</label>
              <div className="password-input-wrap">
                <Input
                  id="reset-confirm-password"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm((visible) => !visible)}
                >
                  {showConfirm ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar nova senha"}</Button>
          </form>
        )}
        <p role="status">{message}</p>
      </div>
    </main>
  );
}
