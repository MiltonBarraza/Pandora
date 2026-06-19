import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './TruncatedText.css';

type TruncatedTextProps = {
  text: string;
  className?: string;
  tooltipThreshold?: number;
};

export function TruncatedText({ text, className = '', tooltipThreshold = 18 }: TruncatedTextProps) {
  const content = <span className={`truncatedText${className ? ` ${className}` : ''}`}>{text}</span>;

  if (text.trim().length <= tooltipThreshold) {
    return content;
  }

  return (
    <InfoTooltip content={text} className="truncatedTextTooltip">
      {content}
    </InfoTooltip>
  );
}
