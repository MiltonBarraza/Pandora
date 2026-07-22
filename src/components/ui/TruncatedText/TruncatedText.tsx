import { useEffect, useRef, useState } from 'react';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './TruncatedText.css';

type TruncatedTextProps = {
  text: string;
  className?: string;
  tooltipThreshold?: number;
  tooltipStrategy?: 'threshold' | 'overflow';
};

export function TruncatedText({
  text,
  className = '',
  tooltipThreshold = 18,
  tooltipStrategy = 'threshold',
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const content = <span ref={textRef} className={`truncatedText${className ? ` ${className}` : ''}`}>{text}</span>;

  useEffect(() => {
    if (tooltipStrategy !== 'overflow') {
      return;
    }

    const updateOverflow = () => {
      const element = textRef.current;
      setIsOverflowing(Boolean(element && element.scrollWidth > element.clientWidth));
    };

    updateOverflow();
    window.addEventListener('resize', updateOverflow);
    return () => {
      window.removeEventListener('resize', updateOverflow);
    };
  }, [text, tooltipStrategy]);

  const shouldShowTooltip = tooltipStrategy === 'overflow'
    ? isOverflowing
    : shouldShowTruncatedTextTooltip(text, tooltipThreshold);

  if (!shouldShowTooltip) {
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
