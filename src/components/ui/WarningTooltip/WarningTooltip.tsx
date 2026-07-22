import { AppIcon } from '../AppIcon/AppIcon';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './WarningTooltip.css';

type WarningTooltipProps = {
  content: string;
  ariaLabel?: string;
};

export function WarningTooltip({ content, ariaLabel }: WarningTooltipProps) {
  return (
    <InfoTooltip content={content} className="warningTooltipBubble">
      <button type="button" className="warningTooltipTrigger" aria-label={ariaLabel ?? content}>
        <AppIcon
          name="warningCircle"
          aria-hidden="true"
          className="warningTooltipIcon"
          focusable="false"
          size={15}
          strokeWidth={2.2}
        />
      </button>
    </InfoTooltip>
  );
}
