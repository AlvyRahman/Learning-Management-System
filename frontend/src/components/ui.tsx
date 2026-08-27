import Link from 'next/link';
import { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}) {
  const base =
    'rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary: 'border border-zinc-700 text-zinc-200 hover:border-zinc-500',
    danger: 'bg-red-600/20 text-red-400 border border-red-800/50 hover:bg-red-600/30',
    ghost: 'text-zinc-400 hover:text-white',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-zinc-300">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 ${className}`}>{children}</div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-blue-600/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
      {children}
    </span>
  );
}

export function CourseCard({
  documentId,
  title,
  description,
  coverUrl,
  badge,
}: {
  documentId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  badge?: ReactNode;
}) {
  return (
    <Link href={`/courses/${documentId}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition group-hover:border-zinc-700">
        <div className="h-40 w-full bg-gradient-to-br from-blue-600/40 to-purple-600/40">
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl font-bold text-white/30">{title[0]?.toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="line-clamp-2 text-sm text-zinc-400">
              {description.replace(/<[^>]+>/g, '').slice(0, 120)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
      <p className="text-lg text-zinc-400">{message}</p>
    </div>
  );
}