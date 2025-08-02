import { ArrowLeft, Menu } from "lucide-react";
import { Outlet } from "react-router-dom";

export function Header() {
  return (
    <>
      <header className="relative bg-gradient-to-r from-accent-600 to-accent-800 text-white">
        <div className="absolute inset-0 bg-black/10"></div>

        <nav className="relative z-10 flex items-center justify-between p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <figure>
                <img src="/GoTrabahu.png" alt="GoTrabahu Logo" />
              </figure>
            </div>
          </div>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
