import { useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";
import HomeGallery from "@/components/HomeGallery";
import FloatingUploadButton from "@/components/FloatingUploadButton";

export default function VideoUpload() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col md:h-screen md:flex-row md:overflow-hidden">
      <div ref={heroRef} className="md:w-[380px] shrink-0 flex flex-col px-8 py-8 md:overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="no-underline">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 flex items-center">
          <UploadCard />
        </div>
      </div>
      <div className="flex-1 md:overflow-hidden">
        <HomeGallery />
      </div>
      <FloatingUploadButton heroRef={heroRef} />
    </div>
  );
}
