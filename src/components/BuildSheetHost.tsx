import { BuildSheet } from '@/screens/Build/BuildSheet';
import { useAppStore } from '@/stores/appStore';

export const BuildSheetHost = () => {
  const opened = useAppStore((s) => s.buildSheet);
  const setBuildSheet = useAppStore((s) => s.setBuildSheet);
  if (!opened) return null;
  return (
    <BuildSheet
      onClose={() => {
        setBuildSheet(false);
      }}
    />
  );
};
