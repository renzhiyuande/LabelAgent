import { createPortal } from "react-dom";
import { Toaster as Sonner } from "sonner";
import { useThemeStore } from "../../stores/theme";

export function Toaster() {
  const mode = useThemeStore((state) => state.mode);

  return createPortal(
    <Sonner
      theme={mode}
      richColors
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:bg-card group-[.toaster]:text-foreground",
          title: "group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />,
    document.body,
  );
}
