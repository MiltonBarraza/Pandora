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
        <AppIcon name="warning" className="warningTooltipIcon" aria-hidden="true" focusable="false" />
      </button>
    </InfoTooltip>
  );
}
