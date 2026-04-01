import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";
import HomeGallery from "@/components/HomeGallery";

export default function VideoUpload() {
  return (
    <div className="h-screen flex">
      <div className="w-[380px] shrink-0 bg-panel flex flex-col px-8 py-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="no-underline">
            <Logo />
          </Link>
          <Link to="/result/demo" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Preview result →
          </Link>
        </div>
        <UploadCard />
      </div>
      <div className="flex-1 bg-canvas">
        <HomeGallery />
      </div>
    </div>
  );
}
