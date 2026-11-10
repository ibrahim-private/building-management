import { FileDown } from 'lucide-react';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { useAction } from '@/hooks/useAction';

/** Runs a PDF export with loading state and consistent success/error feedback. */
export function ExportPdfButton({
  label,
  onExport,
  variant = 'secondary',
  size = 'md',
  disabled,
  className,
}: {
  label: string;
  onExport: () => Promise<void>;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const { run, pending } = useAction();
  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      disabled={disabled}
      className={className}
      icon={<FileDown className="h-4 w-4" aria-hidden />}
      onClick={() => void run(onExport, 'تم تجهيز ملف PDF وبدأ تنزيله')}
    >
      {label}
    </Button>
  );
}
