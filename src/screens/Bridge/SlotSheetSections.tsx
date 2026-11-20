import { Badge, Text, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "@/app/cx";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { isMasteryPerk } from "@/data/perks/ship";
import type { SlotSource } from "@/game/battle/slotRelevance";
import { projectionTone } from "@/screens/Battle/board/slotText";
import type { BridgeFocus, BridgeFocusKind } from "./bridgeFocus";
import { RowChevron } from "./RowChevron";
import type {
  SlotSheetFact,
  SlotSheetMode,
  SlotSheetModel,
  SlotSheetNextMk,
} from "./slotSheet";
import {
  affinityText,
  cellText,
  columnText,
  factText,
  fitRouteText,
  grantText,
  modeSourceText,
  reasonsLine,
  sourceName,
  type SheetT,
} from "./slotSheetText";
import styles from "./SlotInfoSheet.module.css";

type SheetSectionId =
  | "header"
  | "what"
  | "how"
  | "table"
  | "dice"
  | "modes"
  | "sources"
  | "improve";

const CHART_ADVICE_SHOWN = 3;

const TONE_CLASS = {
  danger: styles.toneDanger,
  bonus: styles.toneBonus,
  plain: styles.tonePlain,
} as const;

const focusKind = (source: SlotSource): BridgeFocusKind | null => {
  if (source.kind === "perk" && isMasteryPerk(source.id)) return null;
  return source.kind === "module" || source.kind === "perk" ? source.kind : null;
};

export const SheetSection = ({
  id,
  order,
  title,
  children,
}: {
  id: SheetSectionId;
  order: number;
  title: string | null;
  children: ReactNode;
}) => (
  <section
    className={styles.section}
    data-sheet-section={id}
    data-rise
    style={riseStyle(order)}
  >
    {title === null ? null : (
      <Text size="xs" c={tokens.faint} className={styles.sectionTitle}>
        {title}
      </Text>
    )}
    {children}
  </section>
);

const SubTitle = ({ children }: { children: ReactNode }) => (
  <Text size="xs" fw={600} c={tokens.dim} className={styles.subTitle}>
    {children}
  </Text>
);

const OfflineLine = ({ t }: { t: SheetT }) => (
  <Text size="xs" c={tokens.faint}>
    {t("run:bridge.sheet.disabled")}
  </Text>
);

export const FactLines = ({
  facts,
  t,
}: {
  facts: readonly SlotSheetFact[];
  t: SheetT;
}) =>
  facts.map((fact) => (
    <Text key={fact.id} size="sm" c={tokens.dim} data-sheet-fact={fact.id}>
      {factText(t, fact)}
    </Text>
  ));

export const HeaderSection = ({ model, t }: { model: SlotSheetModel; t: SheetT }) => (
  <SheetSection id="header" order={0} title={null}>
    <div className={styles.badges}>
      <Badge variant="light" color="accent" data-sheet-mk={model.mk}>
        {t("run:bridge.sheet.mk", { mk: model.mk })}
      </Badge>
      {model.disabled ? (
        <Badge variant="light" color="danger" data-sheet-disabled>
          {t("run:bridge.sheet.disabled")}
        </Badge>
      ) : (
        <Badge
          variant="light"
          color={model.shrunk ? "amber" : "gray"}
          data-sheet-cap={model.cap}
          data-sheet-shrunk={model.shrunk ? "1" : "0"}
        >
          {model.shrunk
            ? t("run:bridge.sheet.capShrunk", { cap: model.cap, base: model.baseCap })
            : t("run:bridge.sheet.cap", { cap: model.cap })}
        </Badge>
      )}
    </div>
    <Text size="sm" c={tokens.dim} data-sheet-affinity>
      {affinityText(t, model.affinity)}
    </Text>
    {model.passiveNote === null ? null : (
      <div className={styles.note} data-sheet-passive={model.passiveNote.passive}>
        <Text size="xs" fw={600} c={tokens.text}>
          {t("run:bridge.sheet.passive", { name: t(model.passiveNote.name) })}
        </Text>
        <Text size="xs" c={tokens.dim}>
          {t(model.passiveNote.desc)}
        </Text>
      </div>
    )}
  </SheetSection>
);

export const ValueTable = ({ model, t }: { model: SlotSheetModel; t: SheetT }) => (
  <SheetSection id="table" order={3} title={t("run:bridge.sheet.table")}>
    {model.disabled ? (
      <OfflineLine t={t} />
    ) : (
      <>
        <Text size="xs" c={tokens.faint} data-sheet-pinned>
          {t("run:bridge.sheet.pinned", { ...model.conditions })}
        </Text>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t("run:bridge.sheet.colFace")}</th>
                {model.columns.map((column) => (
                  <th
                    key={column.probe}
                    scope="col"
                    data-sheet-col-schools={
                      column.kind === "school" ? column.schools.join(" ") : undefined
                    }
                  >
                    {columnText(t, column, model.columns.length)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.table.map((row, index) => (
                <tr
                  key={row.face}
                  data-sheet-row={row.face}
                  data-rise
                  style={riseStyle(index)}
                >
                  <th scope="row" className={styles.face}>
                    {String(row.face)}
                  </th>
                  {model.columns.map((column, at) => {
                    const cell = row.cells[at] ?? null;
                    return (
                      <td
                        key={column.probe}
                        className={
                          cell === null ? undefined : TONE_CLASS[projectionTone(cell)]
                        }
                      >
                        {cell === null
                          ? t("battle:proj.none")
                          : cellText(t, model.slotId, cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </SheetSection>
);

export const DiceSection = ({ model, t }: { model: SlotSheetModel; t: SheetT }) => {
  const overCapHull = model.fit.overCap?.hullCost ?? 0;
  return (
    <SheetSection id="dice" order={4} title={t("run:bridge.sheet.dice")}>
      <FactLines facts={model.facts.filter((fact) => fact.section === "dice")} t={t} />
      {model.disabled ? (
        <OfflineLine t={t} />
      ) : (
        <>
          <SubTitle>{t("run:bridge.sheet.fitTitle")}</SubTitle>
          {model.fit.rows.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:bridge.sheet.fitEmpty")}
            </Text>
          ) : (
            <div className={styles.chips}>
              {model.fit.rows.map((row, index) => (
                <span
                  key={`${String(row.tier)}:${row.route}`}
                  className={cx(styles.chip, row.route === "none" && styles.chipOff)}
                  data-sheet-fit={`${String(row.tier)}:${row.route}`}
                  data-rise
                  style={riseStyle(index)}
                >
                  <b>{t("run:bridge.sheet.fitRow", { tier: row.tier, n: row.count })}</b>
                  {` · ${fitRouteText(t, row.route, overCapHull)}`}
                </span>
              ))}
            </div>
          )}
          {model.fit.overCap === null ? null : (
            <Text size="xs" c={tokens.dim} data-sheet-overcap>
              {`${t("run:bridge.sheet.reason.exceedCap")} · ${t("run:bridge.sheet.fitOverCap", { n: model.fit.overCap.hullCost })}`}
            </Text>
          )}
          {model.fit.grants.map((grant) => (
            <Text
              key={`${grant.sourceKind}:${grant.sourceId}:${grant.school ?? ""}`}
              size="xs"
              c={tokens.dim}
              data-sheet-grant={grant.sourceId}
            >
              {grantText(t, grant, model.sources)}
            </Text>
          ))}
          <SubTitle>{t("run:bridge.sheet.placement")}</SubTitle>
          {model.placement.map((rule) => (
            <Text key={rule.block} size="xs" c={tokens.dim} data-sheet-rule={rule.block}>
              {t(rule.key)}
            </Text>
          ))}
        </>
      )}
    </SheetSection>
  );
};

export const ModesSection = ({ model, t }: { model: SlotSheetModel; t: SheetT }) => {
  if (model.modes.length === 0) return null;
  return (
    <SheetSection id="modes" order={5} title={t("run:bridge.sheet.modes")}>
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.sheet.modesNote")}
      </Text>
      {model.modes.map((mode, index) => (
        <div
          key={mode.id}
          className={cx(styles.row, !mode.available && styles.rowLocked)}
          data-sheet-mode={mode.id}
          data-mode-available={mode.available ? "1" : "0"}
          data-rise
          style={riseStyle(index)}
        >
          <div className={styles.rowHead}>
            <Text size="sm" fw={600} c={tokens.text}>
              {t(mode.name)}
            </Text>
            <span className={cx(styles.tag, mode.available && styles.tagOn)}>
              {mode.available
                ? t("run:bridge.sheet.modeAvailable")
                : t("run:bridge.sheet.modeLocked")}
            </span>
          </div>
          <Text size="xs" c={tokens.faint}>
            {modeSourceText(t, mode)}
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t(mode.desc, mode.vars)}
          </Text>
        </div>
      ))}
    </SheetSection>
  );
};

const SourceRow = ({
  source,
  riseIndex,
  t,
  onOpen,
}: {
  source: SlotSource;
  riseIndex: number;
  t: SheetT;
  onOpen: (focus: BridgeFocus) => void;
}) => {
  const kind = focusKind(source);
  const body = (
    <>
      <div className={styles.rowHead}>
        <Text size="sm" fw={600} c={tokens.text}>
          {sourceName(t, source)}
        </Text>
        <span className={styles.tag}>{t(`run:bridge.sheet.kind.${source.kind}`)}</span>
      </div>
      <Text size="xs" c={tokens.dim}>
        {reasonsLine(t, source.reasons)}
      </Text>
      {source.active ? null : (
        <Text size="xs" c={tokens.faint} data-sheet-source-inactive>
          {t("run:bridge.sheet.sourceInactive")}
        </Text>
      )}
    </>
  );
  const anchor = `${source.kind}:${source.id}`;
  if (kind === null) {
    return (
      <div
        className={cx(styles.row, !source.active && styles.rowLocked)}
        data-sheet-source={anchor}
        data-rise
        style={riseStyle(riseIndex)}
      >
        {body}
      </div>
    );
  }
  return (
    <UnstyledButton
      className={cx(styles.row, styles.rowButton)}
      data-sheet-source={anchor}
      data-testid={`bridge-sheet-source-${source.kind}-${source.id}`}
      data-rise
      style={riseStyle(riseIndex)}
      onClick={() => {
        onOpen({ kind, id: source.id });
      }}
    >
      {body}
      <RowChevron className={styles.chevron} />
    </UnstyledButton>
  );
};

export const SourcesSection = ({
  model,
  t,
  onSource,
}: {
  model: SlotSheetModel;
  t: SheetT;
  onSource: (focus: BridgeFocus) => void;
}) => (
  <SheetSection id="sources" order={6} title={t("run:bridge.sheet.sources")}>
    {model.sources.length === 0 ? (
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.sheet.sourcesEmpty")}
      </Text>
    ) : (
      model.sources.map((source, index) => (
        <SourceRow
          key={`${source.kind}:${source.id}`}
          source={source}
          riseIndex={index}
          t={t}
          onOpen={onSource}
        />
      ))
    )}
  </SheetSection>
);

const NextMk = ({
  next,
  modes,
  t,
}: {
  next: SlotSheetNextMk;
  modes: readonly SlotSheetMode[];
  t: SheetT;
}) => {
  const extras = [
    ...next.modes.flatMap((id) => {
      const mode = modes.find((entry) => entry.id === id);
      return mode === undefined ? [] : [t(mode.name)];
    }),
    ...next.unlocks.map((source) => sourceName(t, source)),
  ];
  return (
    <div className={styles.row} data-sheet-next-mk={next.mk}>
      <div className={styles.rowHead}>
        <Text size="sm" fw={600} c={tokens.text}>
          {t("run:bridge.sheet.nextMk", { mk: next.mk })}
        </Text>
        <span className={styles.tag} data-sheet-next-cost={next.cost}>
          {t("run:bridge.sheet.nextMkCost", { n: next.cost })}
        </span>
      </div>
      <Text size="xs" c={tokens.dim} data-sheet-next-cap={next.cap}>
        {t("run:bridge.sheet.nextMkCap", { cap: next.cap })}
      </Text>
      <Text size="xs" c={tokens.dim}>
        {affinityText(t, next.affinity)}
      </Text>
      {extras.length === 0 ? null : (
        <Text size="xs" c={tokens.dim}>
          {`${t("run:bridge.sheet.nextMkUnlocks")} ${extras.join(", ")}`}
        </Text>
      )}
    </div>
  );
};

export const ImproveSection = ({ model, t }: { model: SlotSheetModel; t: SheetT }) => {
  const shown = model.chartAdvice.slice(0, CHART_ADVICE_SHOWN);
  const more = model.chartAdvice.length - shown.length;
  return (
    <SheetSection id="improve" order={7} title={t("run:bridge.sheet.improve")}>
      <FactLines
        facts={model.facts.filter((fact) => fact.section === "improve")}
        t={t}
      />
      {model.disabled ? (
        <OfflineLine t={t} />
      ) : (
        <>
          {model.nextMk === null ? (
            <Text size="xs" c={tokens.faint} data-sheet-max-mk>
              {t("run:bridge.sheet.maxMk")}
            </Text>
          ) : (
            <NextMk next={model.nextMk} modes={model.modes} t={t} />
          )}
          <SubTitle>{t("run:bridge.sheet.chartAdvice")}</SubTitle>
          {shown.length === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t("run:bridge.sheet.chartAdviceEmpty")}
            </Text>
          ) : (
            shown.map((advice, index) => (
              <div
                key={advice.id}
                className={styles.row}
                data-sheet-chart={advice.id}
                data-rise
                style={riseStyle(index)}
              >
                <div className={styles.rowHead}>
                  <Text size="sm" fw={600} c={tokens.text}>
                    {advice.name === null ? advice.id : t(advice.name)}
                  </Text>
                  {advice.allocatable ? (
                    <span className={cx(styles.tag, styles.tagOn)}>
                      {t("run:bridge.sheet.chartReachable")}
                    </span>
                  ) : null}
                </div>
                <Text size="xs" c={tokens.dim}>
                  {reasonsLine(t, advice.reasons)}
                </Text>
              </div>
            ))
          )}
          {more > 0 ? (
            <Text size="xs" c={tokens.faint} data-sheet-chart-more={more}>
              {t("run:bridge.sheet.chartMore", { n: more })}
            </Text>
          ) : null}
        </>
      )}
    </SheetSection>
  );
};
