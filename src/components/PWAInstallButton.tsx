import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] text-xs font-medium text-[#1C1917] hover:border-[#C2410C] transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#D6CBB5] text-sm font-medium text-[#1C1917] hover:border-[#C2410C] transition-colors whitespace-nowrap shrink-0'
        }
        aria-label="Install Mobile App"
      >
        <Download className="w-4 h-4 text-[#C2410C]" />
        <span>{isIOS ? 'Установить на iOS' : 'Установить приложение'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#FAF6F0] border border-[#E6DEC8] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#C2410C]" />
                <h3 id="pwa-guide-title" className="text-xl font-display font-semibold text-[#1C1917]">
                  Мобильное приложение UsmonovTeam
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close installation guide"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EDE2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#57534E]">
              <p>
                Добавьте <strong className="text-[#1C1917]">UsmonovTeam</strong> на главный экран телефона для быстрого доступа к расписанию тренировок и заказам через @UsmonovTeamBot:
              </p>
              <div className="rounded-xl bg-[#FFFFFF] border border-[#E6DEC8] p-4 space-y-2 text-xs">
                <p className="text-[#1C1917] font-semibold">На iPhone / iPad (Safari):</p>
                <p>1. Нажмите иконку <strong>Поделиться</strong> в нижней панели Safari.</p>
                <p>2. Выберите <strong>На экран «Домой»</strong>.</p>
                <p className="text-[#1C1917] font-semibold pt-2">На Android / ПК (Chrome / Edge):</p>
                <p>1. Нажмите меню браузера или значок <strong>Установить</strong> в адресной строке.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-sm font-semibold text-white transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-[#B45309] px-4 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4" />
      <span>Автономный режим — каталог UsmonovTeam доступен офлайн</span>
    </div>
  );
};
