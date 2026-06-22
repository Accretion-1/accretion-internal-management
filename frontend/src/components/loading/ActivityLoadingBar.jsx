import { useAppSelector } from "../../store/hooks/reduxHooks";
import { selectActivityLoading } from "../../store/selectors/loadingSelectors";

export const ActivityLoadingBar = () => {
  const isLoading = useAppSelector(selectActivityLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[110] h-1 overflow-hidden bg-blue-100">
      <div className="h-full w-1/3 animate-pulse bg-blue-600" />
    </div>
  );
};
