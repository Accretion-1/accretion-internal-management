import { useAppSelector } from "../../store/hooks/reduxHooks";
import { selectGlobalLoading } from "../../store/selectors/loadingSelectors";

export const GlobalLoadingOverlay = () => {
  const isLoading = useAppSelector(selectGlobalLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/20 backdrop-blur-[2px]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg" />
    </div>
  );
};
