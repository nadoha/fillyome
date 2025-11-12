import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

const langCodeMap: Record<string, string> = {
  'ko': 'ko-KR',
  'ja': 'ja-JP',
  'en': 'en-US',
  'zh': 'zh-CN',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'pt': 'pt-BR',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'th': 'th-TH',
  'vi': 'vi-VN',
  'id': 'id-ID',
  'hi': 'hi-IN',
  'tr': 'tr-TR',
};

interface UseSpeechRecognitionOptions {
  noiseCancellation?: boolean;
  onLanguageDetected?: (detectedLang: string) => void;
}

export const useSpeechRecognition = (
  language: string, 
  options: UseSpeechRecognitionOptions = {}
) => {
  const { noiseCancellation = true, onLanguageDetected } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<string | null>(null);
  const detectionCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langCodeMap[language] || 'ko-KR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcriptText = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcriptText + ' ';
            } else {
              interimTranscript += transcriptText;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          setTranscript(currentTranscript);
          
          // Language detection for multi-language support
          if (onLanguageDetected && currentTranscript.trim().length >= 5) {
            detectLanguage(currentTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onLanguageDetected]);

  // Language detection function using franc
  const detectLanguage = useCallback((text: string) => {
    if (!onLanguageDetected || text.length < 5) return;

    try {
      // Dynamic import of franc for language detection
      import('franc-min').then(({ franc }) => {
        const detected = franc(text, { minLength: 3 });
        
        // Map franc codes to our language codes
        const langMap: Record<string, string> = {
          'kor': 'ko',
          'jpn': 'ja',
          'eng': 'en',
          'cmn': 'zh',
          'spa': 'es',
          'fra': 'fr',
          'deu': 'de',
          'por': 'pt',
          'ita': 'it',
          'rus': 'ru',
          'arb': 'ar',
          'tha': 'th',
          'vie': 'vi',
          'ind': 'id',
          'hin': 'hi',
          'tur': 'tr',
        };

        const detectedLang = langMap[detected];
        
        if (detectedLang && detectedLang !== langCodeMap[language]?.split('-')[0]) {
          // Count consecutive detections to prevent false positives
          detectionCountRef.current[detectedLang] = (detectionCountRef.current[detectedLang] || 0) + 1;
          
          // Only trigger language change if detected consistently (3+ times)
          if (detectionCountRef.current[detectedLang] >= 3 && lastDetectionRef.current !== detectedLang) {
            lastDetectionRef.current = detectedLang;
            setDetectedLanguage(detectedLang);
            onLanguageDetected(detectedLang);
            
            // Reset detection counts
            detectionCountRef.current = {};
          }
        }
      }).catch(err => {
        console.error('Language detection error:', err);
      });
    } catch (error) {
      console.error('Language detection error:', error);
    }
  }, [language, onLanguageDetected]);

  // Update language when it changes and restart if listening
  useEffect(() => {
    if (recognitionRef.current) {
      const wasListening = isListening;
      
      // Stop if currently listening
      if (wasListening) {
        recognitionRef.current.stop();
      }
      
      // Update language
      recognitionRef.current.lang = langCodeMap[language] || 'ko-KR';
      
      // Restart if was listening
      if (wasListening) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsListening(true);
          }
        }, 100);
      }
    }
  }, [language]);

  const startListening = useCallback(async () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      
      // Request microphone access with enhanced noise cancellation settings
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: noiseCancellation,
            autoGainControl: true,
            // Advanced noise cancellation options
            ...(noiseCancellation && {
              // @ts-ignore - Advanced constraints may not be in types
              googEchoCancellation: true,
              googAutoGainControl: true,
              googNoiseSuppression: true,
              googHighpassFilter: true,
              googTypingNoiseDetection: true,
              googExperimentalNoiseSuppression: true,
            })
          }
        };

        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set up audio analysis for waveform visualization
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
        
        // Start audio level monitoring
        const monitorAudioLevel = () => {
          if (!analyserRef.current || !isListening) {
            setAudioLevel(0);
            return;
          }
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume level
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, (average / 255) * 100);
          
          setAudioLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
        };
        
        monitorAudioLevel();
        
        console.log('Microphone access granted with noise cancellation:', noiseCancellation);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }

      recognitionRef.current.lang = langCodeMap[language] || 'ko-KR';
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, language, noiseCancellation]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clean up analyser
    analyserRef.current = null;
    
    // Clean up media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setAudioLevel(0);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setDetectedLanguage(null);
    lastDetectionRef.current = null;
    detectionCountRef.current = {};
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    audioLevel,
    detectedLanguage,
  };
};
