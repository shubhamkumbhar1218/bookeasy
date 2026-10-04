import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookingPages from "./pages/BookingPages.jsx";

function App() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("bookeasy_user") || "null")
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Dashboard
                user={user}
                logout={() => {
                  localStorage.clear();
                  setUser(null);
                }}
              />
            ) : (
              <Auth onLogin={setUser} />
            )
          }
        />

        <Route
          path="/book/:businessSlug"
          element={<BookingPages />}
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<App />);

