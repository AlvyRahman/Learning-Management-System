export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function roleLabel(type: string): string {
  switch (type) {
    case 'admin':
      return 'Admin';
    case 'content_manager':
      return 'Content Manager';
    case 'instructor':
      return 'Instructor';
    case 'student':
      return 'Student';
    default:
      return capitalize(type);
  }
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}