interface SectionHeaderProps {
  label?: string;
  title: string;
}

export default function SectionHeader({ label, title }: SectionHeaderProps) {
  return (
    <div className="mb-5">
      {label && (
        <p className="text-primary mb-1 text-xs font-semibold tracking-widest uppercase">
          {label}
        </p>
      )}
      <h2 className="text-foreground text-2xl font-extrabold">{title}</h2>
    </div>
  );
}
