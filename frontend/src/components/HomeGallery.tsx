export default function HomeGallery() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground/40">
          <p className="text-sm">Gallery videos will appear here</p>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 py-8 text-center text-muted-foreground/40">
        <p className="text-sm">Gallery videos will appear here</p>
      </div>
    </>
  );
}
