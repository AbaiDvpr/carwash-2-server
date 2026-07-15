type ProfileVersionProps = {
  version: string;
};

export default function ProfileVersion({ version }: ProfileVersionProps) {
  return (
    <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
      CarWash v{version}
    </p>
  );
}
