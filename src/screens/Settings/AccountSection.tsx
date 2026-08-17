import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { continueWithGoogle, leaveAccount } from "@/services/account";
import { SUPPORT_EMAIL } from "@/services/support";
import { isGuestAccount, supportId, type AuthProviderId } from "@/services/uid";
import { useAppStore } from "@/stores/appStore";
import { EmailAuthModal, type EmailAuthMode } from "./EmailAuthModal";

const PROVIDER_ORDER: readonly AuthProviderId[] = [
  "telegram",
  "google",
  "password",
];

export const AccountSection = () => {
  const { t } = useTranslation(["settings", "common"]);
  const account = useAppStore((s) => s.account);
  const uid = useAppStore((s) => s.uid);
  const busy = useAppStore((s) => s.authBusy);
  const error = useAppStore((s) => s.authError);
  const isTelegram = useAppStore((s) => s.isTelegram);
  const [emailMode, setEmailMode] = useState<EmailAuthMode | null>(null);
  const [emailSession, setEmailSession] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const guest = isGuestAccount(account);
  const providers = account?.providers ?? [];
  const hasGoogle = providers.includes("google");
  const hasPassword = providers.includes("password");
  const telegramOnly = providers.length === 1 && providers[0] === "telegram";

  const heading = guest
    ? t("settings:account.guest")
    : account?.email !== null && account?.email !== undefined
      ? t("settings:account.signedInAs", { email: account.email })
      : t("settings:account.telegramProfile");

  return (
    <Stack gap="xs" data-testid="account-section">
      <Text size="sm" c={tokens.dim}>
        {guest ? t("settings:account.save") : t("settings:account.title")}
      </Text>

      <Paper p="sm" radius="md" withBorder bg={tokens.surface1}>
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Text size="sm" fw={600} c={tokens.text} data-testid="account-status">
              {heading}
            </Text>
            <Group gap={4} wrap="nowrap">
              {PROVIDER_ORDER.filter((id) => providers.includes(id)).map((id) => (
                <Badge
                  key={id}
                  size="xs"
                  variant="light"
                  color="accent"
                  data-testid={`account-provider-${id}`}
                >
                  {t(`settings:account.provider.${id}`)}
                </Badge>
              ))}
            </Group>
          </Group>

          {guest ? (
            <Text size="xs" c={tokens.faint}>
              {t("settings:account.guestBody")}
            </Text>
          ) : null}

          {telegramOnly ? (
            <Text size="xs" c={tokens.faint}>
              {t("settings:account.telegramHint")}
            </Text>
          ) : null}

          {isTelegram ? (
            <Text size="xs" c={tokens.faint}>
              {t("settings:account.telegramGoogleHint")}
            </Text>
          ) : null}

          {error === null ? null : (
            <Text size="xs" c={tokens.danger} data-testid="account-error">
              {t(`settings:account.error.${error}`, { email: SUPPORT_EMAIL })}
            </Text>
          )}

          <Divider color={tokens.line} />

          <Stack gap={6}>
            {hasGoogle ? null : (
              <Button
                variant={guest ? "filled" : "default"}
                loading={busy}
                data-testid="account-google"
                onClick={() => {
                  void continueWithGoogle();
                }}
              >
                {guest
                  ? t("settings:account.google")
                  : t("settings:account.googleLink")}
              </Button>
            )}
            {hasPassword ? null : (
              <Button
                variant="default"
                disabled={busy}
                data-testid="account-email"
                onClick={() => {
                  setEmailSession((value) => value + 1);
                  setEmailMode("register");
                }}
              >
                {guest
                  ? t("settings:account.email")
                  : t("settings:account.emailLink")}
              </Button>
            )}
            <Button
              variant="subtle"
              color="danger"
              disabled={busy || account === null}
              data-testid="account-signout"
              onClick={() => {
                setLeaving(true);
              }}
            >
              {t("settings:account.signOut")}
            </Button>
          </Stack>

          <Text size="10px" c={tokens.faint} data-testid="account-support-id">
            {t("settings:account.supportId", { id: supportId(uid) })}
          </Text>
        </Stack>
      </Paper>

      <EmailAuthModal
        key={emailSession}
        opened={emailMode !== null}
        mode={emailMode ?? "register"}
        onModeChange={setEmailMode}
        onClose={() => {
          setEmailMode(null);
        }}
      />

      <Modal
        opened={leaving}
        centered
        withCloseButton={false}
        title={t("settings:account.signOut")}
        onClose={() => {
          setLeaving(false);
        }}
      >
        <Stack gap="sm" data-testid="account-signout-modal">
          <Text size="sm" c={guest ? tokens.danger : tokens.dim}>
            {guest
              ? t("settings:account.signOutGuestWarning")
              : t("settings:account.signOutBody")}
          </Text>
          <Group grow>
            <Button
              variant="default"
              onClick={() => {
                setLeaving(false);
              }}
            >
              {t("common:cancel")}
            </Button>
            <Button
              color="danger"
              loading={busy}
              data-testid="account-signout-confirm"
              onClick={() => {
                void leaveAccount().then(() => {
                  setLeaving(false);
                });
              }}
            >
              {t("settings:account.signOutConfirm")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
