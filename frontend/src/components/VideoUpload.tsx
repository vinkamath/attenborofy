import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";
import HomeGallery from "@/components/HomeGallery";

export default function VideoUpload() {
  return (
    <div className="flex flex-col md:h-screen md:flex-row md:overflow-hidden">
      <div className="w-[380px] shrink-0 bg-canvas flex flex-col px-8 py-8 md:overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="no-underline">
            <Logo />
          </Link>
        </div>
        <UploadCard />
      </div>
      <div className="flex-1 bg-canvas md:overflow-hidden">
        <HomeGallery />
      </div>
    </div>
  );
}
