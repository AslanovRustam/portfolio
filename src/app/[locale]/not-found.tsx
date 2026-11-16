import { useTranslations } from 'next-intl';
import CriticalError from '@/ui/CriticalError';

/** The 404, in the visitor's language: a CRITICAL ERROR on a black screen, and the way back to the street. */
export default function NotFound() {
  const t = useTranslations('notFound');
  return <CriticalError line={t('line')} back={t('back')} />;
}
