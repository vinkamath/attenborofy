import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import VideoUpload from "@/components/VideoUpload";
import Processing from "@/components/Processing";
import Result from "@/components/Result";
import Gallery from "@/components/Gallery";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<VideoUpload />} />
          <Route path="/processing/:jobId" element={<Processing />} />
          <Route path="/result/:jobId" element={<Result />} />
          <Route path="/gallery" element={<Gallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
