import {
  Anchor,
  Button,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import {
  registerWithEmail,
  sendResetEmail,
  signInWithEmailAccount,
} from "@/services/account";
import { SUPPORT_EMAIL } from "@/services/support";
import { useAppStore } from "@/stores/appStore";

export type EmailAuthMode = "register" | "signIn" | "reset";

interface EmailAuthModalProps {
  opened: boolean;
  mode: EmailAuthMode;
  onModeChange: (mode: EmailAuthMode) => void;
  onClose: () => void;
}

const TITLE: Record<EmailAuthMode, string> = {
  register: "settings:account.form.registerTitle",
  signIn: "settings:account.form.signInTitle",
  reset: "settings:account.form.resetTitle",
};

const SUBMIT: Record<EmailAuthMode, string> = {
  register: "settings:account.form.submitRegister",
  signIn: "settings:account.form.submitSignIn",
  reset: "settings:account.form.submitReset",
};

const MIN_PASSWORD = 6;

export const EmailAuthModal = ({
  opened,
  mode,
  onModeChange,
  onClose,
}: EmailAuthModalProps) => {
  const { t } = useTranslation(["settings", "common"]);
  const busy = useAppStore((s) => s.authBusy);
  const error = useAppStore((s) => s.authError);
  const account = useAppStore((s) => s.account);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const trimmed = email.trim();
  const ready =
    trimmed.includes("@") &&
    (mode === "reset" || password.length >= MIN_PASSWORD);

  const submit = (): void => {
    if (!ready || busy) return;
    if (mode === "reset") {
      void sendResetEmail(trimmed).then(() => {
        if (useAppStore.getState().authError === null) setSentTo(trimmed);
      });
      return;
    }
    const action =
      mode === "register" ? registerWithEmail : signInWithEmailAccount;
    void action(trimmed, password).then(() => {
      if (useAppStore.getState().authError === null) onClose();
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={t(TITLE[mode])}
    >
      <Stack gap="sm" data-testid="email-modal">
        <TextInput
          label={t("settings:account.form.email")}
          value={email}
          type="email"
          autoComplete="email"
          data-testid="email-input"
          onChange={(event) => {
            setEmail(event.currentTarget.value);
          }}
        />
        {mode === "reset" ? null : (
          <PasswordInput
            label={t("settings:account.form.password")}
            description={
              mode === "register"
                ? t("settings:account.form.passwordHint")
                : undefined
            }
            value={password}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            data-testid="password-input"
            onChange={(event) => {
              setPassword(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        )}
        {sentTo === null ? null : (
          <Text size="xs" c={tokens.accent} data-testid="email-reset-sent">
            {t("settings:account.form.resetSent", { email: sentTo })}
          </Text>
        )}
        {error === null ? null : (
          <Text size="xs" c={tokens.danger} data-testid="email-error">
            {t(`settings:account.error.${error}`, { email: SUPPORT_EMAIL })}
          </Text>
        )}
        <Button
          disabled={!ready}
          loading={busy}
          data-testid="email-submit"
          onClick={submit}
        >
          {t(SUBMIT[mode])}
        </Button>
        <Stack gap={2}>
          {mode === "signIn" ? null : (
            <Anchor
              size="xs"
              c={tokens.dim}
              data-testid="email-mode-signin"
              onClick={() => {
                onModeChange("signIn");
              }}
            >
              {t("settings:account.form.toSignIn")}
            </Anchor>
          )}
          {mode === "register" || account !== null ? null : (
            <Anchor
              size="xs"
              c={tokens.dim}
              data-testid="email-mode-register"
              onClick={() => {
                onModeChange("register");
              }}
            >
              {t("settings:account.form.toRegister")}
            </Anchor>
          )}
          {mode === "reset" ? null : (
            <Anchor
              size="xs"
              c={tokens.dim}
              data-testid="email-mode-reset"
              onClick={() => {
                onModeChange("reset");
              }}
            >
              {t("settings:account.form.toReset")}
            </Anchor>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
};
