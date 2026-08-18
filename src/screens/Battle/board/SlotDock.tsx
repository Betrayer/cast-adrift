import { useTranslation } from 'react-i18next';
import { SlotGrid } from './SlotGrid';
import { onReserveTap, useDockAnchors, useDockModel } from './useDock';
import styles from './Board.module.css';

export interface ReserveButtonProps {
  legal: boolean;
  held: number;
  max: number;
  className?: string;
}

export const ReserveButton = ({
  legal,
  held,
  max,
  className,
}: ReserveButtonProps) => {
  const { t } = useTranslation(['battle']);
  return (
    <button
      type="button"
      data-reserve
      data-testid="slot-reserve"
      className={[
        className ?? styles.reserve ?? '',
        legal ? styles.cardLegal ?? '' : '',
        held > 0 ? styles.cardOccupied ?? '' : '',
      ]
        .filter((name) => name !== '')
        .join(' ')}
      onClick={onReserveTap}
    >
      <span className={styles.name}>{t('battle:reserve')}</span>
      <span className={styles.cap}>
        {t('battle:reserveCap', { n: held, max })}
      </span>
      <span className={styles.reserveWells}>
        {Array.from({ length: Math.max(1, max) }, (_, i) => (
          <span key={i} className={styles.wellSmall} data-well />
        ))}
      </span>
    </button>
  );
};

export const SlotDock = () => {
  const { board, ordered, legal, projections, reserved, reserveMax } =
    useDockModel();
  const { root } = useDockAnchors(ordered.length);

  return (
    <div className={styles.dock} ref={root} data-band="dock">
      <SlotGrid
        board={board}
        ordered={ordered}
        legal={legal.slots}
        projections={projections}
      />
      <ReserveButton
        legal={legal.reserve}
        held={reserved.length}
        max={reserveMax}
      />
    </div>
  );
};
