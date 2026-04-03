import { useEffect, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Upload, X } from "lucide-react";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";

export default function FloatingUploadButton({
  heroRef,
}: {
  heroRef: RefObject<HTMLElement | null>;
}) {
  const [showFab, setShowFab] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [heroRef]);

  return (
    <div className="md:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 ${
            showFab
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
          aria-label="Upload video"
        >
          <Upload className="w-6 h-6" />
        </Dialog.Trigger>

        <Dialog.Portal keepMounted>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 data-[open]:opacity-100 data-[closed]:opacity-0" />
          <Dialog.Popup className="fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300 ease-out data-[open]:translate-y-0 data-[closed]:translate-y-full">
            <div className="px-8 pt-8 flex items-center justify-between">
              <Dialog.Title>
                <Logo />
              </Dialog.Title>
              <Dialog.Close className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <div className="px-8 pb-8 flex-1 flex items-center">
              <UploadCard />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
