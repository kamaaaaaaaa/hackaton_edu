import { IconPhone } from '@/components/ui/icons'
import { promptInstall, useInstallMode } from '@/lib/install'
import { useI18n } from '@/i18n'

/** «Установить на телефон»: нативный промпт (Android/Chrome) или инструкция для iOS. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const mode = useInstallMode()

  if (mode === 'prompt') {
    return (
      <button type="button" onClick={() => promptInstall()} className={`btn btn-ink btn-sm ${className}`}>
        <IconPhone width={18} height={18} />
        {t('install.cta')}
      </button>
    )
  }
  if (mode === 'ios') {
    return (
      <p className={`cap inline-flex items-center gap-2 ${className}`}>
        <IconPhone width={16} height={16} />
        {t('install.ios')}
      </p>
    )
  }
  return null
}
