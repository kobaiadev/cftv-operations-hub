import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const storageKey = "nagumo-appearance";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    try {
      setLight(localStorage.getItem(storageKey) === "light");
    } catch {
      // Keep the existing dark appearance when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
  }, [light]);

  function toggle() {
    const next = !light;
    setLight(next);
    try {
      localStorage.setItem(storageKey, next ? "light" : "dark");
    } catch {
      // Switching still works for this visit without persistent storage.
    }
  }

  const label = light ? "Usar aparência escura" : "Usar aparência clara";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="fixed right-[148px] top-3 z-50 size-11 rounded-full shadow-card lg:right-[220px]"
            aria-label={label}
            title={label}
            onClick={toggle}
          >
            {light ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}