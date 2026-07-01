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
        <span className="warningTooltipIcon" aria-hidden="true">¡</span>
      </button>
    </InfoTooltip>
  );
}
