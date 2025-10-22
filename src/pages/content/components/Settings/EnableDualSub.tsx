import { FC } from "react";
import { Toggle } from "../ui/Toggle";
import { useUnit } from "effector-react";
import { $dualSubEnabled, dualSubEnabledChanged } from "@src/models/settings";

export const EnableDualSub: FC = () => {
  const [dualSubEnabled, handleDualSubEnabledChanged] = useUnit([$dualSubEnabled, dualSubEnabledChanged]);

  return (
    <div className="es-settings-content__element">
      <div className="es-settings-content__element__left">Enable dual subtitles</div>
      <div className="es-settings-content__element__right">
        <Toggle isEnabled={dualSubEnabled} onChange={handleDualSubEnabledChanged} />
      </div>
    </div>
  );
};
