import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './TruncatedText.css';

type TruncatedTextProps = {
  text: string;
  className?: string;
  tooltipThreshold?: number;
};

export function TruncatedText({ text, className = '', tooltipThreshold = 18 }: TruncatedTextProps) {
  const content = <span className={`truncatedText${className ? ` ${className}` : ''}`}>{text}</span>;

  if (!shouldShowTruncatedTextTooltip(text, tooltipThreshold)) {
    return content;
  }

  return (
    <InfoTooltip content={text} className="truncatedTextTooltip">
      {content}
    </InfoTooltip>
  );
}

export function shouldShowTruncatedTextTooltip(text: string, tooltipThreshold = 18) {
  return text.trim().length > tooltipThreshold;
}
