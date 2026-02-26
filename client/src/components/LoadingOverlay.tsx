import { useState, useEffect } from 'react';

interface LoadingOverlayProps {
  text?: string;
  isVisible?: boolean;
}

let showLoadingFn: ((text?: string) => void) | null = null;
let hideLoadingFn: (() => void) | null = null;

export const registerLoadingFunctions = (
  showFn: (text?: string) => void,
  hideFn: () => void
) => {
  showLoadingFn = showFn;
  hideLoadingFn = hideFn;
};

export const showLoading = (text?: string) => {
  if (showLoadingFn) showLoadingFn(text);
};

export const hideLoading = () => {
  if (hideLoadingFn) hideLoadingFn();
};

export const LoadingOverlay = ({ text: propText = 'Procesando...', isVisible = false }: LoadingOverlayProps) => {
  const [globalVisible, setGlobalVisible] = useState(false);
  const [globalText, setGlobalText] = useState(propText);

  useEffect(() => {
    registerLoadingFunctions(
      (t?: string) => {
        setGlobalText(t || 'Procesando...');
        setGlobalVisible(true);
      },
      () => setGlobalVisible(false)
    );
    return () => {
      showLoadingFn = null;
      hideLoadingFn = null;
    };
  }, []);

  const visible = isVisible || globalVisible;
  const displayText = isVisible ? propText : globalText;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2 border-primary"></div>
        <p className="mt-4 text-primary font-medium">{displayText}</p>
      </div>
    </div>
  );
};
