// Real-time translation loading indicator with typing animation
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationLoadingIndicatorProps {
  isTranslating: boolean;
  streamingText?: string;
}

export const TranslationLoadingIndicator = ({ 
  isTranslating, 
  streamingText 
}: TranslationLoadingIndicatorProps) => {
  const { t } = useTranslation();
  const [dots, setDots] = useState('');
  
  // Animated dots effect
  useEffect(() => {
    if (!isTranslating) {
      setDots('');
      return;
    }
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, [isTranslating]);
  
  if (!isTranslating) return null;
  
  return (
    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
      {streamingText ? (
        <span className="typing-animation">
          {streamingText}
          <span className="animate-pulse">|</span>
        </span>
      ) : (
        <>
          <span className="inline-flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span>{t('translating') || '번역 중'}{dots}</span>
        </>
      )}
    </div>
  );
};
