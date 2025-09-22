import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Ads from "./pages/Ads";
import CreateAd from "./pages/CreateAd";
import AdDetail from "./pages/AdDetail";
import EditAd from "./pages/EditAd";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import PublishChooseCategory from "./pages/PublishChooseCategory";
import PublishAutos from "./pages/PublishAutos";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/ads/:id" element={<AdDetail />} />

        {/* 🔐 Rutas protegidas */}
        <Route
          path="/ads/new"
          element={
            <ProtectedRoute>
              <CreateAd />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ads/:id/edit"
          element={
            <ProtectedRoute>
              <EditAd />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/publish" element={<PublishChooseCategory />} />
        <Route path="/publish/autos" element={<PublishAutos />} />
      </Routes>
    </>
  );
}

export default App;
