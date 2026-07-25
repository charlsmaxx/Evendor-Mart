export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-2 flex h-[calc(100dvh-5.5rem)] flex-col sm:-mx-6 lg:-mx-8">
      {children}
    </div>
  );
}
